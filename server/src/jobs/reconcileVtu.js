import cron from "node-cron";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import { creditWallet } from "../services/wallet.js";
import { maskawasubRequery } from "../services/maskawasub.js";
import { SystemLog } from "../models/SystemLog.js";

const PENDING_STATUSES = ["pending", "initiated", "processing"];

// Which Maskawasub endpoint a transaction's status lives at — airtime/data
// are keyed by reference prefix alone; a "BILL-" reference is either cable
// or electricity, disambiguated by meta.billType (set at purchase time,
// see routes/vtu.js).
function requeryKindFor(txn) {
  if (txn.reference.startsWith("AIR-")) return "airtime";
  if (txn.reference.startsWith("DATA-")) return "data";
  if (txn.reference.startsWith("EXAM-")) return "exam";
  if (txn.reference.startsWith("BILL-")) return txn.meta?.billType === "cable" ? "cable" : "electricity";
  return null;
}

// Re-queries a single VTU transaction against Maskawasub and reconciles it:
// marks delivered, or refunds the wallet if Maskawasub ultimately reports
// failure. Shared by the automatic cron below and the admin "Requery" button
// (routes/adminVtuTransactions.js) — same logic either way, just a different
// trigger. Returns the fresh status, or null if the reference isn't a VTU
// transaction, has no recorded Maskawasub id yet, or is still pending.
export async function reconcileOneVtuTransaction(txn) {
  const kind = requeryKindFor(txn);
  if (!kind) return null;

  // Set once the original purchase call returns (routes/vtu.js) — without
  // it there's nothing to look up. Genuinely shouldn't happen in practice
  // (assertDelivered only returns for "successful"/"pending", both of which
  // come with a real Maskawasub id), but a transaction predating this fix
  // could plausibly be missing it.
  const maskawasubId = txn.meta?.maskawasubId;
  if (!maskawasubId) return null;

  const result = await maskawasubRequery(kind, maskawasubId);
  const status = result?.Status;
  if (!status || PENDING_STATUSES.includes(status)) return null; // still pending

  if (status === "successful") {
    txn.meta = { ...txn.meta, deliveryStatus: status };
    await txn.save();
  } else {
    // Maskawasub ultimately failed the delivery — refund the wallet.
    // creditWallet is idempotent on reference, so calling this twice for
    // the same transaction (e.g. cron + manual requery both catching it)
    // is safe.
    const user = await User.findById(txn.userId);
    if (user) {
      await creditWallet(user.uid, txn.amount, txn.reference + "_refund", `Refund: ${txn.title}`, "↩️", {
        reason: "vtu_delivery_failed",
        originalReference: txn.reference,
      });
    }
    txn.meta = { ...txn.meta, deliveryStatus: status };
    await txn.save();
  }

  return status;
}

// Cable purchases in particular return Status: "pending" immediately and
// only confirm asynchronously (confirmed live 2026-08-01 — see
// services/maskawasub.js's assertDelivered) — this job re-queries any VTU
// transaction still marked pending a few minutes later and reconciles it.
// Runs every 5 minutes.
export function startVtuReconciliation() {
  cron.schedule("*/5 * * * *", async () => {
    const stale = new Date(Date.now() - 3 * 60_000); // give Maskawasub at least 3 min
    const candidates = await Transaction.find({
      reference: { $regex: /^(AIR|DATA|BILL|EXAM)-/ },
      "meta.deliveryStatus": { $in: PENDING_STATUSES },
      createdAt: { $lte: stale },
    }).limit(50);

    let reconciled = 0;
    for (const txn of candidates) {
      try {
        const status = await reconcileOneVtuTransaction(txn);
        if (status) reconciled++;
      } catch (err) {
        console.error(`VTU requery failed for ${txn.reference}:`, err.message);
        await SystemLog.create({ level: "error", source: "reconcileVtu", message: `${txn.reference}: ${err.message}` }).catch(() => {});
      }
    }
    if (candidates.length > 0) {
      await SystemLog.create({
        level: "info",
        source: "reconcileVtu",
        message: `Checked ${candidates.length} pending VTU transaction(s), reconciled ${reconciled}.`,
      }).catch(() => {});
    }
  });
}
