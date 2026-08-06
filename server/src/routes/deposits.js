import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { verifyTransaction } from "../services/paystack.js";
import { aspfiyReserveAccount, buildReference } from "../services/aspfiy.js";
import { creditWallet } from "../services/wallet.js";
import { safeCheckAndUnlock } from "../services/growthEngine.js";
import { getSettings, assertNotMaintenance, assertServiceEnabled } from "../services/settings.js";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

const router = Router();

// Returns this user's Paga/Palmpay reserved account numbers — an
// alternative to Paystack: a customer just transfers to either one, at any
// time, and the funding webhook (routes/webhooks.js) credits the wallet.
// Reserves on first request rather than at signup (lazy — most users may
// never need this funding method, and reservation needs a phone number,
// which Google sign-in doesn't collect), then never again; the accounts are
// permanent once created.
router.get("/virtual-accounts", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findOne({ uid: req.uid });
    if (!user) throw new ApiError(404, "User record not found.");

    const needsPaga = !user.virtualAccounts?.paga?.accountNumber;
    const needsPalmpay = !user.virtualAccounts?.palmpay?.accountNumber;

    if (needsPaga || needsPalmpay) {
      if (!user.phone) throw new ApiError(400, "Add a phone number in Settings first — it's required to generate a funding account.");

      const [firstName, ...rest] = (user.fullName || "FanFi User").trim().split(/\s+/);
      const lastName = rest.join(" ") || firstName;
      const webhookUrl = `${env.publicApiUrl}/api/webhooks/aspfiy`;

      // Aspfiy is told this URL ONCE, at reservation time, and never asked
      // again — a wrong value here (PUBLIC_API_URL unset/misconfigured, e.g.
      // still pointing at localhost) doesn't error, it just silently
      // registers a permanently-broken account: money arrives, the webhook
      // has nowhere real to go, and it can never be fixed by us afterward,
      // only by Aspfiy support or re-reserving a fresh account. Failing
      // loudly here, before any account is created, is the only way to
      // catch that class of bug instead of discovering it days later via a
      // customer's missing deposit.
      if (!/^https:\/\//.test(webhookUrl)) {
        throw new ApiError(500, "Funding accounts are temporarily unavailable — PUBLIC_API_URL is misconfigured. Contact support.");
      }

      if (needsPaga) {
        const account = await aspfiyReserveAccount("paga", {
          email: user.email, reference: buildReference(user.uid, "paga"),
          firstName, lastName, phone: user.phone, webhookUrl,
        });
        user.virtualAccounts.paga = {
          accountNumber: account.account_number, accountName: account.account_name, bankName: account.bank_name,
        };
      }
      if (needsPalmpay) {
        const account = await aspfiyReserveAccount("palmpay", {
          email: user.email, reference: buildReference(user.uid, "palmpay"),
          firstName, lastName, phone: user.phone, webhookUrl,
        });
        user.virtualAccounts.palmpay = {
          accountNumber: account.account_number, accountName: account.account_name, bankName: account.bank_name,
        };
      }
      await user.save();
    }

    res.json({ virtualAccounts: user.virtualAccounts });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/verify",
  requireAuth,
  [body("reference").isString().trim().notEmpty()],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const { reference } = req.body;

      const settings = await getSettings();
      assertNotMaintenance(settings);
      assertServiceEnabled(settings, "deposits");

      const paystackData = await verifyTransaction(reference);

      if (!paystackData.status || paystackData.data?.status !== "success")
        throw new ApiError(400, "Payment not confirmed by Paystack.");

      const tx = paystackData.data;
      // The customer was charged amount+fee at checkout (Deposit.jsx
      // surcharges Paystack's cut on top rather than absorbing it) — divide
      // the fee back out of Paystack's own confirmed charge so the wallet
      // gets exactly what the customer asked to deposit. Derived from the
      // *current* admin-configured rate, not anything client-supplied, so
      // there's nothing here for a tampered request to exploit.
      const feePercent = settings.pricing.paystackDepositFeePercent || 0;
      const grossNaira = tx.amount / 100;
      const netNaira = Math.round((grossNaira / (1 + feePercent / 100)) * 100) / 100;

      const user = await User.findOne({ uid: req.uid });
      if (!user) throw new ApiError(404, "User record not found.");
      if (user.suspended) throw new ApiError(403, "This account has been suspended.");

      // Recompute from Paystack's own record of who paid — never trust client input for identity.
      if (user.email !== tx.customer?.email)
        throw new ApiError(403, "Payment email does not match account.");

      await creditWallet(user.uid, netNaira, reference, "Wallet Deposit", "💳", {
        channel: tx.channel,
        paidAt: tx.paid_at,
        grossAmount: grossNaira,
        feePercent,
      });
      await safeCheckAndUnlock(user.uid);

      res.json({ success: true, amount: netNaira });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
