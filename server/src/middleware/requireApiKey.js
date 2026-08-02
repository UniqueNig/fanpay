import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { ApiKey } from "../models/ApiKey.js";
import { DeveloperAccount } from "../models/DeveloperAccount.js";
import { ApiRequestLog } from "../models/ApiRequestLog.js";

// Authenticates a third-party developer request via the X-Api-Key header —
// deliberately separate from requireAuth (auth.js): this sets req.apiKey/
// req.developer, never req.uid/req.email, so no shared route/helper can
// accidentally trust the wrong identity between the two auth models.
export async function requireApiKey(req, res, next) {
  const key = req.headers["x-api-key"] || "";
  if (!key) return res.status(401).json({ error: "API key required." });

  try {
    const keyHash = crypto.createHash("sha256").update(key).digest("hex");
    const apiKey = await ApiKey.findOne({ keyHash, status: "active" });
    if (!apiKey) return res.status(401).json({ error: "Invalid or revoked API key." });

    const developer = await DeveloperAccount.findById(apiKey.developerAccountId);
    if (!developer || developer.status === "suspended") {
      return res.status(403).json({ error: "This developer account is not active." });
    }
    // Sandbox keys work immediately on signup — only live-mode purchases
    // need the manual approval gate (see DeveloperAccount.status).
    if (apiKey.environment === "live" && developer.status !== "approved") {
      return res.status(403).json({ error: "This developer account is not yet approved for live API access." });
    }

    req.apiKey = apiKey;
    req.developer = developer;
    ApiKey.updateOne({ _id: apiKey._id }, { lastUsedAt: new Date() }).catch(() => {});
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid API key." });
  }
}

// Per-key rate limit, on top of the IP-based floor limiter in index.js —
// must run AFTER requireApiKey (needs req.apiKey to exist). Keyed by the
// API key's own id rather than IP, so two developers behind the same
// corporate NAT don't share a bucket, and one key's traffic can't exhaust
// another key's allowance. `max` reads the admin-editable
// ApiKey.rateLimitPerMinute per request rather than a fixed number.
export const perKeyLimiter = rateLimit({
  windowMs: 60_000,
  max: (req) => req.apiKey?.rateLimitPerMinute || 30,
  keyGenerator: (req) => req.apiKey?._id?.toString() || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
});

// Fire-and-forget request logging for AdminDeveloperPlatform.jsx's usage
// tab — must also run after requireApiKey. Logs on res "finish" so the
// final status code (including one set by a later error handler) is
// captured, not the code at the moment this middleware runs.
export function logApiRequest(req, res, next) {
  res.on("finish", () => {
    ApiRequestLog.create({
      apiKeyId: req.apiKey?._id,
      developerAccountId: req.developer?._id,
      environment: req.apiKey?.environment,
      method: req.method,
      path: req.baseUrl + req.path,
      statusCode: res.statusCode,
      ip: req.ip,
    }).catch(() => {});
  });
  next();
}
