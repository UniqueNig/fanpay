import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import TransactionDetailModal from "../components/TransactionDetailModal";
import BonusModal from "../components/BonusModal";
import AnnouncementModal from "../components/AnnouncementModal";
import Skeleton from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { formatNaira, formatDate, formatTime } from "../utils/helpers";
import {
  FiFileText, FiSmartphone, FiPhoneCall,
  FiArrowUpRight, FiArrowDownLeft, FiEye, FiEyeOff, FiPlusCircle, FiCopy, FiCheck,
} from "react-icons/fi";

// Transfer/Send Money deliberately left out for now — see the same note in
// Sidebar.jsx. Recharge split into two tiles (Airtime/Data) rather than one
// combined one, both landing on the same /recharge page pre-set via ?type=.
const quickActions = [
  { to: "/deposit", icon: <FiPlusCircle size={22} />, label: "Deposit", color: "text-iris", bg: "bg-iris/15 border-iris/30", hoverBg: "hover:bg-iris/25" },
  { to: "/recharge?type=airtime", icon: <FiPhoneCall size={22} />, label: "Buy Airtime", color: "text-sky-400", bg: "bg-sky-400/10 border-sky-400/25", hoverBg: "hover:bg-sky-400/20" },
  { to: "/recharge?type=data", icon: <FiSmartphone size={22} />, label: "Buy Data", color: "text-gold", bg: "bg-gold/10 border-gold/25", hoverBg: "hover:bg-gold/20" },
  { to: "/bills", icon: <FiFileText size={22} />, label: "Pay Bills", color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/25", hoverBg: "hover:bg-orange-400/20" },
];

// Tiny non-cryptographic hash so the announcement's dismissal key in
// localStorage stays short and stable regardless of message length — an
// admin editing the text produces a new hash, so a previously-dismissed
// announcement naturally reappears without any extra "version" field to manage.
function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return hash.toString(36);
}

// Which bonus modal (if any) applies right now, and whether the user has
// already dismissed it this browser session — reappears next session as an
// ongoing nudge, not a one-time-ever dismiss, since the point is repeated
// encouragement toward finishing/spending the bonus.
function getBonusModalVariant(welcomeBonus) {
  if (!welcomeBonus?.enabled || !welcomeBonus.bonus) return null;
  const { bonus } = welcomeBonus;

  if (bonus.status === "pending") {
    return sessionStorage.getItem("fanfi_bonus_modal_seen_pending") ? null : "pending";
  }
  if (bonus.status === "unlocked" && bonus.unlockedAt) {
    const daysSince = (Date.now() - new Date(bonus.unlockedAt).getTime()) / 86400000;
    const withinWindow = daysSince < (welcomeBonus.consumeWithinDays || 0);
    if (withinWindow) return sessionStorage.getItem("fanfi_bonus_modal_seen_unlocked") ? null : "unlocked";
  }
  return null;
}

