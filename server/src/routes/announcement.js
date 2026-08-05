import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getSettings } from "../services/settings.js";

// General-purpose admin-authored notice shown as a modal on dashboard login
// (components/AnnouncementModal.jsx) — a single on/off switch with freeform
// title/body, unrelated to the bonus system (see routes/rewards.js for that).
// Read-only; editing happens via the existing generic POST /admin/settings.
const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const settings = await getSettings();
    res.json({
      enabled: !!settings.announcement?.enabled,
      title: settings.announcement?.title || "",
      body: settings.announcement?.body || "",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
