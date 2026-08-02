import mongoose from "mongoose";
import { User } from "../models/User.js";
import { DeveloperAccount } from "../models/DeveloperAccount.js";
import { Transaction } from "../models/Transaction.js";
import { ApiError } from "../middleware/errorHandler.js";

// Parallel to routes/vtu.js's requireBalanceAndPin/debitThenPurchase, but
// for the developer-API pathway: API-key possession replaces the PIN
// (a third-party server-to-server caller can't be prompted for the
// account's transaction PIN), and live-mode purchases debit
// DeveloperAccount.apiBalance — a separate, developer-funded balance —
// never the developer's own personal User.balance. This keeps a leaked
// live key's blast radius capped at whatever's been pre-funded for API use.
//
// Sandbox-mode purchases never reach any of the balance-moving code below —
// see debitThenPurchaseApi's sandbox branch, which only ever calls into
// services/sandboxProvider.js.

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

async function debitApiBalance(developer, amount, reference, title, category, meta) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const dev = await DeveloperAccount.findById(developer._id).session(session);
      if (dev.apiBalance < amount) throw new ApiError(400, "Insufficient API balance.");
      const user = await User.findOne({ uid: dev.uid }).session(session);
      if (!user) throw new ApiError(404, "Linked account not found.");

      await Transaction.create([{ userId: user._id, type: "debit", title, amount, category, reference, meta }], { session });

      dev.apiBalance -= amount;
      await dev.save({ session });
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) return;
    throw err;
  } finally {
    session.endSession();
  }
}

async function creditApiBalance(developer, amount, reference, title, category, meta) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const dev = await DeveloperAccount.findById(developer._id).session(session);
      const user = await User.findOne({ uid: dev.uid }).session(session);
      if (!user) throw new ApiError(404, "Linked account not found.");

      await Transaction.create([{ userId: user._id, type: "credit", title, amount, category, reference, meta }], { session });

      dev.apiBalance += amount;
      await dev.save({ session });
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) return; // already refunded
    throw err;
  } finally {
    session.endSession();
  }
}

// Fast-fail check before attempting a live-mode purchase — sandbox requests
// skip the balance check entirely (nothing real is being spent).
export async function requireApiKeyAndBalance(apiKey, developer, amount) {
  if (developer.status === "suspended") throw new ApiError(403, "This developer account is suspended.");
  if (apiKey.environment === "live" && developer.apiBalance < amount) {
    throw new ApiError(400, "Insufficient API balance. Fund your developer wallet before making live purchases.");
  }
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

  await debitApiBalance(developer, amount, reference, title, category, { ...meta, sandbox: false });
  try {
    return await purchase();
  } catch (err) {
    await creditApiBalance(developer, amount, reference + "_refund", `Refund: ${title}`, "↩️", {
      reason: "api_purchase_failed",
    });
    throw err;
  }
}
