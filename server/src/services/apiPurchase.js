import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { ApiError } from "../middleware/errorHandler.js";
import { debitWallet, creditWallet } from "./wallet.js";

// Parallel to routes/vtu.js's requireBalanceAndPin/debitThenPurchase, but
// for the developer-API pathway: API-key possession replaces the PIN (a
// third-party server-to-server caller can't be prompted for the account's
// transaction PIN). Live-mode purchases debit the developer's own
// User.balance — the same wallet the consumer app uses — via the existing
// debitWallet/creditWallet (services/wallet.js), not a separate balance.
// This was a deliberate simplification over an earlier separate-balance
// design: reusing the already-battle-tested wallet functions (atomic
// session transaction, idempotent-by-reference) beats maintaining a
// parallel debit/credit pair, at the cost of a leaked live key being able
// to spend the developer's whole wallet rather than a pre-funded cap —
// an accepted tradeoff, made explicitly, not an oversight.
//
// Sandbox-mode purchases never reach any balance-moving code below — see
// debitThenPurchaseApi's sandbox branch, which only ever calls into
// services/sandboxProvider.js and never touches a real balance.

function isDuplicateKeyError(err) {
  return err && err.code === 11000;
}

async function findLinkedUser(developer) {
  const user = await User.findOne({ uid: developer.uid });
  if (!user) throw new ApiError(404, "Linked account not found.");
  return user;
}

// Sandbox: log the attempt as a Transaction (for the developer's own usage
// visibility) but never move any balance — there's nothing real to protect.
async function recordSandboxTransaction(developer, amount, reference, title, category, meta) {
  const user = await findLinkedUser(developer);
  try {
    await Transaction.create({ userId: user._id, type: "debit", title, amount, category, reference, meta });
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
  }
}

// Fast-fail check before attempting a live-mode purchase — sandbox requests
// skip the balance check entirely (nothing real is being spent).
export async function requireApiKeyAndBalance(apiKey, developer, amount) {
  if (developer.status === "suspended") throw new ApiError(403, "This developer account is suspended.");
  if (apiKey.environment !== "live") return;

  const user = await findLinkedUser(developer);
  if (user.suspended) throw new ApiError(403, "This account has been suspended.");
  if (user.balance < amount) throw new ApiError(400, "Insufficient wallet balance.");
}

// `purchase` is the function that actually calls the provider — either a
// real one (services/maskawasub.js) for live mode, or a services/sandboxProvider.js
// mock for sandbox. Sandbox never debits/refunds anything; live mode debits
// first, then refunds automatically on failure, same ordering as
// routes/vtu.js's debitThenPurchase and for the same reason (closes the
// double-spend race a post-purchase debit would leave open).
export async function debitThenPurchaseApi({ apiKey, developer, amount, reference, title, category, meta, purchase }) {
  if (apiKey.environment === "sandbox") {
    await recordSandboxTransaction(developer, amount, reference, title, category, { ...meta, sandbox: true });
    return purchase();
  }

  await debitWallet(developer.uid, amount, reference, title, category, { ...meta, sandbox: false });
  try {
    return await purchase();
  } catch (err) {
    await creditWallet(developer.uid, amount, reference + "_refund", `Refund: ${title}`, "↩️", {
      reason: "api_purchase_failed",
    });
    throw err;
  }
}
