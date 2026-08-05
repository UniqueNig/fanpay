import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { User } from "../models/User.js";
import { WelcomeBonus } from "../models/WelcomeBonus.js";
import { Referral } from "../models/Referral.js";
import { Transaction } from "../models/Transaction.js";
import { getSettings } from "../services/settings.js";

// A user's own view of their welcome-bonus progress and referral stats —
// read-only, no side effects. Unlock only ever happens via the 5 hook call
// sites in services/growthEngine.js (adminKyc.js, deposits.js, webhooks.js
// x2, vtu.js's debitThenPurchase), never from this GET.
const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findOne({ uid: req.uid }).select("_id referralCode referredBy").lean();
    if (!user) throw new ApiError(404, "User record not found.");

    const settings = await getSettings();
    const bonus = await WelcomeBonus.findOne({ uid: req.uid }).lean();

    // Same live-computed funding total checkAndUnlockWelcomeBonus itself
    // uses, so the progress bar this powers can never disagree with the
    // real unlock decision.
    const [{ total: fundedTotal } = { total: 0 }] = await Transaction.aggregate([
      { $match: { userId: user._id, type: "credit", category: "💳" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const referrals = await Referral.find({ referrerUid: req.uid }).sort({ createdAt: -1 }).lean();
    const rewardedReferrals = referrals.filter((r) => r.rewardStatus === "paid");

    res.json({
      welcomeBonus: {
        enabled: !!settings.welcomeBonus?.enabled,
        minFunding: settings.welcomeBonus?.minFunding || 0,
        fundedTotal,
        onboardingMessage: settings.welcomeBonus?.onboardingMessage || "",
        consumeMessage: settings.welcomeBonus?.consumeMessage || "",
        consumeWithinDays: settings.welcomeBonus?.consumeWithinDays || 0,
        bonus: bonus
          ? {
              amount: bonus.amount,
              status: bonus.status,
              kycVerified: bonus.kycVerified,
              fundingMet: bonus.fundingMet,
              purchaseMade: bonus.purchaseMade,
              conditionsMetAt: bonus.conditionsMetAt,
              // Client-side display only — the real gate is
              // growthEngine.js's own elapsed-time check at unlock time.
              unlocksAt: bonus.conditionsMetAt
                ? new Date(bonus.conditionsMetAt.getTime() + (settings.welcomeBonus?.holdDays || 0) * 86400000)
                : null,
              unlockedAt: bonus.unlockedAt,
            }
          : null,
      },
      referral: {
        enabled: !!settings.referral?.enabled,
        rewardAmount: settings.referral?.rewardAmount || 0,
        referralCode: user.referralCode || null,
        referredBy: !!user.referredBy,
        totalReferred: referrals.length,
        totalRewarded: rewardedReferrals.length,
        totalEarned: rewardedReferrals.reduce((sum, r) => sum + r.rewardAmount, 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
