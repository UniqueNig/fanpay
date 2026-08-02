import mongoose from "mongoose";

// One-to-many with DeveloperAccount. The plaintext key is never stored —
// only its SHA-256 hash (see middleware/requireApiKey.js) and a short
// prefix for UI display ("fk_live_a1b2...", never the full secret again
// after creation). SHA-256, not bcrypt: the plaintext is 32 random bytes
// generated server-side, not a low-entropy value like the 4-digit PIN
// (services/pin.js) that needs bcrypt's deliberate slowness against
// brute-force — a 256-bit random key doesn't need that, and a plain hash
// allows a direct indexed findOne({ keyHash }) lookup on every request
// instead of fetching and bcrypt-comparing every active key.
const apiKeySchema = new mongoose.Schema(
  {
    developerAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "DeveloperAccount", required: true, index: true },
    name: { type: String, default: "" },
    environment: { type: String, enum: ["sandbox", "live"], required: true },
    keyPrefix: { type: String, required: true },
    keyHash: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ["active", "revoked"], default: "active" },
    lastUsedAt: { type: Date, default: null },
    // Admin-overridable per key — mirrors the IP-based express-rate-limit
    // instances elsewhere (index.js) but keyed per-API-key instead.
    rateLimitPerMinute: { type: Number, default: 30 },
  },
  { timestamps: true }
);

export const ApiKey = mongoose.model("ApiKey", apiKeySchema);
