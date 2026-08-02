import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import {
  maskawasubBuyAirtime, maskawasubBuyData, resolveProviderId,
} from "../services/maskawasub.js";
import { vtpassPay, vtpassMerchantVerify, resolveVtpassProviderId } from "../services/vtpass.js";
import { resolvePlanPrice, listCatalog } from "../services/productPricing.js";
import { debitWallet, creditWallet } from "../services/wallet.js";
import { verifyTransactionPin } from "../services/pin.js";
import { getSettings, assertNotMaintenance, assertServiceEnabled } from "../services/settings.js";
import { previewCoupon, recordRedemption } from "../services/coupons.js";
import { getAirtimeRate, resolveDataPlanPrice, listDataCatalog } from "../services/maskawasubPricing.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { KycSubmission } from "../models/KycSubmission.js";

const router = Router();

const PIN_RULE = body("pin").isString().matches(/^\d{4}$/).withMessage("A valid 4-digit PIN is required.");
const COUPON_RULE = body("couponCode").optional().isString().trim();

// Unverified accounts can hold and receive money freely — the fraud/AML
// risk is in moving it back out as something resellable (airtime especially),
// which is exactly what CBN's own tiered-KYC framework caps for bank
// accounts too. Verified accounts (an approved KycSubmission) are exempt
// entirely; admin-editable limits live in AppSettings.kyc.
async function assertWithinKycLimit(uid, userId, chargeAmount, settings) {
  const submission = await KycSubmission.findOne({ uid, status: "verified" }).select("_id").lean();
  if (submission) return;

  const { unverifiedPerTransactionLimit, unverifiedDailyLimit } = settings.kyc || {};
  if (chargeAmount > unverifiedPerTransactionLimit) {
    throw new ApiError(
      403,
      `Unverified accounts can spend up to ₦${unverifiedPerTransactionLimit.toLocaleString()} per transaction. Complete KYC verification to increase this.`
    );
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [{ total } = { total: 0 }] = await Transaction.aggregate([
    {
      $match: {
        userId,
        type: "debit",
        reference: { $regex: /^(AIR|DATA|BILL|EXAM)-/ },
        createdAt: { $gte: startOfToday },
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  if (total + chargeAmount > unverifiedDailyLimit) {
    throw new ApiError(
      403,
      `Unverified accounts can spend up to ₦${unverifiedDailyLimit.toLocaleString()} per day on airtime, data, bills, and result checker pins. Complete KYC verification to increase this, or try again tomorrow.`
    );
  }
}

// The balance check here is a fast-fail UX nicety only — it runs outside any
// transaction, so it can't be trusted against two concurrent requests. The
// real, atomic guard is debitWallet, which callers below now run BEFORE the
// Maskawasub purchase call (refunding if that call then fails) rather than
// after — see the comment at each call site for why that order matters.
// `chargeAmount` is the fee/markup-inclusive total actually charged, not the
// Maskawasub face value — callers compute that first from settings + coupon.
async function requireBalanceAndPin(uid, chargeAmount, pin, settings) {
  // Defense-in-depth, not the primary guarantee — every caller already
  // computes chargeAmount from a trusted server-side rate/catalog lookup,
  // never a raw client-supplied price. This exists purely as a floor so a
  // pricing misconfiguration (e.g. an admin fat-fingering sellingPrice to 0
  // or negative in the Pricing Catalog) can never slip through as a
  // zero-cost purchase or, worse, a negative chargeAmount that debitWallet
  // would interpret as a credit (it does `balance -= amount`).
  if (!(chargeAmount > 0)) throw new ApiError(400, "Invalid purchase amount.");
  const user = await User.findOne({ uid });
  if (!user) throw new ApiError(404, "User not found.");
  if (user.suspended) throw new ApiError(403, "This account has been suspended.");
  if (user.balance < chargeAmount) throw new ApiError(400, "Insufficient balance.");
  await assertWithinKycLimit(uid, user._id, chargeAmount, settings);
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
    const serviceID = await resolveVtpassProviderId("cable", req.params.provider);
    if (!serviceID) throw new ApiError(400, `Unknown cable provider: ${req.params.provider}`);
    const rows = await listCatalog("cable", serviceID);
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

// WAEC and JAMB, both via VTpass — NECO isn't offered at all (confirmed
// against GET /services?identifier=education, 2026-08-02: waec,
// waec-registration, jamb, no neco). Each row carries its own serviceID
// since the two need different purchase flows (JAMB needs a Profile ID +
// verify step first, see /verify-jamb and POST /exam below) — the frontend
// uses it to decide which flow to run.
router.get("/exam-plans", requireAuth, async (req, res, next) => {
  try {
    const [waecRows, jambRows] = await Promise.all([listCatalog("exam", "waec"), listCatalog("exam", "jamb")]);
    const rows = [...waecRows, ...jambRows];
    res.json({
      content: {
        varations: rows.filter((r) => r.active).map((r) => ({
          variation_code: r.variationCode, name: r.label, variation_amount: String(r.sellingPrice),
          serviceID: r.serviceID,
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
    const serviceID = await resolveVtpassProviderId("cable", req.params.provider);
    if (!serviceID) throw new ApiError(400, `Unknown cable provider: ${req.params.provider}`);
    const content = await vtpassMerchantVerify({ billersCode: req.params.smartCardNumber, serviceID });
    // Confirmed live (2026-08-02, real sandbox request): a bad smartcard
    // returns HTTP 200, code:"000" — the failure only shows up as
    // content.error ("The Smartcard/Decoder Number you entered may be
    // invalid..."), not a thrown exception or an `invalid` flag. Success
    // returns Customer_Name/Status/Due_Date/Customer_Number directly.
    if (content?.error) return res.json({ customerName: null, status: null, dueDate: null });
    res.json({
      customerName: content?.Customer_Name || null,
      status: content?.Status || null,
      dueDate: content?.Due_Date || null,
    });
  } catch (err) {
    next(err);
  }
});

// Same idea for electricity meters — needs an extra "type" param
// (prepaid/postpaid) that cable doesn't.
router.get("/verify-electricity/:provider/:meterNumber", requireAuth, async (req, res, next) => {
  try {
    const serviceID = await resolveVtpassProviderId("electricity", req.params.provider);
    if (!serviceID) throw new ApiError(400, `Unknown electricity provider: ${req.params.provider}`);
    const type = req.query.type === "postpaid" ? "postpaid" : "prepaid";
    const content = await vtpassMerchantVerify({
      billersCode: req.params.meterNumber, serviceID, extra: { type },
    });
    // Confirmed live (2026-08-02): a bad meter returns HTTP 200, code:"000",
    // with content.error set and WrongBillersCode:true — same "200 but
    // wrapped error" shape as cable, must check content.error explicitly.
    if (content?.error || content?.WrongBillersCode) return res.json({ customerName: null, address: null });
    res.json({
      customerName: content?.Customer_Name || null,
      address: content?.Address || null,
    });
  } catch (err) {
    next(err);
  }
});

// JAMB PIN vending needs the candidate's own JAMB Profile ID (their
// e-facility registration id, not a phone/meter/smartcard) confirmed before
// payment — same trust pattern as electricity/cable. `type` is the chosen
// variation_code (utme-mock/utme-no-mock); confirmed live (2026-08-02) that
// VTpass's response for this one includes Customer_Account_Type alongside
// the usual Customer_Name.
router.get("/verify-jamb/:profileId", requireAuth, async (req, res, next) => {
  try {
    const type = req.query.type === "utme-mock" ? "utme-mock" : "utme-no-mock";
    const content = await vtpassMerchantVerify({
      billersCode: req.params.profileId, serviceID: "jamb", extra: { type },
    });
    if (content?.error) return res.json({ customerName: null, accountType: null });
    res.json({
      customerName: content?.Customer_Name || null,
      accountType: content?.Customer_Account_Type || null,
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

      await requireBalanceAndPin(req.uid, chargeAmount, pin, settings);

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

      await requireBalanceAndPin(req.uid, chargeAmount, pin, settings);

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
    // VTpass requires a phone number for bill payments — don't fall back
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

      // Generated up front (not after pricing, like before) — VTpass's /pay
      // requires a unique request_id in the payload itself, unlike
      // Maskawasub which never needed one. Reused as-is for the internal
      // transaction reference so there's one id to look up on both sides.
      const requestId = Date.now().toString();
      const ref = "BILL-" + requestId;

      if (billType === "electricity") {
        const serviceID = await resolveVtpassProviderId("electricity", provider);
        if (!serviceID) throw new ApiError(400, `Unknown electricity provider: ${provider}`);

        // Electricity keeps the flat additive fee — arbitrary user-typed
        // amount, no fixed VTpass "plan" to catalog-price like data/cable.
        if (!(amount > 0)) throw new ApiError(400, "A valid amount is required.");
        faceValue = amount;
        fee = settings.pricing.billFeeFlat;
        couponResult = await previewCoupon(couponCode, req.uid, fee);
        discount = couponResult?.discount || 0;
        chargeAmount = faceValue + fee - discount;

        // VTpass's variation_code for electricity is just "prepaid"/
        // "postpaid" directly — no MeterType-style value-mapping needed
        // like Maskawasub required.
        const type = meterType === "postpaid" ? "postpaid" : "prepaid";
        purchaseCall = () =>
          vtpassPay({
            request_id: ref, serviceID, billersCode: meterNumber, variation_code: type,
            amount: faceValue, phone,
          });
      } else {
        const serviceID = await resolveVtpassProviderId("cable", provider);
        if (!serviceID) throw new ApiError(400, `Unknown cable provider: ${provider}`);
        if (!variationCode) throw new ApiError(400, "A bouquet must be selected.");

        // Same catalog-based, tamper-proof pricing as data purchases — never
        // trusts a client-supplied amount. No coupon support, same reasoning
        // as data: no safe cap without knowing VTpass's real rate.
        // variationCode is a VTpass slug ("dstv-padi"), not a numeric plan
        // id like Maskawasub used — no Number()/isInteger check needed.
        const priced = await resolvePlanPrice("cable", serviceID, variationCode);
        faceValue = priced.buyingPrice;
        chargeAmount = priced.sellingPrice;
        buyingPrice = priced.buyingPrice;
        sellingPrice = priced.sellingPrice;

        purchaseCall = () =>
          vtpassPay({
            request_id: ref, serviceID, billersCode: smartCardNumber || meterNumber,
            variation_code: variationCode, amount: faceValue, phone, subscription_type: "change",
          });
      }

      await requireBalanceAndPin(req.uid, chargeAmount, pin, settings);

      const category = billType === "electricity" ? "⚡" : "📺";

      const meta = billType === "electricity"
        ? {
            provider, billType, meterNumber, accountName: accountName || null,
            amount: faceValue, fee, couponCode: couponResult ? couponResult.coupon.code : null, couponDiscount: discount,
          }
        : { provider, billType, smartCardNumber, accountName: accountName || null, buyingPrice, sellingPrice };

      const purchaseRes = await debitThenPurchase(
        req.uid, chargeAmount, ref, `${provider} ${billType}`, category, meta, purchaseCall
      );

      const transactionDetails = purchaseRes?.content?.transactions;
      // Confirmed live (2026-08-02, real sandbox purchase): the electricity
      // token comes back as top-level `Token`, not nested under content.
      const electricityToken = purchaseRes?.Token || null;

      // Unlike Maskawasub, VTpass's own verify step is reliable (see
      // /verify-cable and /verify-electricity above), so `accountName` here
      // is a name the customer actually confirmed before paying — trusted as
      // the primary source. The purchase response's own name field
      // (`CustomerName` for electricity, `content.transactions.name` for
      // cable — both frequently null in sandbox test data) is only a
      // fallback for the rare case verify was skipped or came back empty.
      const confirmedName = accountName || purchaseRes?.CustomerName || transactionDetails?.name || null;

      await Transaction.updateOne(
        { reference: ref },
        {
          $set: {
            "meta.vtpassTransactionId": transactionDetails?.transactionId,
            "meta.deliveryStatus": transactionDetails?.status,
            "meta.apiResponse": purchaseRes?.response_description,
            "meta.electricityToken": electricityToken,
            ...(confirmedName ? { "meta.accountName": confirmedName, "meta.confirmedName": true } : {}),
          },
        }
      );

      if (couponResult) await recordRedemption(couponResult.coupon._id, req.uid, ref);

      res.json({
        success: true, status: transactionDetails?.status, requestId, reference: ref,
        electricityToken, confirmedName, amountCharged: chargeAmount,
      });
    } catch (err) {
      next(err);
    }
  }
);

// WAEC and JAMB — takes both variationCode and serviceID from the
// /exam-plans list rather than hardcoding either, same pattern cable
// purchases already use. The two need different payloads: JAMB requires a
// verified Profile ID (billersCode) the candidate is paying against; WAEC
// doesn't take one at all. Confirmed live (2026-08-02) that the two also
// return the purchased PIN in completely different shapes (see the
// pinCode/serialNumber extraction below).
router.post(
  "/exam",
  requireAuth,
  [
    body("serviceID").isIn(["waec", "jamb"]).withMessage("Unknown exam type."),
    body("variationCode").isString().trim().notEmpty().withMessage("Select an exam type."),
    body("profileId").optional().isString().trim(),
    body("accountName").optional().isString().trim(),
    PIN_RULE,
  ],
  async (req, res, next) => {
    if (!checkValidation(req, res)) return;
    try {
      const { serviceID, variationCode, profileId, accountName, pin } = req.body;
      if (serviceID === "jamb" && !profileId) throw new ApiError(400, "A JAMB Profile ID is required.");

      const settings = await getSettings();
      assertNotMaintenance(settings);
      assertServiceEnabled(settings, "exam");

      // Same catalog-based, tamper-proof pricing as data/cable — never
      // trusts a client-supplied amount.
      const priced = await resolvePlanPrice("exam", serviceID, variationCode);
      const chargeAmount = priced.sellingPrice;

      const user = await requireBalanceAndPin(req.uid, chargeAmount, pin, settings);

      const requestId = Date.now().toString();
      const ref = "EXAM-" + requestId;
      const title = priced.label;

      const purchaseRes = await debitThenPurchase(
        req.uid,
        chargeAmount,
        ref,
        title,
        "🎓",
        { examName: priced.label, serviceID, profileId: profileId || null, accountName: accountName || null, buyingPrice: priced.buyingPrice, sellingPrice: priced.sellingPrice },
        // VTpass requires a phone in the payload for both even though it's
        // not otherwise used — not collected on this form, so the account's
        // own profile phone is used. quantity is WAEC-only (JAMB has no
        // multi-pin concept); billersCode is JAMB-only.
        () =>
          vtpassPay({
            request_id: ref, serviceID, variation_code: variationCode, phone: user.phone,
            ...(serviceID === "jamb" ? { billersCode: profileId, amount: priced.buyingPrice } : { quantity: 1 }),
          })
      );

      // WAEC: purchased_code is a pipe-separated string ("Serial No:X, pin:
      // Y||..."), `cards` is the same data structured as [{Serial, Pin}].
      // JAMB: no `cards` array at all — the PIN comes back as a top-level
      // `Pin` string literally prefixed "Pin : ", no serial concept.
      const pinCode =
        serviceID === "jamb"
          ? purchaseRes?.Pin?.replace(/^Pin\s*:\s*/i, "").trim() || null
          : purchaseRes?.cards?.[0]?.Pin || null;
      const serialNumber = serviceID === "jamb" ? null : purchaseRes?.cards?.[0]?.Serial || null;

      await Transaction.updateOne(
        { reference: ref },
        {
          $set: {
            "meta.vtpassTransactionId": purchaseRes?.content?.transactions?.transactionId,
            "meta.deliveryStatus": purchaseRes?.content?.transactions?.status,
            "meta.apiResponse": purchaseRes?.purchased_code,
            "meta.pin": pinCode,
            "meta.serialNumber": serialNumber,
          },
        }
      );

      res.json({
        success: true, status: purchaseRes?.content?.transactions?.status, requestId, reference: ref,
        pin: pinCode, serialNumber, apiResponse: purchaseRes?.purchased_code, amountCharged: chargeAmount,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
