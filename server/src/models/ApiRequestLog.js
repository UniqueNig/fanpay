import mongoose from "mongoose";

// One row per developer-API request — parallel to models/LoginLog.js's role
// (an audit trail viewed via an admin list page), here powering
// AdminDeveloperPlatform.jsx's usage/analytics tab. Written fire-and-forget
// from middleware/requireApiKey.js's logRequest, never awaited on the
// request path.
const apiRequestLogSchema = new mongoose.Schema(
  {
    apiKeyId: { type: mongoose.Schema.Types.ObjectId, ref: "ApiKey", index: true },
    developerAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "DeveloperAccount", index: true },
    environment: { type: String, enum: ["sandbox", "live"] },
    method: { type: String },
    path: { type: String },
    statusCode: { type: Number },
    ip: { type: String },
  },
  { timestamps: true }
);

// Request volume is naturally high-churn and low long-term value past a
// few months — auto-expire rather than growing this collection forever.
apiRequestLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const ApiRequestLog = mongoose.model("ApiRequestLog", apiRequestLogSchema);
