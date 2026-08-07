import mongoose from "mongoose";

// One doc per provider — tracks the last known balance and when it was
// checked, so each reconciliation run (jobs/reconcileProviderBalance.js)
// only has to explain the drop SINCE the last check, not the provider's
// entire history. `provider` is a free-form key ("maskawasub" today,
// could extend to "vtpass" etc. later) rather than an enum, so a new
// provider doesn't need a schema migration to start being tracked.
const providerBalanceCheckSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true, unique: true, index: true },
    lastBalance: { type: Number, required: true },
    lastCheckedAt: { type: Date, required: true },
    // Separate from lastCheckedAt (which updates every hour) — tracks the
    // last routine "all clear" digest (services/email.js's
    // sendReconciliationDigest), sent at most once/day regardless of how
    // often the hourly check itself runs.
    lastSummaryEmailAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const ProviderBalanceCheck = mongoose.model("ProviderBalanceCheck", providerBalanceCheckSchema);
