import React, { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useToast } from "../context/ToastContext";
import { api } from "../api";
import { formatNaira, formatDate } from "../utils/helpers";
import { FiCheck, FiCopy, FiGift, FiUsers, FiUserCheck, FiCreditCard, FiShoppingBag } from "react-icons/fi";

const ChecklistItem = ({ done, label, sublabel }) => (
  <div className="flex items-center gap-3 py-3">
    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-iris/15 text-iris border border-iris/25" : "bg-surface text-ink/30 border border-line"}`}>
      {done ? <FiCheck size={14} /> : <span className="w-1.5 h-1.5 rounded-full bg-ink/20" />}
    </div>
    <div>
      <p className={`font-dm text-sm ${done ? "text-ink" : "text-ink/50"}`}>{label}</p>
      {sublabel && <p className="text-ink/30 font-dm text-xs">{sublabel}</p>}
    </div>
  </div>
);

const Rewards = () => {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/rewards");
        setData(res);
      } catch (err) {
        setError(err.message || "Could not load your rewards.");
      }
      setLoading(false);
    })();
  }, []);

  const referralLink = data?.referral.referralCode
    ? `${window.location.origin}/signup?ref=${data.referral.referralCode}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    showToast("Referral link copied!", "success");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <DashboardLayout>
      <div className="p-5 lg:p-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="font-syne font-bold text-ink text-2xl">Rewards</h1>
          <p className="text-ink/40 font-dm text-sm mt-1">Your welcome bonus and referral earnings</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 text-red-400 font-dm text-sm">
            {error}
          </div>
        )}

        {loading || !data ? (
          <div className="card-flat p-8 text-center text-ink/35 font-dm text-sm">Loading...</div>
        ) : (
          <div className="flex flex-col gap-6">
            {data.welcomeBonus.enabled && (
              <div className="card-flat p-6">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-iris/15 border border-iris/20 flex items-center justify-center">
                      <FiGift size={16} className="text-iris" />
                    </div>
                    <p className="text-ink font-syne font-bold text-base">Welcome Bonus</p>
                  </div>
                  {data.welcomeBonus.bonus && (() => {
                    const isMaturing = data.welcomeBonus.bonus.status !== "unlocked" && !!data.welcomeBonus.bonus.conditionsMetAt;
                    const label = data.welcomeBonus.bonus.status === "unlocked" ? "Unlocked" : isMaturing ? "Maturing" : "Locked";
                    return (
                      <span className={`text-xs font-dm px-2.5 py-1 rounded-full border ${data.welcomeBonus.bonus.status === "unlocked" ? "bg-iris/15 text-iris border-iris/25" : isMaturing ? "bg-gold/10 text-gold border-gold/25" : "bg-surface text-ink/40 border-line"}`}>
                        {label}
                      </span>
                    );
                  })()}
                </div>

                {!data.welcomeBonus.bonus ? (
                  <p className="text-ink/35 font-dm text-sm mt-3">No welcome bonus on your account.</p>
                ) : (
                  <>
                    <p className="text-ink/50 font-dm text-sm mt-2">
                      {data.welcomeBonus.bonus.status === "unlocked"
                        ? `₦${data.welcomeBonus.bonus.amount.toLocaleString()} has been added to your wallet.`
                        : data.welcomeBonus.bonus.conditionsMetAt
                        ? `You've qualified! ${formatNaira(data.welcomeBonus.bonus.amount)} pays out on ${formatDate(data.welcomeBonus.bonus.unlocksAt)}.`
                        : `Complete all 3 steps below to unlock ${formatNaira(data.welcomeBonus.bonus.amount)}.`}
                    </p>
                    <div className="divide-y divide-line mt-3">
                      <ChecklistItem done={data.welcomeBonus.bonus.kycVerified} label="Verify your identity (NIN)" sublabel="Complete KYC verification" />
                      <ChecklistItem
                        done={data.welcomeBonus.bonus.fundingMet}
                        label={`Fund your wallet with ${formatNaira(data.welcomeBonus.minFunding)} or more`}
                        sublabel={`You've funded ${formatNaira(data.welcomeBonus.fundedTotal)} so far`}
                      />
                      <ChecklistItem done={data.welcomeBonus.bonus.purchaseMade} label="Make a purchase" sublabel="Airtime, data, a bill, or an exam PIN" />
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="card-flat p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-iris/15 border border-iris/20 flex items-center justify-center">
                  <FiUsers size={16} className="text-iris" />
                </div>
                <p className="text-ink font-syne font-bold text-base">Refer Friends</p>
              </div>

              {data.referral.referredBy && (
                <p className="text-ink/35 font-dm text-xs mb-3">You joined FanFi using someone else's referral link.</p>
              )}

              <p className="text-ink/50 font-dm text-sm mb-3">
                {data.referral.enabled
                  ? `Share your link — when a friend you refer verifies their identity, funds their wallet, and makes a purchase, you earn ${formatNaira(data.referral.rewardAmount)}.`
                  : "Share your referral link with friends."}
              </p>

              <div className="flex items-center gap-2 mb-4">
                <input readOnly value={referralLink} className="input-field-light !py-2.5 text-sm flex-1 truncate" onFocus={(e) => e.target.select()} />
                <button onClick={copyLink} className="btn-outline-iris !w-auto px-4 py-2.5 text-sm flex items-center gap-2 shrink-0">
                  {copied ? <FiCheck size={14} /> : <FiCopy size={14} />} {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface border border-line rounded-xl p-3 text-center">
                  <FiUserCheck size={15} className="text-iris mx-auto mb-1.5" />
                  <p className="text-ink font-syne font-bold text-lg">{data.referral.totalReferred}</p>
                  <p className="text-ink/35 font-dm text-[11px]">Referred</p>
                </div>
                <div className="bg-surface border border-line rounded-xl p-3 text-center">
                  <FiCreditCard size={15} className="text-iris mx-auto mb-1.5" />
                  <p className="text-ink font-syne font-bold text-lg">{data.referral.totalRewarded}</p>
                  <p className="text-ink/35 font-dm text-[11px]">Rewarded</p>
                </div>
                <div className="bg-surface border border-line rounded-xl p-3 text-center">
                  <FiShoppingBag size={15} className="text-iris mx-auto mb-1.5" />
                  <p className="text-ink font-syne font-bold text-lg">{formatNaira(data.referral.totalEarned)}</p>
                  <p className="text-ink/35 font-dm text-[11px]">Earned</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Rewards;
