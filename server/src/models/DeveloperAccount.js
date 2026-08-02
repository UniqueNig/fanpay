import mongoose from "mongoose";

// One per registered developer — separate from User, since not every wallet
// user is a developer, and a developer's own login is still their existing
// Firebase account (uid), not a new identity. See routes/publicApi/developerAccounts.js.
const developerAccountSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    companyName: { type: String, default: "" },
    // Sandbox keys are self-serve immediately (see requireApiKey) — only
    // live-mode keys are gated behind this. No admin approval UI exists yet
    // (that's a later phase); approving a developer today is a manual DB
    // update on this field.
    status: { type: String, enum: ["pending", "approved", "suspended"], default: "pending" },
    // Separate from the developer's own personal wallet (User.balance) —
    // live-mode API purchases only ever debit this, so a leaked live key's
    // blast radius is capped at whatever's been pre-funded here, never the
    // developer's own consumer wallet. See services/apiPurchase.js.
    apiBalance: { type: Number, default: 0, min: 0 },
    webhookUrl: { type: String, default: null },
    webhookSecret: { type: String, default: null },
  },
  { timestamps: true }
);

export const DeveloperAccount = mongoose.model("DeveloperAccount", developerAccountSchema);
