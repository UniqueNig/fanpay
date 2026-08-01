import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import {
  maskawasubBuyAirtime, maskawasubBuyData, maskawasubBuyElectricity, maskawasubBuyCable,
  maskawasubValidateMeter, maskawasubValidateIUC, resolveProviderId,
} from "../services/maskawasub.js";
import { debitWallet, creditWallet } from "../services/wallet.js";
import { verifyTransactionPin } from "../services/pin.js";
import { getSettings, assertNotMaintenance, assertServiceEnabled } from "../services/settings.js";
import { previewCoupon, recordRedemption } from "../services/coupons.js";
import { getAirtimeRate, resolveDataPlanPrice, resolveCablePlanPrice, listDataCatalog, listCableCatalog } from "../services/maskawasubPricing.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";

const router = Router();

const PIN_RULE = body("pin").isString().matches(/^\d{4}$/).withMessage("A valid 4-digit PIN is required.");
const COUPON_RULE = body("couponCode").optional().isString().trim();

// meterType comes from the frontend as "prepaid"/"postpaid" (unchanged UX);
// Maskawasub's API wants it as 1/2 — this is the only place that mapping happens.
const METER_TYPE = { prepaid: 1, postpaid: 2 };

// The balance check here is a fast-fail UX nicety only — it runs outside any
// transaction, so it can't be trusted against two concurrent requests. The
// real, atomic guard is debitWallet, which callers below now run BEFORE the
// Maskawasub purchase call (refunding if that call then fails) rather than
// after — see the comment at each call site for why that order matters.
// `chargeAmount` is the fee/markup-inclusive total actually charged, not the
// Maskawasub face value — callers compute that first from settings + coupon.
async function requireBalanceAndPin(uid, chargeAmount, pin) {
  const user = await User.findOne({ uid });
  if (!user) throw new ApiError(404, "User not found.");
  if (user.suspended) throw new ApiError(403, "This account has been suspended.");
  if (user.balance < chargeAmount) throw new ApiError(400, "Insufficient balance.");
  await verifyTransactionPin(uid, pin);
  return user;
}

// Debits atomically first (closing the double-spend race a post-purchase
// debit would leave open — see requireBalanceAndPin above), then attempts
// the Maskawasub purchase. On failure, refunds the debit and rethrows so the
// route's existing catch/next(err) handling is unchanged.
async function debitThenPurchase(uid, amount, ref, title, category, meta, purchase) {
  await debitWallet(uid, amount, ref, title, category, meta);
  try {
    return await purchase();
  } catch (err) {
    await creditWallet(uid, amount, ref + "_refund", `Refund: failed ${title}`, "↩️", {
      reason: "vtu_purchase_failed",
    });
    throw err;
  }
}

function checkValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array()[0].msg });
    return false;
  }
  return true;
}

