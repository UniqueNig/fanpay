import { User } from "../models/User.js";
import { WelcomeBonus } from "../models/WelcomeBonus.js";
import { Referral } from "../models/Referral.js";
import { KycSubmission } from "../models/KycSubmission.js";
import { Transaction } from "../models/Transaction.js";
import { SystemLog } from "../models/SystemLog.js";
import { creditWallet } from "./wallet.js";
import { getSettings } from "./settings.js";

// Visually ambiguous characters (0/O, 1/I) excluded so a code read aloud or
// typed by hand isn't a coin flip.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// A 7-char code from a ~33-char alphabet collides far more plausibly at scale
// than the existing generateAccountNumber()'s 9-digit space (users.js), which
// gets away with zero retry logic — this can't, so it retries a bounded
// number of times before giving up loudly rather than silently duplicating.
export async function generateReferralCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    let code = "";
    for (let i = 0; i < 7; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    if (!(await User.exists({ referralCode: code }))) return code;
  }
  throw new Error("Could not generate a unique referral code after 5 attempts.");
}

function isDuplicateKeyError(err) {
  return err && err.code === 11000;
}

// Called once, from the true-creation branch of users.js's POST / — creates
// a pending WelcomeBonus doc if the program is enabled. Does NOT touch
// User.balance; the bonus only becomes real money at unlock time (see
// checkAndUnlockWelcomeBonus below). Swallows a duplicate-key race the same
// defensive way wallet.js does, even though this should only ever run once
// per real signup.
export async function grantWelcomeBonusIfEnabled(uid) {
  const settings = await getSettings();
  if (!settings.welcomeBonus?.enabled) return;
  try {
    await WelcomeBonus.create({ uid, amount: settings.welcomeBonus.amount });
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
  }
}

// Called once, from the true-creation branch of users.js's POST /, only if
// the signup included a referral code. No-ops silently (never blocks
// signup) on: unknown code, or a self-referral (uid === referrer's own uid —
// in practice unreachable for a brand-new signup, since their own
// referralCode doesn't exist until the same User.create() call finishes,
// but cheap to guard anyway).
export async function linkReferral(refereeUid, code) {
  const referrer = await User.findOne({ referralCode: code }).select("uid").lean();
  if (!referrer || referrer.uid === refereeUid) return;

  const settings = await getSettings();
  try {
    await Referral.create({
      referrerUid: referrer.uid,
      refereeUid,
      referralCodeUsed: code,
      rewardAmount: settings.referral?.rewardAmount || 0,
    });
    await User.updateOne({ uid: refereeUid }, { referredBy: referrer.uid });
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
  }
}

// The core unlock check — called after every event that could complete one
// of the three conditions (see the 5 call sites: adminKyc.js, deposits.js,
// webhooks.js x2, vtu.js's debitThenPurchase). Always recomputes live from
// KycSubmission/Transaction rather than trusting any cached counter, so it
// can't drift and self-corrects if an admin changes minFunding later.
export async function checkAndUnlockWelcomeBonus(uid) {
  const bonus = await WelcomeBonus.findOne({ uid });
  if (!bonus || bonus.status === "unlocked") return;

  const user = await User.findOne({ uid }).select("_id balance").lean();
  if (!user) return;

  const settings = await getSettings();

  bonus.kycVerified = !!(await KycSubmission.exists({ uid, status: "verified" }));

  // category: "💳" is the exact filter routes/admin.js already uses for
  // "deposits" — it's creditWallet's default AND the only category the 3
  // real-funding call sites (deposits.js, webhooks.js x2) ever pass. The
  // bonus/referral credits below must always pass an explicit different
  // category (never rely on creditWallet's default), or they'd silently
  // count themselves as funding here.
  const [{ total } = { total: 0 }] = await Transaction.aggregate([
    { $match: { userId: user._id, type: "credit", category: "💳" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  bonus.fundingMet = total >= (settings.welcomeBonus?.minFunding || 0);

  // Same reference-prefix convention vtu.js's assertWithinKycLimit already
  // relies on to identify a real airtime/data/bill/exam purchase.
  bonus.purchaseMade = !!(await Transaction.exists({
    userId: user._id, type: "debit", reference: { $regex: /^(AIR|DATA|BILL|EXAM)-/ },
  }));

  await bonus.save();

  if (!(bonus.kycVerified && bonus.fundingMet && bonus.purchaseMade)) return;

  // Deterministic, unique-per-user reference — if two hook calls race and
  // both reach this point before either writes bonus.status, both call
  // creditWallet with the identical reference; wallet.js's own unique-index
  // dedup on `reference` makes the second call a silent no-op. No extra
  // locking needed.
  await creditWallet(uid, bonus.amount, `WELCOME-BONUS-${uid}`, "Welcome Bonus", "🎁", {});
  bonus.status = "unlocked";
  bonus.unlockedAt = new Date();
  await bonus.save();

  const referral = await Referral.findOne({ refereeUid: uid, rewardStatus: "pending" });
  if (referral) {
    await creditWallet(
      referral.referrerUid, referral.rewardAmount, `REFERRAL-REWARD-${referral._id}`,
      "Referral Reward", "🤝", { refereeUid: uid }
    );
    referral.rewardStatus = "paid";
    referral.rewardedAt = new Date();
    await referral.save();
  }
}

// What every hook call site actually calls — awaited (so unlock happens
// before the HTTP response goes out, and a verification script sees
// deterministic ordering) but internally caught, so a bug in this engine can
// never break a KYC review, a deposit, or a purchase.
export async function safeCheckAndUnlock(uid) {
  try {
    await checkAndUnlockWelcomeBonus(uid);
  } catch (err) {
    console.error("[growthEngine] checkAndUnlock failed:", err);
    SystemLog.create({ level: "error", source: "growthEngine", message: err.message }).catch(() => {});
  }
}
