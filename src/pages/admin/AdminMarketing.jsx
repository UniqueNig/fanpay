import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../api";
import { formatDate } from "../../utils/helpers";
import { FiAlertCircle, FiPlusCircle, FiTag, FiX, FiSend, FiGift } from "react-icons/fi";

const TABS = ["Coupons & Discounts", "Notifications", "Referral & Rewards"];

const AdminMarketing = () => {
  const [tab, setTab] = useState(0);
  const [error, setError] = useState("");

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

  useEffect(() => { loadCoupons(); loadNotifications(); }, []);

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

  const deleteCoupon = async (id) => {
    if (!window.confirm("Delete this coupon?")) return;
    try { await api.post(`/admin/coupons/${id}`, { action: "delete" }); loadCoupons(); }
    catch (err) { setError(err.message); }
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
          <h1 className="font-syne font-bold text-white text-2xl">Marketing</h1>
          <p className="text-white/40 font-dm text-sm mt-1">Coupons, broadcast notifications, and referrals</p>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} className={`px-4 py-2 rounded-xl font-dm text-sm whitespace-nowrap border transition-colors ${tab === i ? "bg-secondary/15 text-secondary border-secondary/25" : "text-white/50 border-white/10 hover:text-white"}`}>
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
            <div className="card-glass p-5 mb-6">
              <p className="text-white font-syne font-semibold text-sm mb-3">Create Coupon</p>
              <form onSubmit={createCoupon} className="flex flex-wrap gap-3">
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CODE" className="input-field flex-1 min-w-[120px] uppercase" />
                <select value={type} onChange={(e) => setType(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl text-white font-dm text-sm px-3">
                  <option value="percent" style={{ backgroundColor: "#0d2248", color: "#fff" }}>% off</option>
                  <option value="fixed" style={{ backgroundColor: "#0d2248", color: "#fff" }}>₦ off</option>
                </select>
                <input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value" className="input-field w-28" />
                <button type="submit" disabled={creating} className="btn-primary !w-auto px-5 flex items-center gap-2 disabled:opacity-60">
                  <FiPlusCircle size={15} /> Create
                </button>
              </form>
              <p className="text-white/30 font-dm text-xs mt-3">
                Redeemable on bank transfers and electricity bills — capped at that transaction's fee, so a
                coupon can never cost more than Abopay's own margin. Not applicable to airtime, data, or
                cable, which price off the buying/selling catalog (Admin → Pricing Catalog) instead of an
                added fee. One redemption per user per code.
              </p>
            </div>
            {couponsLoading ? (
              <div className="card-glass p-8 text-center text-white/35 font-dm text-sm">Loading coupons...</div>
            ) : (
              <div className="card-glass overflow-hidden">
                {coupons.length === 0 ? (
                  <div className="p-8 text-center text-white/35 font-dm text-sm">No coupons yet.</div>
                ) : coupons.map((c, i) => (
                  <div key={c.id} className={`flex items-center justify-between p-4 ${i < coupons.length - 1 ? "border-b border-white/5" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-secondary/15 border border-secondary/20 flex items-center justify-center"><FiTag size={13} className="text-secondary" /></div>
                      <div>
                        <p className="text-white font-dm text-sm font-medium">{c.code}</p>
                        <p className="text-white/35 font-dm text-xs">{c.type === "percent" ? `${c.value}% off` : `₦${c.value} off`} · used {c.usedCount || 0}x</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-dm px-2 py-0.5 rounded-full border ${c.active ? "bg-secondary/15 text-secondary border-secondary/25" : "bg-white/5 text-white/40 border-white/10"}`} onClick={() => toggleCoupon(c.id)} role="button">
                        {c.active ? "Active" : "Inactive"}
                      </span>
                      <button onClick={() => deleteCoupon(c.id)} className="text-white/30 hover:text-red-400"><FiX size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 1 && (
          <>
            <div className="card-glass p-5 mb-6">
              <p className="text-white font-syne font-semibold text-sm mb-3">Broadcast Notification</p>
              <p className="text-white/30 font-dm text-xs mb-3">
                In-app only — appears wherever the customer app reads the `notifications` collection.
                This does not send push notifications or emails; that needs FCM/an ESP wired in separately.
              </p>
              <form onSubmit={sendNotification} className="flex flex-col gap-3">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="input-field" />
                <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" className="input-field min-h-[70px] resize-none" />
                <button type="submit" disabled={sending} className="btn-primary flex items-center justify-center gap-2 disabled:opacity-60">
                  <FiSend size={14} /> {sending ? "Sending..." : "Send to All Users"}
                </button>
              </form>
            </div>
            {!notifLoading && (
              <div className="card-glass overflow-hidden">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-white/35 font-dm text-sm">Nothing sent yet.</div>
                ) : notifications.map((n, i) => (
                  <div key={n.id} className={`p-4 ${i < notifications.length - 1 ? "border-b border-white/5" : ""}`}>
                    <p className="text-white font-dm text-sm font-medium">{n.title}</p>
                    <p className="text-white/40 font-dm text-xs mt-0.5">{n.body}</p>
                    <p className="text-white/25 font-dm text-[11px] mt-1">{formatDate(n.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 2 && (
          <div className="card-glass p-8 text-center">
            <FiGift className="text-white/20 mx-auto mb-3" size={28} />
            <p className="text-white/50 font-dm text-sm mb-2">No referral system exists yet</p>
            <p className="text-white/30 font-dm text-xs max-w-sm mx-auto">
              Signup doesn't capture a referral code today, so there's nothing to manage here yet. This
              needs: a referral code per user, a "referredBy" field captured at signup, and a rewards
              rule (e.g. credit both accounts after the referred user's first deposit) — happy to build
              that when you're ready.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminMarketing;
