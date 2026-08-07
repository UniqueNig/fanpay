import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { LoginLog } from "../models/LoginLog.js";
import { User } from "../models/User.js";
import { sendNewDeviceLoginEmail } from "../services/email.js";

const router = Router();

// Called by the frontend right after a successful sign-in (email/password,
// Google, or the admin login screen — they all funnel through the same
// AuthContext.login/loginWithGoogle). Fire-and-forget on the frontend side,
// so failures here should never surface to the user.
router.post("/log-login", requireAuth, async (req, res, next) => {
  try {
    const ip = req.ip || "";
    // Checked BEFORE writing this login's own row, against everything
    // prior — a brand new account's very first login has zero prior rows,
    // so every IP would look "new" there; that's expected, not suspicious,
    // hence the priorLoginCount > 0 guard below.
    const priorLoginCount = await LoginLog.countDocuments({ uid: req.uid });
    const seenThisIpBefore = ip ? await LoginLog.exists({ uid: req.uid, ip }) : true;

    await LoginLog.create({
      uid: req.uid,
      email: req.email || "",
      userAgent: req.headers["user-agent"] || "",
      ip,
    });

    if (priorLoginCount > 0 && !seenThisIpBefore) {
      const user = await User.findOne({ uid: req.uid }).select("email fullName").lean();
      if (user) sendNewDeviceLoginEmail(user.email, user.fullName, { ip, userAgent: req.headers["user-agent"] || "" });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
