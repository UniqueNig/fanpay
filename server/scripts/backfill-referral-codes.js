// One-off migration: assigns a referralCode to any account created before
// the referral system shipped (routes/users.js only generates one on the
// true-creation branch of POST /users — existing accounts never went
// through that code). Safe to run more than once — it only touches users
// with no referralCode set.
import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../src/models/User.js";
import { generateReferralCode } from "../src/services/growthEngine.js";

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const affected = await User.find({ referralCode: { $in: [null, undefined] } });
  console.log(`Found ${affected.length} account(s) with no referral code.`);

  for (const user of affected) {
    const code = await generateReferralCode();
    console.log(`${user.email}: -> ${code}`);
    user.referralCode = code;
    await user.save();
  }

  console.log("Done.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