// Real Maskawasub plan ids — the frontend must call this before letting a
// user pick a data bundle, rather than guessing an id. Response shape kept
// close to the old VTpass-backed version (variation_code/name/
// variation_amount) so the frontend needed minimal changes — variation_code
// is just the plan's Maskawasub id as a string here instead of a VTpass
// code — plus planType/validity/sizeLabel added on for the plan picker's
// type-filter tabs and per-plan validity display.
router.get("/data-plans/:network", requireAuth, async (req, res, next) => {
  try {
    const networkKey = req.params.network.toLowerCase();
    if (!(await resolveProviderId("network", networkKey))) throw new ApiError(400, `Unknown network: ${req.params.network}`);
    const rows = await listDataCatalog(networkKey);
    res.json({
      content: {
        varations: rows.filter((r) => r.active).map((r) => ({
          variation_code: r.variationCode, name: r.label, variation_amount: String(r.sellingPrice),
          plan_type: r.planType, validity: r.validity, size: r.sizeLabel,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/cable-plans/:provider", requireAuth, async (req, res, next) => {
  try {
    const cableKey = req.params.provider;
    if (!(await resolveProviderId("cable", cableKey))) throw new ApiError(400, `Unknown cable provider: ${req.params.provider}`);
    const rows = await listCableCatalog(cableKey);
    res.json({
      content: {
        varations: rows.filter((r) => r.active).map((r) => ({
          variation_code: r.variationCode, name: r.label, variation_amount: String(r.sellingPrice),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Confirms the smartcard belongs to a real active subscription and returns
// the customer's name, so the frontend can show "Paying for: X" before the
// user confirms.
router.get("/verify-cable/:provider/:smartCardNumber", requireAuth, async (req, res, next) => {
  try {
    const cableId = await resolveProviderId("cable", req.params.provider);
    if (!cableId) throw new ApiError(400, `Unknown cable provider: ${req.params.provider}`);
    const content = await maskawasubValidateIUC({ smart_card_number: req.params.smartCardNumber, cablename: cableId });
    // Confirmed live (2026-08-01) via the sibling validatemeter endpoint:
    // Maskawasub returns { invalid: true/false, name, address } — no
    // "customer_name"/"Customer_Name" field exists at all, and an invalid
    // number doesn't error, it comes back 200 with invalid:true and a
    // literal "INVALID METER NUMBER" string in `name` — must be checked
    // explicitly or that string would show as if it were a real name.
    // validateiuc itself wasn't confirmed (test smartcard triggered a
    // Maskawasub-side 500, not a usable response) — assumed to follow the
    // same shape as validatemeter since they're clearly the same underlying
    // pattern, but worth a real re-check against an actual smartcard.
    if (content?.invalid) return res.json({ customerName: null, status: null, dueDate: null });
    res.json({
      customerName: content?.name || content?.customer_name || content?.Customer_Name || null,
      status: content?.status || content?.Status || null,
      dueDate: content?.due_date || content?.Due_Date || null,
    });
  } catch (err) {
    next(err);
  }
});

// Same idea for electricity meters — needs an extra "type" param
// (prepaid/postpaid) that cable doesn't.
router.get("/verify-electricity/:provider/:meterNumber", requireAuth, async (req, res, next) => {
  try {
    const discoId = await resolveProviderId("electricity", req.params.provider);
    if (!discoId) throw new ApiError(400, `Unknown electricity provider: ${req.params.provider}`);
    const type = req.query.type === "postpaid" ? "postpaid" : "prepaid";
    const content = await maskawasubValidateMeter({
      meternumber: req.params.meterNumber, disconame: discoId, mtype: METER_TYPE[type],
    });
    // Confirmed live (2026-08-01, real request against Ibadan Electric):
    // { invalid: true, name: "INVALID METER NUMBER", address: "INVALID METER NUMBER" }
    // for a bad meter — 200 OK, not an error, so `invalid` must be checked
    // explicitly or that placeholder string renders as if it were real.
    if (content?.invalid) return res.json({ customerName: null, address: null });
    res.json({
      customerName: content?.name || content?.customer_name || content?.Customer_Name || null,
      address: content?.address || content?.Address || null,
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/airtime",
  requireAuth,
  [
    body("network").isString().trim().notEmpty(),
    body("phone").isString().trim().isLength({ min: 10, max: 11 }),
    body("amount").isFloat({ gt: 0 }),
    PIN_RULE,
  ],
  async (req, res, next) => {
    if (!checkValidation(req, res)) return;
    try {
      const { network, phone, amount, pin } = req.body;
      const networkKey = network.toLowerCase();
      const networkId = await resolveProviderId("network", networkKey);
      if (!networkId) throw new ApiError(400, `Unknown network: ${network}`);

      const settings = await getSettings();
      assertNotMaintenance(settings);
      assertServiceEnabled(settings, "airtime");

      // Maskawasub sells airtime below face value — that wholesale spread is
      // the actual source of profit. Rates are configured per network in the
      // admin Pricing Catalog (services/maskawasubPricing.js), as a percent
      // of face value, seeded from Maskawasub's own live topuppercentage
      // table; an unconfigured network defaults to 100/100 (sell at face
      // value, zero recorded margin). No coupon support — there's no safe
      // way to cap a further stacked discount without knowing Maskawasub's
      // real wholesale rate for this account.
      const rate = await getAirtimeRate(networkKey);
      const buyingPrice = amount * (rate.buyingPrice / 100);
      const chargeAmount = amount * (rate.sellingPrice / 100);

      await requireBalanceAndPin(req.uid, chargeAmount, pin);

      const requestId = Date.now().toString();
      const ref = "AIR-" + requestId;
      const title = `${network.toUpperCase()} Airtime – ${phone}`;

      const maskawasubRes = await debitThenPurchase(
        req.uid,
        chargeAmount,
        ref,
        title,
        "📱",
        { network, phone, amount, buyingPrice, sellingPrice: chargeAmount },
        () => maskawasubBuyAirtime({ network: networkId, mobile_number: phone, amount })
      );

      await Transaction.updateOne(
        { reference: ref },
        {
          $set: {
            "meta.maskawasubId": maskawasubRes?.id,
            "meta.deliveryStatus": maskawasubRes?.Status,
            "meta.apiResponse": maskawasubRes?.api_response,
          },
        }
      );

      res.json({ success: true, status: maskawasubRes?.Status, requestId, reference: ref, amountCharged: chargeAmount });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/data",
  requireAuth,
  [
    body("network").isString().trim().notEmpty(),
    body("phone").isString().trim().isLength({ min: 10, max: 11 }),
    body("variationCode").isString().trim().notEmpty(),
    PIN_RULE,
  ],
  async (req, res, next) => {
    if (!checkValidation(req, res)) return;
    try {
      const { network, phone, variationCode, pin } = req.body;
      const networkKey = network.toLowerCase();
      const networkId = await resolveProviderId("network", networkKey);
      if (!networkId) throw new ApiError(400, `Unknown network: ${network}`);

      const planId = Number(variationCode);
      if (!Number.isInteger(planId)) throw new ApiError(400, "Invalid plan selected.");

      const settings = await getSettings();
      assertNotMaintenance(settings);
      assertServiceEnabled(settings, "data");

      // Authoritative price resolved server-side — a client-supplied amount
      // is never trusted here, since data bundles have a real fixed
      // Maskawasub price per plan id (unlike airtime's free-typed amount).
      // Also confirms planId actually belongs to networkKey.
      const priced = await resolveDataPlanPrice(networkKey, planId);
      const chargeAmount = priced.sellingPrice;

      await requireBalanceAndPin(req.uid, chargeAmount, pin);

      const requestId = Date.now().toString();
      const ref = "DATA-" + requestId;
      const title = `${network.toUpperCase()} Data – ${phone}`;

      const maskawasubRes = await debitThenPurchase(
        req.uid,
        chargeAmount,
        ref,
        title,
        "📶",
        { network, phone, variationCode, buyingPrice: priced.buyingPrice, sellingPrice: priced.sellingPrice },
        () => maskawasubBuyData({ network: networkId, mobile_number: phone, plan: planId })
      );

      await Transaction.updateOne(
        { reference: ref },
        {
          $set: {
            "meta.maskawasubId": maskawasubRes?.id,
            "meta.deliveryStatus": maskawasubRes?.Status,
            "meta.apiResponse": maskawasubRes?.api_response,
          },
        }
      );

      res.json({ success: true, status: maskawasubRes?.Status, requestId, reference: ref, amountCharged: chargeAmount });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/bill",
  requireAuth,
  [
    body("billType").isIn(["electricity", "cable"]),
    body("provider").isString().trim().notEmpty(),
    // Required for electricity (customer types any amount); ignored for
    // cable, which resolves its authoritative price server-side below.
    body("amount").optional().isFloat({ gt: 0 }),
    // Maskawasub requires a phone number for bill payments — don't fall back
    // to the user's profile phone, which may be blank (e.g. Google sign-in
    // never collects one) and isn't necessarily tied to this meter/card.
    body("phone").isString().trim().isLength({ min: 10, max: 11 }).withMessage("A valid phone number is required."),
    body("meterNumber").optional().isString().trim(),
    body("smartCardNumber").optional().isString().trim(),
    body("meterType").optional().isString().trim(),
    body("variationCode").optional().isString().trim(),
    // Purely informational — whatever name was shown during the verify step,
    // carried through so it shows on the transaction receipt. Not used for
    // fund routing, so trusting the client here doesn't create a
    // money-movement risk.
    body("accountName").optional().isString().trim(),
    COUPON_RULE,
    PIN_RULE,
  ],
  async (req, res, next) => {
    if (!checkValidation(req, res)) return;
    try {
      const { billType, provider, meterNumber, smartCardNumber, amount, meterType, variationCode, phone, accountName, couponCode, pin } = req.body;

      const settings = await getSettings();
      assertNotMaintenance(settings);
      assertServiceEnabled(settings, "bills");

      let chargeAmount, faceValue, couponResult = null, discount = 0, fee = 0, buyingPrice = null, sellingPrice = null;
      let purchaseCall;

      if (billType === "electricity") {
        const discoId = await resolveProviderId("electricity", provider);
        if (!discoId) throw new ApiError(400, `Unknown electricity provider: ${provider}`);

        // Electricity keeps the flat additive fee — arbitrary user-typed
        // amount, no fixed Maskawasub "plan" to catalog-price like data/cable.
        if (!(amount > 0)) throw new ApiError(400, "A valid amount is required.");
        faceValue = amount;
        fee = settings.pricing.billFeeFlat;
        couponResult = await previewCoupon(couponCode, req.uid, fee);
        discount = couponResult?.discount || 0;
        chargeAmount = faceValue + fee - discount;

        const type = meterType === "postpaid" ? "postpaid" : "prepaid";
        purchaseCall = () =>
          maskawasubBuyElectricity({
            disco_name: discoId, amount: faceValue, meter_number: meterNumber, MeterType: METER_TYPE[type],
          });
      } else {
        const cableId = await resolveProviderId("cable", provider);
        if (!cableId) throw new ApiError(400, `Unknown cable provider: ${provider}`);
        if (!variationCode) throw new ApiError(400, "A bouquet must be selected.");
        const planId = Number(variationCode);
        if (!Number.isInteger(planId)) throw new ApiError(400, "Invalid bouquet selected.");

        // Same catalog-based, tamper-proof pricing as data purchases — never
        // trusts a client-supplied amount. No coupon support, same reasoning
        // as data: no safe cap without knowing Maskawasub's real rate.
        // Priced by the string provider key (matches how the catalog stores
        // it), not the numeric cableId — that numeric id is only what the
        // actual Maskawasub purchase call below needs.
        const priced = await resolveCablePlanPrice(provider, planId);
        faceValue = priced.buyingPrice;
        chargeAmount = priced.sellingPrice;
        buyingPrice = priced.buyingPrice;
        sellingPrice = priced.sellingPrice;

        purchaseCall = () =>
          maskawasubBuyCable({ cablename: cableId, cableplan: planId, smart_card_number: smartCardNumber || meterNumber });
      }

      await requireBalanceAndPin(req.uid, chargeAmount, pin);

      const requestId = Date.now().toString();
      const category = billType === "electricity" ? "⚡" : "📺";
      const ref = "BILL-" + requestId;

      const meta = billType === "electricity"
        ? {
            provider, billType, meterNumber, accountName: accountName || null,
            amount: faceValue, fee, couponCode: couponResult ? couponResult.coupon.code : null, couponDiscount: discount,
          }
        : { provider, billType, smartCardNumber, accountName: accountName || null, buyingPrice, sellingPrice };

      const maskawasubRes = await debitThenPurchase(
        req.uid, chargeAmount, ref, `${provider} ${billType}`, category, meta, purchaseCall
      );

      // Not confirmed which field (if any) carries the electricity token —
      // never live-tested against a real electricity purchase. Checked
      // across a few plausible names; if none match, meta.apiResponse (the
      // human-readable confirmation text) is stored regardless and is the
      // fallback place to actually find it, same as data's usage
      // instructions came through in api_response during the live data test.
      const electricityToken =
        maskawasubRes?.token || maskawasubRes?.Token || maskawasubRes?.electricity_token || null;

      await Transaction.updateOne(
        { reference: ref },
        {
          $set: {
            "meta.maskawasubId": maskawasubRes?.id,
            "meta.deliveryStatus": maskawasubRes?.Status,
            "meta.apiResponse": maskawasubRes?.api_response,
            "meta.electricityToken": electricityToken,
          },
        }
      );

      if (couponResult) await recordRedemption(couponResult.coupon._id, req.uid, ref);

      res.json({ success: true, status: maskawasubRes?.Status, requestId, reference: ref, electricityToken, amountCharged: chargeAmount });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
