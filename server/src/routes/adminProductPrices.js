import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { ApiError } from "../middleware/errorHandler.js";
import { ProductPrice } from "../models/ProductPrice.js";
import { resolveProviderId, listExtraProviders, MASKAWASUB_NETWORK, MASKAWASUB_CABLE } from "../services/maskawasub.js";
import { listDataCatalog, listCableCatalog, listExamCatalog, getAirtimeRate } from "../services/maskawasubPricing.js";

const router = Router();

router.get("/airtime", requireAdmin, async (req, res, next) => {
  try {
    const extras = await listExtraProviders("network");
    const networks = [...Object.keys(MASKAWASUB_NETWORK), ...extras.map((e) => e.id)];
    const rows = await Promise.all(
      networks.map(async (network) => {
        const rate = await getAirtimeRate(network);
        return { network, serviceID: network, buyingPrice: rate.buyingPrice, sellingPrice: rate.sellingPrice };
      })
    );
    res.json({ rows });
  } catch (err) {
    next(err);
  }
});

router.get("/data/:network", requireAdmin, async (req, res, next) => {
  try {
    const networkKey = req.params.network.toLowerCase();
    if (!(await resolveProviderId("network", networkKey))) throw new ApiError(400, `Unknown network: ${req.params.network}`);
    const rows = await listDataCatalog(networkKey);
    res.json({ rows });
  } catch (err) {
    next(err);
  }
});

router.get("/cable/:provider", requireAdmin, async (req, res, next) => {
  try {
    if (!(await resolveProviderId("cable", req.params.provider))) throw new ApiError(400, `Unknown cable provider: ${req.params.provider}`);
    const rows = await listCableCatalog(req.params.provider);
    res.json({ rows });
  } catch (err) {
    next(err);
  }
});

router.get("/exam", requireAdmin, async (req, res, next) => {
  try {
    const rows = await listExamCatalog();
    res.json({ rows });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  requireAdmin,
  [
    body("id").optional().isMongoId(),
    body("category").isIn(["airtime", "data", "cable", "exam"]),
    body("serviceID").isString().trim().notEmpty(),
    body("key").isString().trim().notEmpty(),
    body("label").optional().isString().trim(),
    body("buyingPrice").isFloat({ min: 0 }),
    body("sellingPrice").isFloat({ min: 0 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const { id, category, serviceID, key, label, buyingPrice, sellingPrice } = req.body;

      // Editing an existing row (including changing its `key` — the actual
      // Maskawasub plan id used at purchase time, see
      // maskawasubPricing.js's resolveDataPlanPrice/resolveCablePlanPrice) —
      // `key` can't be part of the lookup filter here the way the upsert
      // path below uses it, or "changing the id" would just create a second
      // row instead of renaming the existing one.
      if (id) {
        const row = await ProductPrice.findByIdAndUpdate(
          id,
          { category, serviceID, key, label: label || "", buyingPrice, sellingPrice },
          { new: true }
        );
        if (!row) throw new ApiError(404, "Plan not found.");
        return res.json({ success: true, row });
      }

      // No id — either a brand new manually-added plan (AddPlanForm) or a
      // sync from the live Maskawasub catalog, both keyed by
      // {serviceID, key} since that's the natural identity before a row
      // (and therefore an _id) exists yet.
      const row = await ProductPrice.findOneAndUpdate(
        { serviceID, key },
        { category, serviceID, key, label: label || "", buyingPrice, sellingPrice },
        { new: true, upsert: true }
      );
      res.json({ success: true, row });
    } catch (err) {
      next(err);
    }
  }
);

router.post("/:id/toggle", requireAdmin, async (req, res, next) => {
  try {
    const row = await ProductPrice.findById(req.params.id);
    if (!row) throw new ApiError(404, "Plan not found.");
    row.active = !row.active;
    await row.save();
    res.json({ success: true, active: row.active });
  } catch (err) {
    next(err);
  }
});

// Hide/show every plan in a whole type group at once (e.g. all of a
// network's "SME" plans) — one bulk update rather than N individual toggle
// calls. Operates on the same `active` field the per-plan toggle above
// does, so an admin can still flip any single plan back afterward; there's
// no separate "category active" concept to keep in sync.
router.post(
  "/bulk-toggle",
  requireAdmin,
  [
    body("ids").isArray({ min: 1 }),
    body("ids.*").isMongoId(),
    body("active").isBoolean(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const { ids, active } = req.body;
      await ProductPrice.updateMany({ _id: { $in: ids } }, { active });
      res.json({ success: true, active, count: ids.length });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
