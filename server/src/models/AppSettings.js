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
      exam: { type: Boolean, default: true },
    },
    // Airtime/data pricing lives in the ProductPrice catalog now (see
    // models/ProductPrice.js, services/productPricing.js) — per-network
    // rates and per-plan prices, not a blanket percentage. Transfer/bill
    // fees stay here since they're still a flat/percent add-on.
    pricing: {
      transferFeeFlat: { type: Number, default: 0 },
      transferFeePercent: { type: Number, default: 0 },
      billFeeFlat: { type: Number, default: 0 },
      // Electricity has no per-plan buying/selling spread to give an
      // approved live-API developer a wholesale rate on (face value is a
      // pure pass-through) — this flat fee is the only real margin, so it's
      // the API-tier equivalent of billFeeFlat for that one service.
      // Defaults equal to billFeeFlat (no discount) until an admin lowers it.
      apiBillFeeFlat: { type: Number, default: 0 },
      // Deducted from what Aspfiy actually settles before crediting a
      // virtual-account deposit (routes/webhooks.js) — covers Aspfiy's own
      // real cut (~0.75%, confirmed live) plus a margin. Admin-editable
      // since Aspfiy exposes no fee info via API, so this can't be computed.
      aspfiyDepositFeePercent: { type: Number, default: 1.5 },
      // Added ON TOP of what a customer requests to deposit via Paystack
      // (routes/deposits.js, routes/webhooks.js) — the customer pays
      // amount+fee, the wallet is credited exactly `amount`, so FanFi
      // doesn't absorb Paystack's own transaction fee.
      paystackDepositFeePercent: { type: Number, default: 1.5 },
    },
    // Caps on airtime/data/cable/electricity purchases for accounts that
    // haven't completed KYC (routes/vtu.js's requireBalanceAndPin) — deposits
    // and receiving money are never limited by this, only spending it on
    // something resellable, which is the actual laundering vector KYC tiers
    // exist to blunt. Verified accounts (KycSubmission.status === "verified")
    // are exempt entirely.
    kyc: {
      unverifiedPerTransactionLimit: { type: Number, default: 5000 },
      unverifiedDailyLimit: { type: Number, default: 10000 },
    },
    // AI auto-reply for the customer support chat (services/chatAi.js,
    // services/chatListener.js). Off by default — an admin opts in once
    // ANTHROPIC_API_KEY is set. Per-thread `chats/{uid}.aiPaused` (Firestore,
    // not this doc) overrides this to off for a single conversation once a
    // human admin has replied to it, so the two never talk over each other.
    chat: {
      aiEnabled: { type: Boolean, default: false },
    },
    // Locked bonus granted at signup, unlocked only once a user has verified
    // KYC + funded past minFunding + made a real purchase — see
    // services/growthEngine.js. Off by default; an admin opts in once
    // amounts are set deliberately, not accidentally live at zero.
    welcomeBonus: {
      enabled: { type: Boolean, default: false },
      amount: { type: Number, default: 500 },
      minFunding: { type: Number, default: 1000 },
      // Days a bonus sits after all 3 conditions are met before it actually
      // pays out (services/growthEngine.js, jobs/maturedBonuses.js) — a
      // fraud/reversal buffer, since the payout is real cash. 0 = instant.
      holdDays: { type: Number, default: 3 },
    },
    // Paid to a referrer once the person they referred unlocks their own
    // welcomeBonus (never at signup) — see services/growthEngine.js.
    referral: {
      enabled: { type: Boolean, default: false },
      rewardAmount: { type: Number, default: 200 },
      // Lifetime cap on auto-paid referrals per referrer — a circuit breaker
      // against multi-account farming. 0 = unlimited. Once a referrer hits
      // this many PAID referrals, further ones go to "held_for_review"
      // instead of auto-paying (services/growthEngine.js) until an admin
      // manually approves/rejects (routes/adminMarketing.js).
      maxAutoPayouts: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const AppSettings = mongoose.model("AppSettings", appSettingsSchema);
