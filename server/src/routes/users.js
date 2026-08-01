import { Router } from "express";
import { body, validationResult } from "express-validator";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { sendWelcomeEmail } from "../services/email.js";

const router = Router();

// 10 digits total, matching NUBAN length — "0" + a 9-digit random number.
function generateAccountNumber() {
  return "0" + Math.floor(Math.random() * 900000000 + 100000000);
}

// transaction.meta carries whatever a purchase/deposit route found useful to
// record internally — that includes real wholesale cost data (buyingPrice/
// sellingPrice reveal FanPay's exact margin per purchase) and raw
// provider-internal identifiers/debug text, none of which should ever reach
// a customer's own browser. TransactionDetailModal.jsx already hides these
// from the receipt UI, but that's cosmetic only — the previous version of
// this route still sent the raw meta object over the wire regardless, so
// anyone opening devtools' Network tab could read it directly. This is the
// actual enforcement point; keep it as the superset of what the frontend hides.
const HIDDEN_META_KEYS = new Set([
  "buyingPrice", "sellingPrice", "maskawasubId", "vtpassTxId", "apiResponse",
  "adminAction", "adminUid",
]);

function sanitizeMeta(meta = {}) {
  const clean = {};
  for (const [key, value] of Object.entries(meta)) {
    if (!HIDDEN_META_KEYS.has(key)) clean[key] = value;
  }
  return clean;
}

// Returns the user profile plus their 200 most recent transactions, mirroring
// the shape the frontend previously read straight off the Firestore user doc
// (userData.balance, userData.transactions) so AuthContext needs minimal changes.
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findOne({ uid: req.uid });
    if (!user) throw new ApiError(404, "User record not found.");

    const transactions = await Transaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    // Never send the hash itself — just whether one exists.
    const { transactionPinHash, ...userWithoutPinHash } = user.toObject();

    res.json({
      user: {
        ...userWithoutPinHash,
        hasPin: !!transactionPinHash,
        transactions: transactions.map((tx) => ({
          id: tx.reference,
          type: tx.type,
          title: tx.title,
          amount: tx.amount,
          date: tx.createdAt,
          category: tx.category,
          reference: tx.reference,
          ...sanitizeMeta(tx.meta),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Called once right after Firebase signup/Google sign-in to create the Mongo profile.
// Idempotent on uid — safe to call again on every login.
router.post(
  "/",
  requireAuth,
  [
    body("fullName").optional().isString().trim().isLength({ max: 120 }),
    body("phone").optional().isString().trim().isLength({ max: 20 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const existing = await User.findOne({ uid: req.uid });
      if (existing) return res.json({ user: existing });

      const user = await User.create({
        uid: req.uid,
        email: req.email,
        fullName: req.body.fullName || "",
        phone: req.body.phone || "",
        accountNumber: generateAccountNumber(),
      });
      sendWelcomeEmail(user.email, user.fullName);
      res.status(201).json({ user });
    } catch (err) {
      next(err);
    }
  }
);

// Lets a user set/update their phone number after signup — needed since
// Google sign-in doesn't collect one, and it's required before Aspfiy
// virtual accounts can be reserved (routes/deposits.js).
router.patch(
  "/me",
  requireAuth,
  [body("phone").isString().trim().isLength({ min: 10, max: 15 }).withMessage("Enter a valid phone number.")],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const user = await User.findOneAndUpdate({ uid: req.uid }, { phone: req.body.phone }, { new: true });
      if (!user) throw new ApiError(404, "User record not found.");
      res.json({ success: true, phone: user.phone });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
