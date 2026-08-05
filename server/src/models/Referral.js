import mongoose from "mongoose";

// One per referral relationship. The reward only ever fires once the
// referee unlocks their own WelcomeBonus (see services/growthEngine.js) —
// not at signup — so a fake/throwaway referred account never pays out
// without real KYC + funding + a purchase behind it.
const referralSchema = new mongoose.Schema(
  {
    referrerUid: { type: String, required: true, index: true },
    // unique — a user can only ever be referred by one person, first one wins.
    refereeUid: { type: String, required: true, unique: true },
    referralCodeUsed: { type: String, required: true },
    // Snapshot of settings.referral.rewardAmount at signup time, same reasoning
    // as WelcomeBonus.amount.
    rewardAmount: { type: Number, required: true },
    // "held_for_review": the referee unlocked their own bonus (so this
    // referral is legitimate on its own terms), but the referrer already hit
    // settings.referral.maxAutoPayouts — an admin must manually approve or
    // reject via routes/adminMarketing.js. "rejected" is terminal, no credit.
    rewardStatus: { type: String, enum: ["pending", "paid", "held_for_review", "rejected"], default: "pending" },
    rewardedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Referral = mongoose.model("Referral", referralSchema);
