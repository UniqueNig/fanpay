import { Router } from "express";
import { requireApiKey, perKeyLimiter, logApiRequest } from "../../middleware/requireApiKey.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { resolveProviderId } from "../../services/maskawasub.js";
import { listDataCatalog } from "../../services/maskawasubPricing.js";

// Third-party equivalent of routes/vtu.js's GET /data-plans/:network (which
// is requireAuth-gated for FanFi's own frontend) — a developer calling
// POST /api/v1/data needs some way to discover valid variationCode values
// first. Same underlying catalog, just reachable with an API key instead
// of a Firebase session.
const router = Router();

router.get("/data-plans/:network", requireApiKey, perKeyLimiter, logApiRequest, async (req, res, next) => {
  try {
    const networkKey = req.params.network.toLowerCase();
    if (!(await resolveProviderId("network", networkKey))) throw new ApiError(400, `Unknown network: ${req.params.network}`);
    const rows = await listDataCatalog(networkKey);
    res.json({
      plans: rows.filter((r) => r.active).map((r) => ({
        variationCode: r.variationCode, name: r.label, amount: r.sellingPrice,
        planType: r.planType, validity: r.validity, size: r.sizeLabel,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
