import { Router } from "express";
import express from "express";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { creditWallet } from "../services/wallet.js";
import { verifyAspfiyWebhookSignature, parseReference } from "../services/aspfiy.js";
import { getSettings } from "../services/settings.js";
import { safeCheckAndUnlock } from "../services/growthEngine.js";
import { User } from "../models/User.js";
import { PendingTransfer } from "../models/PendingTransfer.js";
import { SystemLog } from "../models/SystemLog.js";

const router = Router();

function isValidSignature(rawBody, signature) {
  if (!signature) return false;
  // Paystack signs webhooks with the same secret key used for API calls —
  // there's no separate "webhook secret" in their system (unlike Stripe).
  const expected = crypto
    .createHmac("sha512", env.paystackSecretKey)
    .update(rawBody)
    .digest("hex");

  const sigBuf = Buffer.from(signature, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  // Buffers must be equal length for timingSafeEqual, else it throws — treat length
  // mismatch itself as "invalid" rather than letting it crash the request.
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

// Mounted with express.raw() (see index.js) so the HMAC is computed over the
// exact bytes Paystack signed, not a re-serialized JSON.stringify(req.body).
router.post("/paystack", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["x-paystack-signature"];
  if (!isValidSignature(req.body, signature)) {
    console.warn("Invalid Paystack webhook signature");
    SystemLog.create({ level: "warn", source: "paystackWebhook", message: "Rejected a webhook call with an invalid signature." }).catch(() => {});
    return res.status(401).send("Unauthorized");
  }

  const event = JSON.parse(req.body.toString("utf8"));
  console.log("Webhook event:", event.event);

  try {
    if (event.event === "charge.success") {
      const tx = event.data;
      const customerEmail = tx.customer?.email;
      if (customerEmail) {
        const user = await User.findOne({ email: customerEmail });
        if (user) {
          const customFields = tx.metadata?.custom_fields || [];
          const txType = customFields.find((f) => f.variable_name === "type")?.value || "wallet_deposit";
          if (txType === "wallet_deposit") {
            // The customer was charged amount+fee at checkout (Deposit.jsx
            // surcharges Paystack's cut on top rather than absorbing it —
            // see routes/deposits.js's /verify for the same math, this is
            // the same event reaching us via webhook instead/as well,
            // deduped by reference either way) — divide back out the fee so
            // the wallet gets exactly what the customer asked to deposit,
            // not the fee-inclusive total they were actually charged.
            const settings = await getSettings();
            const feePercent = settings.pricing.paystackDepositFeePercent || 0;
            const grossNaira = tx.amount / 100;
            const netNaira = Math.round((grossNaira / (1 + feePercent / 100)) * 100) / 100;
            await creditWallet(user.uid, netNaira, tx.reference, "Wallet Deposit", "💳", {
              channel: tx.channel,
              paidAt: tx.paid_at,
              grossAmount: grossNaira,
              feePercent,
            });
            await safeCheckAndUnlock(user.uid);
          }
        }
      }
    }

    if (event.event === "transfer.failed" || event.event === "transfer.reversed") {
      const tx = event.data;
      const pending = await PendingTransfer.findOne({ transferReference: tx.reference });
      if (pending) {
        await creditWallet(pending.uid, tx.amount / 100, tx.reference + "_refund", "Transfer Refund", "↩️", {
          reason: event.event,
        });
        await pending.deleteOne();
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    SystemLog.create({ level: "error", source: "paystackWebhook", message: err.message }).catch(() => {});
    // Still ack with 200 below — Paystack retries on non-2xx, and the write is
    // already idempotent by reference, so a retry storm from a transient error
    // (e.g. Mongo blip) is more likely to help than hurt here.
  }

  res.status(200).send("ok");
});

// Aspfiy funding notification — fires whenever someone transfers into a
// customer's reserved Paga/Palmpay account (routes/deposits.js's
// GET /virtual-accounts creates these). Confirmed payload shape from
// Aspfiy's docs (not a live-captured example — their docs only show a
// schematic, so this is defensive: gated on `merchant_reference` actually
// matching our own reference format via parseReference, not on the exact
// `event` name string, in case that's slightly different in practice):
//   { event: "PAYMENT_NOTIFICATION", data: { reference, merchant_reference,
//     amount, account: {...}, payer: {...} } }
// Signature (x-wiaxy-signature — see services/aspfiy.js for why it's named
// that) is a static MD5 of the secret key, not an HMAC of the body, so raw
// bytes aren't strictly required for verification — kept as express.raw()
// anyway for consistency with the Paystack handler above and so `event` is
// parsed from the exact bytes Aspfiy sent, not an intermediate re-serialization.
router.post("/aspfiy", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["x-wiaxy-signature"];
  if (!verifyAspfiyWebhookSignature(signature)) {
    console.warn("Invalid Aspfiy webhook signature");
    SystemLog.create({ level: "warn", source: "aspfiyWebhook", message: "Rejected a webhook call with an invalid signature." }).catch(() => {});
    return res.status(401).send("Unauthorized");
  }

  let event;
  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).send("Bad payload");
  }
  console.log("Aspfiy webhook event:", event.event);

  try {
    const data = event.data || {};
    const parsed = parseReference(data.merchant_reference);

    if (parsed) {
      const user = await User.findOne({ uid: parsed.uid });
      const grossAmount = parseFloat(data.amount);
      // Aspfiy takes a cut before settling to us (confirmed live: ~0.75% —
      // ₦1.50 on a ₦200 deposit), but exposes it nowhere in the API or
      // webhook — no fee field, no transaction-lookup endpoint (confirmed
      // by reading their full doc set). Admin-configured deduction
      // (Settings → Pricing → "Aspfiy Deposit Fee") rather than a hardcoded
      // rate, since there's no way to know Aspfiy's real cut per transaction
      // and the user wants to tune the margin without a code change.
      const settings = await getSettings();
      const feePercent = settings.pricing.aspfiyDepositFeePercent || 0;
      const netAmount = Math.round(grossAmount * (1 - feePercent / 100) * 100) / 100;

      // `data.reference` is NOT unique per transaction, despite the name —
      // confirmed live (2026-08-07): two genuinely different deposits to the
      // same reserved account arrived with the identical `reference` value,
      // while `wiaxy_ref`/`transaction_ref` correctly differed between them.
      // It looks tied to the reserved account itself, not the individual
      // transfer. creditWallet dedupes by whatever reference it's given —
      // using `data.reference` meant every deposit after the first one to a
      // given account was silently treated as an already-processed duplicate
      // and never credited, with nothing logged (that's creditWallet's
      // idempotency working exactly as designed, just against a value that
      // wasn't actually unique). `wiaxy_ref`/`transaction_ref` is the field
      // that's actually proven unique per transaction — use that instead.
      const txRef = data.wiaxy_ref || data.transaction_ref;

      if (user && txRef && grossAmount > 0) {
        await creditWallet(user.uid, netAmount, `ASPFIY-${txRef}`, "Wallet Deposit", "💳", {
          method: `Aspfiy (${parsed.bank})`,
          grossAmount,
          feePercent,
          feeDeducted: grossAmount - netAmount,
          payerAccountNumber: data.payer?.account_number,
          payerName: data.payer?.account_name || null,
          aspfiyRef: txRef,
        });
        await safeCheckAndUnlock(user.uid);
      } else {
        SystemLog.create({
          level: "warn", source: "aspfiyWebhook",
          message: `Could not credit — user found: ${!!user}, txRef: ${txRef}, amount: ${data.amount}`,
        }).catch(() => {});
      }
    } else {
      SystemLog.create({
        level: "warn", source: "aspfiyWebhook",
        message: `merchant_reference didn't match expected format: ${data.merchant_reference}`,
      }).catch(() => {});
    }
  } catch (err) {
    console.error("Aspfiy webhook processing error:", err);
    SystemLog.create({ level: "error", source: "aspfiyWebhook", message: err.message }).catch(() => {});
    // Same reasoning as the Paystack handler above — ack 200 regardless so a
    // transient error doesn't trigger a retry storm; creditWallet is
    // idempotent by reference either way.
  }

  res.status(200).send("ok");
});

export default router;
