import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { ApiError } from "../middleware/errorHandler.js";
import { ExtraVtuService } from "../models/ExtraVtuService.js";

// Lets an admin register a network/cable provider/electricity disco beyond
// the hardcoded tables in services/maskawasub.js — for when Maskawasub adds
// one that isn't already mapped (a 5th mobile network, a new cable company,
// a disco outside the original 8). Unlike the pre-migration VTpass version
// of this route, there's no live "available services" list to check against
// — Maskawasub has no such discovery endpoint — so this is a manual,
// admin-typed registration, not a picker.
const router = Router();

router.get("/:category", requireAdmin, async (req, res, next) => {
  try {
    const { category } = req.params;
    if (!["network", "cable", "electricity"].includes(category)) throw new ApiError(400, `Unknown category: ${category}`);
    const rows = await ExtraVtuService.find({ category }).sort({ createdAt: -1 }).lean();
    res.json({ rows });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  requireAdmin,
  [
    body("category").isIn(["network", "cable", "electricity"]),
    body("networkKey").isString().trim().notEmpty(),
    body("serviceID").isInt({ gt: 0 }).withMessage("Maskawasub's numeric id for this provider is required."),
    body("label").isString().trim().notEmpty().withMessage("A display name is required."),
    body("color").optional().isString().trim(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const { category, networkKey, serviceID, label, color } = req.body;

      const existing = await ExtraVtuService.findOne({ category, networkKey });
      if (existing) throw new ApiError(400, "A provider with this key already exists in this category.");

      const row = await ExtraVtuService.create({
        category, networkKey, serviceID: String(serviceID), label, color: color || "",
      });
      res.status(201).json({ success: true, row });
    } catch (err) {
      next(err);
    }
  }
);

router.post("/:id/toggle", requireAdmin, async (req, res, next) => {
  try {
    const row = await ExtraVtuService.findById(req.params.id);
    if (!row) throw new ApiError(404, "Provider not found.");
    row.active = !row.active;
    await row.save();
    res.json({ success: true, active: row.active });
  } catch (err) {
    next(err);
  }
});

export default router;
