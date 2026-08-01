import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, default: "" },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    balance: { type: Number, default: 0, min: 0 },
    savingsBalance: { type: Number, default: 0, min: 0 },
    accountNumber: { type: String, required: true, unique: true },
    suspended: { type: Boolean, default: false },
    transactionPinHash: { type: String, default: null },
    pinAttempts: { type: Number, default: 0 },
    // Locked after too many wrong PINs — only cleared via an admin-approved
    // PIN reset request (server/src/routes/adminPinRequests.js), not a timer.
    pinLocked: { type: Boolean, default: false },
    // Aspfiy reserved virtual accounts (alternative funding to Paystack) —
    // permanent, not one-off: any transfer to either account credits this
    // wallet at any time. Reserved lazily on first request, not at signup
    // (see routes/deposits.js), so nothing here for an account that's never
    // opened the Deposit page. Sub-object shape mirrors Aspfiy's own
    // response (account_number/account_name/bank_name) — see services/aspfiy.js.
    virtualAccounts: {
      paga: {
        accountNumber: { type: String, default: null },
        accountName: { type: String, default: null },
        bankName: { type: String, default: null },
      },
      palmpay: {
        accountNumber: { type: String, default: null },
        accountName: { type: String, default: null },
        bankName: { type: String, default: null },
      },
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
