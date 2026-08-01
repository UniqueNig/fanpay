import mongoose from "mongoose";

// Singleton document — there's only ever one, fetched/created via
// services/settings.js. Field shape matches AdminSettings.jsx exactly.
const appSettingsSchema = new mongoose.Schema(
  {
    maintenanceMode: { type: Boolean, default: false },
    general: {
      supportEmail: { type: String, default: "" },
      supportPhone: { type: String, default: "" },
      minTransfer: { type: Number, default: 100 },
      maxTransfer: { type: Number, default: 1000000 },
    },
    servicesEnabled: {
      deposits: { type: Boolean, default: true },
      transfers: { type: Boolean, default: true },
      walletTransfers: { type: Boolean, default: true },
      airtime: { type: Boolean, default: true },
      data: { type: Boolean, default: true },
      bills: { type: Boolean, default: true },
    },
    // Airtime/data pricing lives in the ProductPrice catalog now (see
    // models/ProductPrice.js, services/productPricing.js) — per-network
    // rates and per-plan prices, not a blanket percentage. Transfer/bill
    // fees stay here since they're still a flat/percent add-on.
    pricing: {
      transferFeeFlat: { type: Number, default: 0 },
      transferFeePercent: { type: Number, default: 0 },
      billFeeFlat: { type: Number, default: 0 },
      // Deducted from what Aspfiy actually settles before crediting a
      // virtual-account deposit (routes/webhooks.js) — covers Aspfiy's own
      // real cut (~0.75%, confirmed live) plus a margin. Admin-editable
      // since Aspfiy exposes no fee info via API, so this can't be computed.
      aspfiyDepositFeePercent: { type: Number, default: 1.5 },
      // Added ON TOP of what a customer requests to deposit via Paystack
      // (routes/deposits.js, routes/webhooks.js) — the customer pays
      // amount+fee, the wallet is credited exactly `amount`, so FanPay
      // doesn't absorb Paystack's own transaction fee.
      paystackDepositFeePercent: { type: Number, default: 1.5 },
    },
    // AI auto-reply for the customer support chat (services/chatAi.js,
    // services/chatListener.js). Off by default — an admin opts in once
    // ANTHROPIC_API_KEY is set. Per-thread `chats/{uid}.aiPaused` (Firestore,
    // not this doc) overrides this to off for a single conversation once a
    // human admin has replied to it, so the two never talk over each other.
    chat: {
      aiEnabled: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const AppSettings = mongoose.model("AppSettings", appSettingsSchema);
