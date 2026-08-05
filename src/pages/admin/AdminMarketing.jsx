import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import ConfirmModal from "../../components/ConfirmModal";
import { api } from "../../api";
import { formatDate, formatNaira } from "../../utils/helpers";
import { FiAlertCircle, FiPlusCircle, FiTag, FiX, FiSend, FiGift, FiUsers } from "react-icons/fi";

const TABS = ["Coupons & Discounts", "Notifications", "Referral & Rewards"];

const AdminMarketing = () => {
  const [tab, setTab] = useState(0);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Coupons
  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [code, setCode] = useState("");
  const [type, setType] = useState("percent");
  const [value, setValue] = useState("");
  const [creating, setCreating] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  // Referrals & Welcome Bonuses
  const [referrals, setReferrals] = useState([]);
  const [referralSummary, setReferralSummary] = useState(null);
  const [bonuses, setBonuses] = useState([]);
  const [bonusSummary, setBonusSummary] = useState(null);
  const [growthLoading, setGrowthLoading] = useState(true);
  const [growthLoaded, setGrowthLoaded] = useState(false);

  const loadCoupons = async () => {
    setCouponsLoading(true);
    try {
      const data = await api.get("/admin/coupons");
      setCoupons(data.coupons || []);
    } catch (err) { setError(err.message); }
    setCouponsLoading(false);
  };

  const loadNotifications = async () => {
    setNotifLoading(true);
    try {
      const data = await api.get("/admin/notifications");
      setNotifications(data.notifications || []);
    } catch (err) { setError(err.message); }
    setNotifLoading(false);
  };

  const loadGrowth = async () => {
    setGrowthLoading(true);
    try {
      const [referralsData, bonusesData] = await Promise.all([
        api.get("/admin/referrals"),
        api.get("/admin/welcome-bonuses"),
      ]);
      setReferrals(referralsData.referrals || []);
      setReferralSummary(referralsData.summary || null);
      setBonuses(bonusesData.bonuses || []);
      setBonusSummary(bonusesData.summary || null);
    } catch (err) { setError(err.message); }
    setGrowthLoading(false);
    setGrowthLoaded(true);
  };

  useEffect(() => { loadCoupons(); loadNotifications(); }, []);
  useEffect(() => { if (tab === 2 && !growthLoaded) loadGrowth(); }, [tab, growthLoaded]);

  const createCoupon = async (e) => {
    e.preventDefault();
    if (!code.trim() || !value) return;
    setCreating(true);
    try {
      await api.post("/admin/coupons", { code: code.trim(), type, value: Number(value) });
      setCode(""); setValue("");
      loadCoupons();
    } catch (err) { setError(err.message); }
    setCreating(false);
  };

  const toggleCoupon = async (id) => {
    try { await api.post(`/admin/coupons/${id}`, { action: "toggle" }); loadCoupons(); }
    catch (err) { setError(err.message); }
  };

  const deleteCoupon = async () => {
    setDeleting(true);
    try {
      await api.post(`/admin/coupons/${deleteTarget}`, { action: "delete" });
      setDeleteTarget(null);
      loadCoupons();
    } catch (err) { setError(err.message); }
    setDeleting(false);
  };

  const sendNotification = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    try {
      await api.post("/admin/notifications", { title: title.trim(), body: body.trim() });
      setTitle(""); setBody("");
      loadNotifications();
    } catch (err) { setError(err.message); }
    setSending(false);
  };

  return (
    <AdminLayout>
      <div className="p-5 lg:p-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="font-syne font-bold text-ink text-2xl">Marketing</h1>
          <p className="text-ink/40 font-dm text-sm mt-1">Coupons, broadcast notifications, and referrals</p>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} className={`px-4 py-2 rounded-xl font-dm text-sm whitespace-nowrap border transition-colors ${tab === i ? "bg-iris/15 text-iris border-iris/25" : "text-ink/50 border-line hover:text-ink"}`}>
              {t}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
            <FiAlertCircle className="text-red-400 mt-0.5 shrink-0" size={16} />
            <p className="text-red-400 font-dm text-sm">{error}</p>
          </div>
        )}

        {tab === 0 && (
          <>
            <div className="card-flat p-5 mb-6">
              <p className="text-ink font-syne font-semibold text-sm mb-3">Create Coupon</p>
              <form onSubmit={createCoupon} className="flex flex-wrap gap-3">
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CODE" className="input-field-light flex-1 min-w-[120px] uppercase" />
                <select value={type} onChange={(e) => setType(e.target.value)} className="bg-surface border border-line rounded-xl text-ink font-dm text-sm px-3">
                  <option value="percent" style={{ backgroundColor: "rgb(var(--fp-panel))", color: "rgb(var(--fp-ink))" }}>% off</option>
                  <option value="fixed" style={{ backgroundColor: "rgb(var(--fp-panel))", color: "rgb(var(--fp-ink))" }}>₦ off</option>
                </select>
                <input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value" className="input-field-light w-28" />
                <button type="submit" disabled={creating} className="btn-iris !w-auto px-5 flex items-center gap-2 disabled:opacity-60">
                  <FiPlusCircle size={15} /> Create
                </button>
              </form>
              <p className="text-ink/30 font-dm text-xs mt-3">
                Redeemable on bank transfers and electricity bills — capped at that transaction's fee, so a
                coupon can never cost more than FanFi's own margin. Not applicable to airtime, data, or
                cable, which price off the buying/selling catalog (Admin → Pricing Catalog) instead of an
                added fee. One redemption per user per code.
              </p>
            </div>
            {couponsLoading ? (
              <div className="card-flat p-8 text-center text-ink/35 font-dm text-sm">Loading coupons...</div>
            ) : (
              <div className="card-flat overflow-hidden">
                {coupons.length === 0 ? (
                  <div className="p-8 text-center text-ink/35 font-dm text-sm">No coupons yet.</div>
                ) : coupons.map((c, i) => (
                  <div key={c.id} className={`flex items-center justify-between p-4 ${i < coupons.length - 1 ? "border-b border-line" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-iris/15 border border-iris/20 flex items-center justify-center"><FiTag size={13} className="text-iris" /></div>
                      <div>
                        <p className="text-ink font-dm text-sm font-medium">{c.code}</p>
                        <p className="text-ink/35 font-dm text-xs">{c.type === "percent" ? `${c.value}% off` : `₦${c.value} off`} · used {c.usedCount || 0}x</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-dm px-2 py-0.5 rounded-full border ${c.active ? "bg-iris/15 text-iris border-iris/25" : "bg-surface text-ink/40 border-line"}`} onClick={() => toggleCoupon(c.id)} role="button">
                        {c.active ? "Active" : "Inactive"}
                      </span>
                      <button onClick={() => setDeleteTarget(c.id)} className="text-ink/30 hover:text-red-400"><FiX size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 1 && (
          <>
            <div className="card-flat p-5 mb-6">
              <p className="text-ink font-syne font-semibold text-sm mb-3">Broadcast Notification</p>
              <p className="text-ink/30 font-dm text-xs mb-3">
                In-app only — appears wherever the customer app reads the `notifications` collection.
                This does not send push notifications or emails; that needs FCM/an ESP wired in separately.
              </p>
              <form onSubmit={sendNotification} className="flex flex-col gap-3">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="input-field-light" />
                <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" className="input-field-light min-h-[70px] resize-none" />
                <button type="submit" disabled={sending} className="btn-iris flex items-center justify-center gap-2 disabled:opacity-60">
                  <FiSend size={14} /> {sending ? "Sending..." : "Send to All Users"}
                </button>
              </form>
            </div>
            {!notifLoading && (
              <div className="card-flat overflow-hidden">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-ink/35 font-dm text-sm">Nothing sent yet.</div>
                ) : notifications.map((n, i) => (
                  <div key={n.id} className={`p-4 ${i < notifications.length - 1 ? "border-b border-line" : ""}`}>
                    <p className="text-ink font-dm text-sm font-medium">{n.title}</p>
                    <p className="text-ink/40 font-dm text-xs mt-0.5">{n.body}</p>
                    <p className="text-ink/25 font-dm text-[11px] mt-1">{formatDate(n.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 2 && (
          growthLoading ? (
            <div className="card-flat p-8 text-center text-ink/35 font-dm text-sm">Loading...</div>
          ) : (
            <>
              <p className="text-ink/30 font-dm text-xs mb-4">
                Amounts and toggles for both programs live in Settings → Rewards & Referrals.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="card-flat p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FiGift size={15} className="text-iris" />
                    <p className="text-ink font-syne font-semibold text-sm">Welcome Bonuses</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-ink font-syne font-bold text-lg">{bonusSummary?.total || 0}</p>
                      <p className="text-ink/35 font-dm text-[11px]">Granted</p>
                    </div>
                    <div>
                      <p className="text-iris font-syne font-bold text-lg">{bonusSummary?.unlockedCount || 0}</p>
                      <p className="text-ink/35 font-dm text-[11px]">Unlocked</p>
                    </div>
                    <div>
                      <p className="text-ink font-syne font-bold text-lg">{formatNaira(bonusSummary?.totalPaidOut || 0)}</p>
                      <p className="text-ink/35 font-dm text-[11px]">Paid Out</p>
                    </div>
                  </div>
                </div>
                <div className="card-flat p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FiUsers size={15} className="text-iris" />
                    <p className="text-ink font-syne font-semibold text-sm">Referrals</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-ink font-syne font-bold text-lg">{referralSummary?.total || 0}</p>
                      <p className="text-ink/35 font-dm text-[11px]">Total</p>
                    </div>
                    <div>
                      <p className="text-iris font-syne font-bold text-lg">{referralSummary?.paidCount || 0}</p>
                      <p className="text-ink/35 font-dm text-[11px]">Rewarded</p>
                    </div>
                    <div>
                      <p className="text-ink font-syne font-bold text-lg">{formatNaira(referralSummary?.totalPaidOut || 0)}</p>
                      <p className="text-ink/35 font-dm text-[11px]">Paid Out</p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-ink font-syne font-semibold text-sm mb-3">Referrals</p>
              <div className="card-flat overflow-hidden mb-6">
                {referrals.length === 0 ? (
                  <div className="p-8 text-center text-ink/35 font-dm text-sm">No referrals yet.</div>
                ) : referrals.map((r, i) => (
                  <div key={r.id} className={`flex items-center justify-between p-4 gap-3 ${i < referrals.length - 1 ? "border-b border-line" : ""}`}>
                    <div className="min-w-0">
                      <p className="text-ink font-dm text-sm truncate">{r.referrer.fullName || r.referrer.email} → {r.referee.fullName || r.referee.email}</p>
                      <p className="text-ink/35 font-dm text-xs">{formatDate(r.createdAt)}</p>
                    </div>
                    <span className={`text-[10px] font-dm px-2 py-0.5 rounded-full border shrink-0 ${r.rewardStatus === "paid" ? "bg-iris/15 text-iris border-iris/25" : "bg-surface text-ink/40 border-line"}`}>
                      {r.rewardStatus === "paid" ? `Paid ${formatNaira(r.rewardAmount)}` : "Pending"}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-ink font-syne font-semibold text-sm mb-3">Welcome Bonuses</p>
              <div className="card-flat overflow-hidden">
                {bonuses.length === 0 ? (
                  <div className="p-8 text-center text-ink/35 font-dm text-sm">No welcome bonuses granted yet.</div>
                ) : bonuses.map((b, i) => (
                  <div key={b.id} className={`flex items-center justify-between p-4 gap-3 ${i < bonuses.length - 1 ? "border-b border-line" : ""}`}>
                    <div className="min-w-0">
                      <p className="text-ink font-dm text-sm truncate">{b.user.fullName || b.user.email}</p>
                      <p className="text-ink/35 font-dm text-xs">
                        {[b.kycVerified && "KYC", b.fundingMet && "Funded", b.purchaseMade && "Purchased"].filter(Boolean).join(" · ") || "No progress yet"}
                      </p>
                    </div>
                    <span className={`text-[10px] font-dm px-2 py-0.5 rounded-full border shrink-0 ${b.status === "unlocked" ? "bg-iris/15 text-iris border-iris/25" : "bg-surface text-ink/40 border-line"}`}>
                      {b.status === "unlocked" ? `Unlocked ${formatNaira(b.amount)}` : "Locked"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete this coupon?"
        message="This can't be undone — customers will no longer be able to redeem it."
        confirmLabel="Delete"
        danger
        submitting={deleting}
        onConfirm={deleteCoupon}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
};

export default AdminMarketing;
