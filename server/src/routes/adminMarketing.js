import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { ApiError } from "../middleware/errorHandler.js";
import { Coupon } from "../models/Coupon.js";
import { Notification } from "../models/Notification.js";
import { Referral } from "../models/Referral.js";
import { WelcomeBonus } from "../models/WelcomeBonus.js";
import { User } from "../models/User.js";
import { creditWallet } from "../services/wallet.js";

// Mounted at the same /api/admin base as routes/admin.js — matches exactly
// what AdminMarketing.jsx calls: /admin/coupons, /admin/coupons/:id,
// /admin/notifications.
const router = Router();

router.get("/coupons", requireAdmin, async (req, res, next) => {
  try {
    const docs = await Coupon.find().sort({ createdAt: -1 }).lean();
    res.json({ coupons: docs.map((c) => ({ ...c, id: c._id })) });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/coupons",
  requireAdmin,
  [
    body("code").isString().trim().notEmpty(),
    body("type").isIn(["percent", "fixed"]),
    body("value").isFloat({ gt: 0 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const code = req.body.code.trim().toUpperCase();
      const existing = await Coupon.findOne({ code });
      if (existing) throw new ApiError(400, "A coupon with that code already exists.");

      const coupon = await Coupon.create({ code, type: req.body.type, value: req.body.value });
      res.status(201).json({ success: true, coupon });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/coupons/:id",
  requireAdmin,
  [body("action").isIn(["toggle", "delete"])],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const coupon = await Coupon.findById(req.params.id);
      if (!coupon) throw new ApiError(404, "Coupon not found.");

      if (req.body.action === "delete") {
        await coupon.deleteOne();
      } else {
        coupon.active = !coupon.active;
        await coupon.save();
      }

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/notifications", requireAdmin, async (req, res, next) => {
  try {
    const docs = await Notification.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json({ notifications: docs.map((n) => ({ ...n, id: n._id })) });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/notifications",
  requireAdmin,
  [
    body("title").isString().trim().notEmpty(),
    body("body").isString().trim().notEmpty(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const notification = await Notification.create({ title: req.body.title, body: req.body.body });
      res.status(201).json({ success: true, notification });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/referrals", requireAdmin, async (req, res, next) => {
  try {
    const docs = await Referral.find().sort({ createdAt: -1 }).limit(200).lean();
    const uids = [...new Set(docs.flatMap((r) => [r.referrerUid, r.refereeUid]))];
    const users = await User.find({ uid: { $in: uids } }).select("uid email fullName signupIp").lean();
    const userByUid = Object.fromEntries(users.map((u) => [u.uid, u]));

    // Flag (never block) a referral whose referee shares a signup IP with
    // another referee of the SAME referrer — a classic multi-account tell,
    // but shared IPs happen legitimately (same household/office/carrier
    // NAT), so this is a review signal for the admin list, not an auto-reject.
    const ipCountByReferrer = new Map();
    for (const r of docs) {
      const ip = userByUid[r.refereeUid]?.signupIp;
      if (!ip) continue;
      const key = `${r.referrerUid}::${ip}`;
      ipCountByReferrer.set(key, (ipCountByReferrer.get(key) || 0) + 1);
    }

    const referrals = docs.map((r) => {
      const ip = userByUid[r.refereeUid]?.signupIp;
      const sharedIpFlag = !!ip && (ipCountByReferrer.get(`${r.referrerUid}::${ip}`) || 0) > 1;
      return {
        id: r._id,
        referrer: userByUid[r.referrerUid] ? { email: userByUid[r.referrerUid].email, fullName: userByUid[r.referrerUid].fullName } : { email: r.referrerUid },
        referee: userByUid[r.refereeUid] ? { email: userByUid[r.refereeUid].email, fullName: userByUid[r.refereeUid].fullName } : { email: r.refereeUid },
        rewardAmount: r.rewardAmount,
        rewardStatus: r.rewardStatus,
        rewardedAt: r.rewardedAt,
        createdAt: r.createdAt,
        sharedIpFlag,
      };
    });

    res.json({
      referrals,
      summary: {
        total: docs.length,
        paidCount: docs.filter((r) => r.rewardStatus === "paid").length,
        pendingCount: docs.filter((r) => r.rewardStatus === "pending").length,
        heldCount: docs.filter((r) => r.rewardStatus === "held_for_review").length,
        totalPaidOut: docs.filter((r) => r.rewardStatus === "paid").reduce((sum, r) => sum + r.rewardAmount, 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/referrals/:id/approve", requireAdmin, async (req, res, next) => {
  try {
    const referral = await Referral.findById(req.params.id);
    if (!referral) throw new ApiError(404, "Referral not found.");
    if (referral.rewardStatus !== "held_for_review") throw new ApiError(400, "This referral isn't awaiting review.");

    await creditWallet(
      referral.referrerUid, referral.rewardAmount, `REFERRAL-REWARD-${referral._id}`,
      "Referral Reward", "🤝", { refereeUid: referral.refereeUid, approvedBy: req.uid }
    );
    referral.rewardStatus = "paid";
    referral.rewardedAt = new Date();
    await referral.save();

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post("/referrals/:id/reject", requireAdmin, async (req, res, next) => {
  try {
    const referral = await Referral.findById(req.params.id);
    if (!referral) throw new ApiError(404, "Referral not found.");
    if (referral.rewardStatus !== "held_for_review") throw new ApiError(400, "This referral isn't awaiting review.");

    referral.rewardStatus = "rejected";
    await referral.save();

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get("/welcome-bonuses", requireAdmin, async (req, res, next) => {
  try {
    const docs = await WelcomeBonus.find().sort({ createdAt: -1 }).limit(200).lean();
    const uids = docs.map((b) => b.uid);
    const users = await User.find({ uid: { $in: uids } }).select("uid email fullName").lean();
    const userByUid = Object.fromEntries(users.map((u) => [u.uid, u]));

    const bonuses = docs.map((b) => ({
      id: b._id,
      user: userByUid[b.uid] ? { email: userByUid[b.uid].email, fullName: userByUid[b.uid].fullName } : { email: b.uid },
      amount: b.amount,
      status: b.status,
      kycVerified: b.kycVerified,
      fundingMet: b.fundingMet,
      purchaseMade: b.purchaseMade,
      conditionsMetAt: b.conditionsMetAt,
      unlockedAt: b.unlockedAt,
      createdAt: b.createdAt,
    }));

    res.json({
      bonuses,
      summary: {
        total: docs.length,
        unlockedCount: docs.filter((b) => b.status === "unlocked").length,
        pendingCount: docs.filter((b) => b.status === "pending").length,
        totalPaidOut: docs.filter((b) => b.status === "unlocked").reduce((sum, b) => sum + b.amount, 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
