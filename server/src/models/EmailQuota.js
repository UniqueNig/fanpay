import mongoose from "mongoose";

// One doc per calendar day (UTC), incremented atomically on every real send
// attempt via services/email.js. Exists to protect the free Resend tier's
// hard 100/day cap — persisted (not an in-memory counter) so a server
// restart/redeploy mid-day doesn't reset it and blow past the real limit.
const emailQuotaSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true, index: true }, // "YYYY-MM-DD", UTC
  count: { type: Number, default: 0 },
});

export const EmailQuota = mongoose.model("EmailQuota", emailQuotaSchema);