const Dashboard = () => {
  const { userData, user } = useAuth();
  const [hideBalance, setHideBalance] = useState(false);
  const [selected, setSelected] = useState(null);
  const [virtualAccounts, setVirtualAccounts] = useState(null);
  const [vaLoading, setVaLoading] = useState(true);
  const [vaError, setVaError] = useState("");
  const [copiedBank, setCopiedBank] = useState(null);
  const [welcomeBonus, setWelcomeBonus] = useState(null);
  const [announcement, setAnnouncement] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // "announcement" | "bonus" | null

  const balance = userData?.balance ?? 0;

  // Reserves (first visit only — cheap Mongo read on every visit after) and
  // shows the Paga/Palmpay funding accounts here instead of FanFi's own
  // internal account number, which only mattered for wallet-to-wallet
  // transfer — a feature not currently offered (see Sidebar.jsx).
  useEffect(() => {
    api.get("/deposits/virtual-accounts")
      .then((res) => setVirtualAccounts(res.virtualAccounts))
      .catch((err) => setVaError(err.message || "Could not load funding accounts."))
      .finally(() => setVaLoading(false));
  }, []);

  useEffect(() => {
    api.get("/rewards").then((res) => setWelcomeBonus(res.welcomeBonus)).catch(() => {});
    api.get("/announcement").then(setAnnouncement).catch(() => {});
  }, []);

  // At most one modal shown at a time — the admin announcement takes
  // priority (it may be time-sensitive), the bonus nudge follows once the
  // announcement is closed or wasn't applicable.
  useEffect(() => {
    if (activeModal) return;
    if (announcement?.enabled) {
      const dismissedKey = localStorage.getItem("fanfi_announcement_dismissed");
      if (dismissedKey !== hashText(announcement.title + "::" + announcement.body)) {
        setActiveModal("announcement");
        return;
      }
    }
    if (getBonusModalVariant(welcomeBonus)) setActiveModal("bonus");
  }, [announcement, welcomeBonus, activeModal]);

  const dismissAnnouncement = () => {
    localStorage.setItem("fanfi_announcement_dismissed", hashText(announcement.title + "::" + announcement.body));
    setActiveModal(getBonusModalVariant(welcomeBonus) ? "bonus" : null);
  };

  const dismissBonusModal = () => {
    const variant = getBonusModalVariant(welcomeBonus);
    if (variant) sessionStorage.setItem(`fanfi_bonus_modal_seen_${variant}`, "1");
    setActiveModal(null);
  };

  const handleCopy = (accountNumber, bank) => {
    navigator.clipboard.writeText(accountNumber);
    setCopiedBank(bank);
    setTimeout(() => setCopiedBank(null), 1500);
  };
  const transactions = userData?.transactions
    ? [...userData.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10)
    : [];

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "night" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 21 ? "evening" : "night";

  return (
    <DashboardLayout>
      <div className="p-5 lg:p-8 max-w-5xl">
        {/* Greeting */}
        <div className="mb-7">
          <h1 className="font-syne font-bold text-ink text-2xl">
            Good {greeting},{" "}
            <span className="text-iris">{user?.displayName?.split(" ")[0] || "there"}</span> 👋
          </h1>
          <p className="text-ink/40 font-dm text-sm mt-1">Here's your financial overview</p>
        </div>

        {/* Balance card */}
        <div className="card-flat p-6 relative overflow-hidden mb-7">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-iris/5 -translate-y-16 translate-x-16 pointer-events-none" />
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-ink/50 font-dm text-xs mb-1 uppercase tracking-widest">Wallet Balance</p>
              <p className="font-syne font-bold text-4xl text-ink">
                {hideBalance ? "₦ ••••••••" : formatNaira(balance)}
              </p>
            </div>
            <button
              onClick={() => setHideBalance(!hideBalance)}
              className="text-ink/30 hover:text-ink/70 mt-1 transition-colors"
            >
              {hideBalance ? <FiEye size={18} /> : <FiEyeOff size={18} />}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {vaLoading ? (
              <>
                <Skeleton className="h-[52px] w-40 rounded-xl" />
                <Skeleton className="h-[52px] w-40 rounded-xl" />
              </>
            ) : vaError ? (
              <p className="text-red-400/80 font-dm text-xs">
                {vaError}{" "}
                {vaError.includes("phone") && (
                  <Link to="/settings" className="text-iris hover:underline">Update in Settings →</Link>
                )}
              </p>
            ) : (
              [["paga", virtualAccounts?.paga], ["palmpay", virtualAccounts?.palmpay]].map(
                ([bank, acc]) =>
                  acc?.accountNumber && (
                    <button
                      key={bank}
                      onClick={() => handleCopy(acc.accountNumber, bank)}
                      className="flex items-center gap-2 bg-surface border border-line rounded-xl px-4 py-2 hover:bg-line transition-colors"
                    >
                      <div className="text-left">
                        <p className="text-ink/40 font-dm text-[11px] uppercase tracking-wider mb-0.5">{acc.bankName}</p>
                        <p className="text-ink font-syne font-semibold text-sm">{acc.accountNumber}</p>
                        <p className="text-ink/40 font-dm text-[11px] mt-0.5">{acc.accountName}</p>
                      </div>
                      {copiedBank === bank ? <FiCheck size={14} className="text-iris" /> : <FiCopy size={14} className="text-ink/40" />}
                    </button>
                  )
              )
            )}
          </div>
          <p className="text-ink/30 font-dm text-[11px] mt-3">Transfer to either account above to fund your wallet — instant, any time.</p>
        </div>

        {/* Quick actions */}
        <div className="mb-8">
          <h2 className="font-syne font-semibold text-ink text-base mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((a, i) => (
              <Link
                key={i}
                to={a.to}
                className={`flex flex-col items-center gap-3 p-5 rounded-2xl border ${a.bg} ${a.hoverBg} hover:scale-105 transition-all duration-200`}
              >
                <span className={a.color}>{a.icon}</span>
                <span className="text-ink font-dm text-sm font-medium text-center">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-syne font-semibold text-ink text-base">Recent Transactions</h2>
            {transactions.length > 0 && (
              <Link to="/transactions" className="text-iris font-dm text-xs hover:underline">View all</Link>
            )}
          </div>

          <div className="card-flat overflow-hidden">
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-surface border border-line flex items-center justify-center mb-4 text-2xl">
                  💳
                </div>
                <p className="text-ink font-syne font-semibold text-base mb-1">No transactions yet</p>
                <p className="text-ink/40 font-dm text-sm mb-5">
                  Fund your wallet to get started
                </p>
                <Link
                  to="/deposit"
                  className="flex items-center gap-2 btn-iris text-sm px-6 py-3"
                >
                  <FiPlusCircle size={15} />
                  Deposit Money
                </Link>
              </div>
            ) : (
              transactions.map((tx, i) => (
                <button
                  key={tx.id || i}
                  onClick={() => setSelected(tx)}
                  className={`w-full flex items-center justify-between p-4 text-left hover:bg-surface transition-colors ${i < transactions.length - 1 ? "border-b border-line" : ""}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center text-base shrink-0">
                      {tx.category}
                    </div>
                    <div className="min-w-0">
                      <p className="text-ink font-dm text-sm font-medium truncate">{tx.title}</p>
                      <p className="text-ink/35 font-dm text-xs">
                        {formatDate(tx.date)} · {formatTime(tx.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {tx.type === "credit" ? (
                      <FiArrowDownLeft size={13} className="text-iris" />
                    ) : (
                      <FiArrowUpRight size={13} className="text-red-400" />
                    )}
                    <span
                      className={`font-syne font-semibold text-sm ${
                        tx.type === "credit" ? "text-iris" : "text-red-400"
                      }`}
                    >
                      {tx.type === "debit" ? "-" : "+"}{formatNaira(tx.amount)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {selected && <TransactionDetailModal transaction={selected} onClose={() => setSelected(null)} />}
      {activeModal === "announcement" && (
        <AnnouncementModal title={announcement.title} body={announcement.body} onDismiss={dismissAnnouncement} />
      )}
      {activeModal === "bonus" && (
        <BonusModal variant={getBonusModalVariant(welcomeBonus)} welcomeBonus={welcomeBonus} onDismiss={dismissBonusModal} />
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
