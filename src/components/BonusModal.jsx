import React from "react";
import { Link } from "react-router-dom";
import { ChecklistItem } from "../pages/Rewards";
import { formatNaira } from "../utils/helpers";
import { FiGift, FiX } from "react-icons/fi";

// Presentational only — Dashboard.jsx decides WHETHER to render this and
// with which `variant` (see its own logic for the pending/unlocked window
// checks and sessionStorage dismissal). Visual chrome matches
// components/ConfirmModal.jsx for consistency.
const BonusModal = ({ variant, welcomeBonus, onDismiss }) => {
  const bonus = welcomeBonus.bonus;
  const daysLeft = variant === "unlocked" && bonus.unlockedAt
    ? Math.max(0, welcomeBonus.consumeWithinDays - Math.floor((Date.now() - new Date(bonus.unlockedAt).getTime()) / 86400000))
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onDismiss}>
      <div className="w-full max-w-sm bg-panel border border-line rounded-2xl p-6 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onDismiss} className="absolute top-4 right-4 text-ink/30 hover:text-ink/60">
          <FiX size={18} />
        </button>

        <div className="w-11 h-11 rounded-xl bg-iris/10 flex items-center justify-center mb-4">
          <FiGift size={19} className="text-iris" />
        </div>

        {variant === "pending" ? (
          <>
            <h3 className="font-syne font-bold text-ink text-lg mb-1">{formatNaira(bonus.amount)} Welcome Bonus</h3>
            <p className="text-ink/50 font-dm text-sm leading-relaxed mb-4">{welcomeBonus.onboardingMessage}</p>
            <div className="divide-y divide-line mb-5 bg-surface border border-line rounded-xl px-4">
              <ChecklistItem done={bonus.kycVerified} label="Verify your identity (NIN)" />
              <ChecklistItem done={bonus.fundingMet} label={`Fund your wallet with ${formatNaira(welcomeBonus.minFunding)}+`} />
              <ChecklistItem done={bonus.purchaseMade} label="Make a purchase" />
            </div>
            <Link to="/rewards" onClick={onDismiss} className="btn-iris flex items-center justify-center gap-2">
              View My Rewards
            </Link>
          </>
        ) : (
          <>
            <h3 className="font-syne font-bold text-ink text-lg mb-1">{formatNaira(bonus.amount)} Ready to Spend</h3>
            <p className="text-ink/50 font-dm text-sm leading-relaxed mb-4">{welcomeBonus.consumeMessage}</p>
            <div className="bg-gold/10 border border-gold/25 rounded-xl px-4 py-3 mb-5 text-center">
              <p className="text-gold font-syne font-bold text-2xl">{daysLeft}</p>
              <p className="text-gold/80 font-dm text-xs">{daysLeft === 1 ? "day left" : "days left"} to use it</p>
            </div>
            <Link to="/recharge" onClick={onDismiss} className="btn-iris flex items-center justify-center gap-2">
              Spend Now
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default BonusModal;
