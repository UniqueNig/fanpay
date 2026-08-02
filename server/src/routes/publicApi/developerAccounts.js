import { Router } from "express";
import crypto from "crypto";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../../middleware/auth.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { DeveloperAccount } from "../../models/DeveloperAccount.js";
import { ApiKey } from "../../models/ApiKey.js";

// Management of a developer's own account/keys — gated by requireAuth (the
// consumer app's Firebase session), not requireApiKey. A developer is still
// a logged-in FanFi user underneath; managing keys uses that login, not a
// key you might currently be rotating. See routes/publicApi/airtime.js and
// data.js for the requireApiKey-gated purchase endpoints these keys unlock.
const router = Router();

function checkValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array()[0].msg });
    return false;
  }
  return true;
}

router.post("/register", requireAuth, async (req, res, next) => {
  try {
    let developer = await DeveloperAccount.findOne({ uid: req.uid });
    if (!developer) {
      developer = await DeveloperAccount.create({ uid: req.uid, email: req.email });
    }
    res.json({ developer });
  } catch (err) {
    next(err);
  }
});

router.get("/account", requireAuth, async (req, res, next) => {
  try {
    const developer = await DeveloperAccount.findOne({ uid: req.uid });
    if (!developer) throw new ApiError(404, "Not registered as a developer yet.");

    const keys = await ApiKey.find({ developerAccountId: developer._id }).sort({ createdAt: -1 }).lean();
    res.json({
      developer,
      keys: keys.map((k) => ({
        id: k._id, name: k.name, environment: k.environment, keyPrefix: k.keyPrefix,
        status: k.status, lastUsedAt: k.lastUsedAt, rateLimitPerMinute: k.rateLimitPerMinute, createdAt: k.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/keys",
  requireAuth,
  [
    body("environment").isIn(["sandbox", "live"]),
    body("name").optional().isString().trim(),
  ],
  async (req, res, next) => {
    if (!checkValidation(req, res)) return;
    try {
      const developer = await DeveloperAccount.findOne({ uid: req.uid });
      if (!developer) throw new ApiError(404, "Register as a developer first.");

      const { environment, name } = req.body;

      // 32 random bytes, base64url — 256 bits of entropy, infeasible to
      // brute-force regardless of hash speed (see models/ApiKey.js for why
      // this is hashed with plain SHA-256, not bcrypt). Shown once, right
      // here — never stored or displayed again after this response.
      const secret = crypto.randomBytes(32).toString("base64url");
      const plaintextKey = `fk_${environment === "live" ? "live" : "sandbox"}_${secret}`;
      const keyHash = crypto.createHash("sha256").update(plaintextKey).digest("hex");
      const keyPrefix = plaintextKey.slice(0, 18) + "...";

      const apiKey = await ApiKey.create({
        developerAccountId: developer._id, name: name || "", environment, keyPrefix, keyHash,
      });

      res.status(201).json({
        success: true,
        key: plaintextKey, // one-time reveal — the caller must save this now
        id: apiKey._id,
        environment: apiKey.environment,
        keyPrefix: apiKey.keyPrefix,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post("/keys/:id/revoke", requireAuth, async (req, res, next) => {
  try {
    const developer = await DeveloperAccount.findOne({ uid: req.uid });
    if (!developer) throw new ApiError(404, "Not registered as a developer yet.");

    const apiKey = await ApiKey.findOne({ _id: req.params.id, developerAccountId: developer._id });
    if (!apiKey) throw new ApiError(404, "API key not found.");

    apiKey.status = "revoked";
    await apiKey.save();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
