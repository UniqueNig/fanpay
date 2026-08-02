import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { ApiError } from "../middleware/errorHandler.js";
import { DeveloperAccount } from "../models/DeveloperAccount.js";
import { ApiKey } from "../models/ApiKey.js";
import { ApiRequestLog } from "../models/ApiRequestLog.js";
import { User } from "../models/User.js";

const router = Router();

// List every developer with their key counts — the "approve for live
// access" list. DeveloperAccount.status starts "pending"; this is the only
// way to flip it to "approved" (no self-serve path, per requireApiKey.js's
// live-mode gate) or to "suspended".
router.get("/developer-accounts", requireAdmin, async (req, res, next) => {
  try {
    const developers = await DeveloperAccount.find().sort({ createdAt: -1 }).lean();
    const keys = await ApiKey.find({ developerAccountId: { $in: developers.map((d) => d._id) } })
      .select("developerAccountId environment status")
      .lean();
    // Live purchases debit the developer's own wallet directly (no separate
    // API balance, see services/apiPurchase.js) — shown here so an admin
    // can see at a glance whether a developer actually has funds available
    // before approving them for live access.
    const users = await User.find({ uid: { $in: developers.map((d) => d.uid) } }).select("uid balance").lean();
    const balanceByUid = new Map(users.map((u) => [u.uid, u.balance]));

    const keysByDeveloper = new Map();
    for (const k of keys) {
      const id = k.developerAccountId.toString();
      if (!keysByDeveloper.has(id)) keysByDeveloper.set(id, []);
      keysByDeveloper.get(id).push(k);
    }

    res.json({
      developers: developers.map((d) => {
        const devKeys = keysByDeveloper.get(d._id.toString()) || [];
        return {
          ...d,
          keyCount: devKeys.length,
          liveKeyCount: devKeys.filter((k) => k.environment === "live" && k.status === "active").length,
          walletBalance: balanceByUid.get(d.uid) ?? 0,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/developer-accounts/:id/keys", requireAdmin, async (req, res, next) => {
  try {
    const keys = await ApiKey.find({ developerAccountId: req.params.id }).sort({ createdAt: -1 }).lean();
    res.json({
      keys: keys.map((k) => ({
        id: k._id, name: k.name, environment: k.environment, keyPrefix: k.keyPrefix,
        status: k.status, lastUsedAt: k.lastUsedAt, rateLimitPerMinute: k.rateLimitPerMinute, createdAt: k.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/developer-accounts/:id/status", requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["pending", "approved", "suspended"].includes(status)) throw new ApiError(400, "Invalid status.");

    const developer = await DeveloperAccount.findById(req.params.id);
    if (!developer) throw new ApiError(404, "Developer account not found.");

    developer.status = status;
    await developer.save();
    res.json({ success: true, developer });
  } catch (err) {
    next(err);
  }
});

// Admin-side key revoke — distinct from the developer's own
// routes/publicApi/developerAccounts.js revoke endpoint (that one scopes to
// the caller's own developer account; this one takes any key id, for when
// a key needs shutting down without the developer's cooperation).
router.post("/developer-accounts/keys/:id/revoke", requireAdmin, async (req, res, next) => {
  try {
    const key = await ApiKey.findById(req.params.id);
    if (!key) throw new ApiError(404, "API key not found.");
    key.status = "revoked";
    await key.save();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Coarse usage rollup for the admin analytics tab — request volume, error
// rate, and sandbox/live split over the last 30 days, plus a per-developer
// breakdown. Deliberately simple aggregation (no separate daily-rollup
// collection yet, per the plan's note that one isn't needed until real
// volume justifies it) — ApiRequestLog is small enough for a live query at
// this stage.
router.get("/developer-analytics", requireAdmin, async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalRequests, errorRequests, sandboxRequests, liveRequests, byDeveloper] = await Promise.all([
      ApiRequestLog.countDocuments({ createdAt: { $gte: since } }),
      ApiRequestLog.countDocuments({ createdAt: { $gte: since }, statusCode: { $gte: 400 } }),
      ApiRequestLog.countDocuments({ createdAt: { $gte: since }, environment: "sandbox" }),
      ApiRequestLog.countDocuments({ createdAt: { $gte: since }, environment: "live" }),
      ApiRequestLog.aggregate([
        { $match: { createdAt: { $gte: since }, developerAccountId: { $ne: null } } },
        { $group: { _id: "$developerAccountId", requests: { $sum: 1 } } },
        { $sort: { requests: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const developerIds = byDeveloper.map((d) => d._id);
    const developers = await DeveloperAccount.find({ _id: { $in: developerIds } }).select("email companyName").lean();
    const developerMap = new Map(developers.map((d) => [d._id.toString(), d]));

    res.json({
      since,
      totalRequests,
      errorRequests,
      sandboxRequests,
      liveRequests,
      topDevelopers: byDeveloper.map((d) => ({
        developerAccountId: d._id,
        requests: d.requests,
        email: developerMap.get(d._id.toString())?.email || "Unknown",
        companyName: developerMap.get(d._id.toString())?.companyName || "",
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
