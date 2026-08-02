import mongoose from "mongoose";

// One per registered developer — separate from User, since not every wallet
// user is a developer, and a developer's own login is still their existing
// Firebase account (uid), not a new identity. See routes/publicApi/developerAccounts.js.
const developerAccountSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    companyName: { type: String, default: "" },
    // Required before a "live" key can be generated (routes/publicApi/
    // developerAccounts.js) — an admin reviewing a live-access request
    // needs to see what's actually being built against real money before
    // approving it, not just an email address.
    websiteUrl: { type: String, default: "" },
    // Sandbox keys are self-serve immediately (see requireApiKey) — only
    // live-mode keys are gated behind this, approved/suspended from the
    // admin Developer Platform page.
    status: { type: String, enum: ["pending", "approved", "suspended"], default: "pending" },
    // No separate API balance — live-mode purchases debit the developer's
    // own User.balance directly (services/apiPurchase.js), a deliberate
    // choice to avoid a second balance with no funding flow of its own.
    webhookUrl: { type: String, default: null },
    webhookSecret: { type: String, default: null },
  },
  { timestamps: true }
);

export const DeveloperAccount = mongoose.model("DeveloperAccount", developerAccountSchema);
