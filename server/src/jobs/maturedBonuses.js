import cron from "node-cron";
import { WelcomeBonus } from "../models/WelcomeBonus.js";
import { safeCheckAndUnlock } from "../services/growthEngine.js";
import { SystemLog } from "../models/SystemLog.js";

// A bonus that's already met all 3 conditions but is still inside its hold
// period (AppSettings.welcomeBonus.holdDays) has no further user action to
// naturally re-trigger services/growthEngine.js's checkAndUnlockWelcomeBonus
// once nothing else happens — this sweep is what actually unlocks it once
// the hold period elapses. Hourly is more than enough precision for a hold
// measured in days (mirrors jobs/reconcileVtu.js's cron pattern, just a
// much longer natural cadence for what it's checking).
export function startBonusMaturationSweep() {
  cron.schedule("0 * * * *", async () => {
    const candidates = await WelcomeBonus.find({ status: "pending", conditionsMetAt: { $ne: null } }).limit(200);

    let unlocked = 0;
    for (const bonus of candidates) {
      await safeCheckAndUnlock(bonus.uid);
      const after = await WelcomeBonus.findOne({ uid: bonus.uid }).select("status").lean();
      if (after?.status === "unlocked") unlocked++;
    }
    if (candidates.length > 0) {
      await SystemLog.create({
        level: "info",
        source: "bonusMaturation",
        message: `Checked ${candidates.length} bonus(es) past their conditions, unlocked ${unlocked}.`,
      }).catch(() => {});
    }
  });
}
