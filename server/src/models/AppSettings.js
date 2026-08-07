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
      // Where security/fraud alerts (e.g. provider-balance reconciliation
      // mismatches) get sent — falls back to supportEmail if left blank,
      // see services/email.js's resolveAdminAlertEmail.
      adminAlertEmail: { type: String, default: "" },
      // Safety margin under Resend's free-tier 100/day hard cap — every real
      // send attempt (welcome, KYC, broadcast, alerts, ...) counts against
      // this via models/EmailQuota.js, refused once the day's count exceeds
      // it rather than silently hitting Resend's own limit unpredictably.
      dailyEmailCap: { type: Number, default: 90 },
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
      // Editable copy shown by the two dashboard bonus modals
      // (components/BonusModal.jsx) — freeform intro text only, never
      // interpolated with amounts/dates, so it can't go stale if the numbers
      // above change later (those render dynamically alongside it).
      onboardingMessage: {
        type: String,
        default: "Welcome to FanFi! 🎉 You've got a welcome bonus waiting for you. Complete the steps below to unlock it — it'll be added straight to your wallet.",
      },
      consumeMessage: {
        type: String,
        default: "Your bonus has been added to your wallet! 🎁 Don't let it sit unused — spend it on airtime, data, or bills.",
      },
      // Purely a UI countdown/reminder deadline shown after unlock — never
      // enforced or reclaimed. The bonus is real money in the user's balance
      // the moment it unlocks regardless of this window; there's no
      // locked-balance/ledger concept in this app to safely claw it back
      // from a wallet that's since mixed with other funds.
      consumeWithinDays: { type: Number, default: 7 },
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
    // General-purpose admin-authored notice shown as a modal on dashboard
    // login (components/AnnouncementModal.jsx) — unrelated to the bonus
    // system, a single on/off switch with freeform title/body. Off by
    // default with blank copy until an admin writes something.
    announcement: {
      enabled: { type: Boolean, default: false },
      title: { type: String, default: "" },
      body: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export const AppSettings = mongoose.model("AppSettings", appSettingsSchema);
