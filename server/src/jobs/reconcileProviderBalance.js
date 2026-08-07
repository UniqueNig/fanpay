import cron from "node-cron";
import { maskawasubBalance } from "../services/maskawasub.js";
import { ProviderBalanceCheck } from "../models/ProviderBalanceCheck.js";
import { Transaction } from "../models/Transaction.js";
import { SystemLog } from "../models/SystemLog.js";
import { sendBalanceDiscrepancyAlert, resolveAdminAlertEmail } from "../services/email.js";

// A rogue insider with backend access at a VTU provider doesn't need to
// crack anyone's password — they can trigger purchases directly against
// the provider account FanFi already trusts with a prepaid balance. FanFi
// has no visibility into the provider's own transaction log (Maskawasub
// exposes no such endpoint — confirmed by reading their full doc set), so
// the only signal available is: does the balance drop match what FanFi's
// OWN records say was actually spent? A gap means something was charged
// that FanFi never authorized or recorded.
//
// Deliberately one-directional — a balance that dropped LESS than expected,
// or went up, is presumably a manual top-up, not a red flag, and this can't
// tell top-ups apart from spend without a provider transaction-history API
// it doesn't have. That's a real limitation, not a bug: this catches money
// leaving unexpectedly, not every possible discrepancy.
const TOLERANCE_NAIRA = 50;

async function checkProvider(provider, getBalance) {
  const { balance: currentBalance } = await getBalance();
  const existing = await ProviderBalanceCheck.findOne({ provider });

  if (!existing) {
    // First run ever — nothing to compare against yet, just establish the baseline.
    await ProviderBalanceCheck.create({ provider, lastBalance: currentBalance, lastCheckedAt: new Date() });
    return;
  }

  const { lastBalance, lastCheckedAt } = existing;

  const [spendAgg] = await Transaction.aggregate([
    {
      $match: {
        type: "debit",
        reference: { $regex: /^(AIR|DATA)-/ },
        createdAt: { $gte: lastCheckedAt },
        "meta.buyingPrice": { $exists: true },
      },
    },
    { $group: { _id: null, total: { $sum: "$meta.buyingPrice" } } },
  ]);
  const expectedSpend = spendAgg?.total || 0;

  const actualDrop = lastBalance - currentBalance;
  const unexplainedDrop = actualDrop - expectedSpend;

  if (unexplainedDrop > TOLERANCE_NAIRA) {
    const to = await resolveAdminAlertEmail();
    if (to) {
      await sendBalanceDiscrepancyAlert(to, {
        provider, lastBalance, currentBalance, expectedSpend, unexplainedDrop,
        windowStart: lastCheckedAt,
      });
    }
    await SystemLog.create({
      level: "warn", source: "balanceReconciliation",
      message: `${provider}: unexplained drop of ₦${unexplainedDrop.toFixed(2)} (balance ₦${lastBalance}→₦${currentBalance}, recorded spend ₦${expectedSpend}) — alert ${to ? `sent to ${to}` : "SKIPPED, no admin alert email configured"}.`,
    }).catch(() => {});
  } else {
    await SystemLog.create({
      level: "info", source: "balanceReconciliation",
      message: `${provider}: balance ₦${lastBalance}→₦${currentBalance}, recorded spend ₦${expectedSpend} — within tolerance.`,
    }).catch(() => {});
  }

  existing.lastBalance = currentBalance;
  existing.lastCheckedAt = new Date();
  await existing.save();
}

export function startProviderBalanceReconciliation() {
  cron.schedule("0 * * * *", async () => {
    try {
      await checkProvider("maskawasub", maskawasubBalance);
    } catch (err) {
      console.error("Provider balance reconciliation failed:", err.message);
      SystemLog.create({ level: "error", source: "balanceReconciliation", message: err.message }).catch(() => {});
    }
  });
}
