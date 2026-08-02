import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../api";
import { FiAlertCircle, FiCheck, FiAlertTriangle } from "react-icons/fi";

const TABS = ["System Settings", "Services Control", "Pricing", "KYC Limits"];

const Toggle = ({ on, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${on ? "bg-iris" : "bg-line"}`}
  >
    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${on ? "left-5" : "left-0.5"}`} />
  </button>
);

const AdminSettings = () => {
  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get("/admin/settings");
      setSettings(data.settings);
    } catch (err) {
      setError(err.message || "Failed to load settings.");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (patch) => {
    setSaving(true);
    setSaved(false);
    const next = { ...settings, ...patch };
    setSettings(next);
    try {
      await api.post("/admin/settings", patch);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || "Failed to save.");
    }
    setSaving(false);
  };

  const services = settings?.servicesEnabled || {};
  const pricing = settings?.pricing || {};
  const general = settings?.general || {};
  const kyc = settings?.kyc || {};

  return (
    <AdminLayout>
      <div className="p-5 lg:p-8 max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-syne font-bold text-ink text-2xl">Settings</h1>
            <p className="text-ink/40 font-dm text-sm mt-1">System settings, service toggles, and pricing</p>
          </div>
          {saved && <span className="flex items-center gap-1.5 text-iris font-dm text-xs"><FiCheck size={13} /> Saved</span>}
        </div>

        <div className="flex gap-2 mb-6">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} className={`px-4 py-2 rounded-xl font-dm text-sm border transition-colors ${tab === i ? "bg-iris/15 text-iris border-iris/25" : "text-ink/50 border-line hover:text-ink"}`}>
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

        {loading || !settings ? (
          <div className="card-flat p-8 text-center text-ink/35 font-dm text-sm">Loading settings...</div>
        ) : tab === 0 ? (
          <div className="card-flat p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-ink font-dm text-sm font-medium">Maintenance Mode</p>
                <p className="text-ink/35 font-dm text-xs">Blocks new deposits/transfers app-wide when on</p>
              </div>
              <Toggle on={settings.maintenanceMode} onClick={() => save({ maintenanceMode: !settings.maintenanceMode })} />
            </div>
            {settings.maintenanceMode && (
              <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2.5">
                <FiAlertTriangle className="text-yellow-400 mt-0.5 shrink-0" size={14} />
                <p className="text-yellow-400 font-dm text-xs">
                  Deposits, transfers, and VTU purchases are currently blocked app-wide.
                </p>
              </div>
            )}
            <div>
              <label className="text-ink/60 font-dm text-xs mb-1.5 block">Support Email</label>
              <input className="input-field-light" defaultValue={general.supportEmail} onBlur={(e) => save({ general: { ...general, supportEmail: e.target.value } })} placeholder="support@fanfi.ng" />
            </div>
            <div>
              <label className="text-ink/60 font-dm text-xs mb-1.5 block">Support Phone</label>
              <input className="input-field-light" defaultValue={general.supportPhone} onBlur={(e) => save({ general: { ...general, supportPhone: e.target.value } })} placeholder="+234..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-ink/60 font-dm text-xs mb-1.5 block">Min Transfer (₦)</label>
                <input type="number" className="input-field-light" defaultValue={general.minTransfer} onBlur={(e) => save({ general: { ...general, minTransfer: Number(e.target.value) } })} />
              </div>
              <div>
                <label className="text-ink/60 font-dm text-xs mb-1.5 block">Max Transfer (₦)</label>
                <input type="number" className="input-field-light" defaultValue={general.maxTransfer} onBlur={(e) => save({ general: { ...general, maxTransfer: Number(e.target.value) } })} />
              </div>
            </div>
          </div>
        ) : tab === 1 ? (
          <div className="card-flat p-6 flex flex-col gap-4">
            <p className="text-ink/30 font-dm text-xs mb-1">
              Turning a service off blocks that action for every user immediately.
            </p>
            {Object.entries(services).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between">
                <p className="text-ink font-dm text-sm capitalize">{key}</p>
                <Toggle on={val} onClick={() => save({ servicesEnabled: { ...services, [key]: !val } })} />
              </div>
            ))}
          </div>
        ) : tab === 2 ? (
          <div className="card-flat p-6 flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-ink/60 font-dm text-xs mb-1.5 block">Transfer Fee (flat ₦)</label>
                <input type="number" className="input-field-light" defaultValue={pricing.transferFeeFlat} onBlur={(e) => save({ pricing: { ...pricing, transferFeeFlat: Number(e.target.value) } })} />
              </div>
              <div>
                <label className="text-ink/60 font-dm text-xs mb-1.5 block">Transfer Fee (%)</label>
                <input type="number" step="0.1" className="input-field-light" defaultValue={pricing.transferFeePercent} onBlur={(e) => save({ pricing: { ...pricing, transferFeePercent: Number(e.target.value) } })} />
              </div>
              <div>
                <label className="text-ink/60 font-dm text-xs mb-1.5 block">Bill Payment Fee (flat ₦)</label>
                <input type="number" className="input-field-light" defaultValue={pricing.billFeeFlat} onBlur={(e) => save({ pricing: { ...pricing, billFeeFlat: Number(e.target.value) } })} />
              </div>
              <div>
                <label className="text-ink/60 font-dm text-xs mb-1.5 block">Bill Payment Fee for API Developers (flat ₦)</label>
                <input type="number" className="input-field-light" defaultValue={pricing.apiBillFeeFlat} onBlur={(e) => save({ pricing: { ...pricing, apiBillFeeFlat: Number(e.target.value) } })} />
              </div>
              <div>
                <label className="text-ink/60 font-dm text-xs mb-1.5 block">Paystack Deposit Fee (%)</label>
                <input type="number" step="0.1" className="input-field-light" defaultValue={pricing.paystackDepositFeePercent} onBlur={(e) => save({ pricing: { ...pricing, paystackDepositFeePercent: Number(e.target.value) } })} />
              </div>
              <div>
                <label className="text-ink/60 font-dm text-xs mb-1.5 block">Aspfiy Deposit Fee (%)</label>
                <input type="number" step="0.1" className="input-field-light" defaultValue={pricing.aspfiyDepositFeePercent} onBlur={(e) => save({ pricing: { ...pricing, aspfiyDepositFeePercent: Number(e.target.value) } })} />
              </div>
            </div>
            <p className="text-ink/30 font-dm text-xs">
              Transfer Fee and Bill Payment Fee are charged ON TOP of the amount (customer pays more) —
              coupon codes can discount these, capped so they never cost more than FanFi's own margin.
            </p>
            <p className="text-ink/30 font-dm text-xs">
              Paystack Deposit Fee is also charged ON TOP (customer pays amount + fee, wallet gets exactly
              the amount they asked for). Aspfiy Deposit Fee works the other way — Aspfiy settles a transfer
              minus their own cut with no way to see the exact figure via their API, so this is deducted
              from what actually arrives before crediting the wallet.
            </p>
            <p className="text-ink/30 font-dm text-xs">
              Airtime, data, and cable pricing moved to <strong className="text-ink/50">Admin → Pricing
              Catalog</strong> — buying price vs. selling price per network/plan, since Maskawasub sells those
              below face value rather than charging a flat percentage.
            </p>
          </div>
        ) : (
          <div className="card-flat p-6 flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-ink/60 font-dm text-xs mb-1.5 block">Unverified: Per-Transaction Limit (₦)</label>
                <input type="number" className="input-field-light" defaultValue={kyc.unverifiedPerTransactionLimit} onBlur={(e) => save({ kyc: { ...kyc, unverifiedPerTransactionLimit: Number(e.target.value) } })} />
              </div>
              <div>
                <label className="text-ink/60 font-dm text-xs mb-1.5 block">Unverified: Daily Limit (₦)</label>
                <input type="number" className="input-field-light" defaultValue={kyc.unverifiedDailyLimit} onBlur={(e) => save({ kyc: { ...kyc, unverifiedDailyLimit: Number(e.target.value) } })} />
              </div>
            </div>
            <p className="text-ink/30 font-dm text-xs">
              Applies only to airtime, data, cable, and electricity purchases — deposits and holding a
              balance are never limited. An account with an approved KYC submission is exempt from both
              caps entirely. This is the actual laundering-risk lever: unverified accounts can receive
              money freely, but turning it back into something resellable (airtime especially) is capped
              until identity is verified.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
