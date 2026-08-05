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
    rewardStatus: { type: String, enum: ["pending", "paid"], default: "pending" },
    rewardedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Referral = mongoose.model("Referral", referralSchema);
