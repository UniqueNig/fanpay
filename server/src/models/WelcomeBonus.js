import mongoose from "mongoose";

// One per user, created at signup if settings.welcomeBonus.enabled (see
// services/growthEngine.js). The bonus is never added to User.balance until
// `status` flips to "unlocked" — there's no locked-balance concept anywhere
// else in this app, so keeping it entirely off-balance until real avoids
// having to teach every existing balance check about a spendable/locked split.
const welcomeBonusSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    // Snapshot of settings.welcomeBonus.amount at grant time — so a later
    // admin change to the configured amount doesn't retroactively change
    // what a user who already has a pending bonus will receive.
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "unlocked"], default: "pending" },
    // Cached for fast reads on the Rewards page only — the real unlock
    // decision (services/growthEngine.js's checkAndUnlockWelcomeBonus)
    // always recomputes these live from KycSubmission/Transaction, never
    // trusts these cached values, so they can't drift out of sync in a way
    // that matters.
    kycVerified: { type: Boolean, default: false },
    fundingMet: { type: Boolean, default: false },
    purchaseMade: { type: Boolean, default: false },
    // Set the first moment all three conditions are true — starts the
    // admin-configurable hold period (settings.welcomeBonus.holdDays) before
    // the bonus actually pays out, so a user can't meet the criteria and
    // immediately walk away with cash the moment before reversing a deposit.
    // Never cleared once set, even if this snapshot briefly looks stale.
    conditionsMetAt: { type: Date, default: null },
    unlockedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const WelcomeBonus = mongoose.model("WelcomeBonus", welcomeBonusSchema);
