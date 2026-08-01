import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { listExtraProviders } from "../services/maskawasub.js";
import { ApiError } from "../middleware/errorHandler.js";

// Admin-registered networks/providers beyond the hardcoded defaults in
// services/maskawasub.js (e.g. a brand-new mobile network, cable company, or
// electricity disco Maskawasub adds later) — the frontend merges these with
// its existing hardcoded list (RECHARGE_NETWORKS / cable providers / bill
// types) for the relevant picker. "airtime" and "data" both map to the same
// underlying "network" category, since Maskawasub uses one shared numeric id
// for both — accepting either spelling here means the existing frontend
// calls (which use "airtime" or "data" depending on which page) don't need
// to change.
const CATEGORY_ALIAS = { airtime: "network", data: "network", network: "network", cable: "cable", electricity: "electricity" };

const router = Router();

router.get("/:category", requireAuth, async (req, res, next) => {
  try {
    const category = CATEGORY_ALIAS[req.params.category];
    if (!category) throw new ApiError(400, `Unknown category: ${req.params.category}`);
    const networks = await listExtraProviders(category);
    res.json({ networks });
  } catch (err) {
    next(err);
  }
});

export default router;
