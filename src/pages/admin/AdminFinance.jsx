import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../api";
import { formatNaira, formatDate } from "../../utils/helpers";
import { FiAlertCircle, FiPlusCircle, FiTrendingUp, FiTrendingDown } from "react-icons/fi";

const TABS = ["Sales Stats", "Profit & Loss", "API Wallet"];

const MiniBarChart = ({ series }) => {
  const max = Math.max(1, ...series.map((s) => Math.max(s.credit, s.debit)));
  return (
    <div className="flex items-end gap-1 h-32 mt-4">
      {series.map((s) => (
        <div key={s.date} className="flex-1 flex flex-col items-center gap-0.5" title={`${s.date}: +${formatNaira(s.credit)} / -${formatNaira(s.debit)}`}>
          <div className="w-full flex flex-col-reverse gap-0.5 h-28">
            <div className="w-full bg-secondary/70 rounded-t-sm" style={{ height: `${(s.credit / max) * 100}%`, minHeight: s.credit ? 2 : 0 }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const AdminFinance = () => {
  const [tab, setTab] = useState(0);
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const loadFinance = async () => {
    setLoading(true);
    setError("");
    try {
      const d = await api.get(`/admin/finance?days=${days}`);
      setData(d);
    } catch (err) {
      setError(err.message || "Failed to load finance data.");
    }
    setLoading(false);
  };

  const loadWallet = async () => {
    try {
      const w = await api.get("/admin/api-wallet");
      setWallet(w);
    } catch (err) {
      setWallet({ errors: [err.message || "Failed to check provider balances."] });
    }
  };

  useEffect(() => { loadFinance(); }, [days]);
  useEffect(() => { if (tab === 2 && !wallet) loadWallet(); }, [tab]);

  const logExpense = async (e) => {
    e.preventDefault();
    if (!label.trim() || !amount) return;
    setSaving(true);
    try {
      await api.post("/admin/expenses", { label: label.trim(), amount: Number(amount) });
      setLabel("");
      setAmount("");
      loadFinance();
    } catch (err) {
      setError(err.message || "Failed to log expense.");
    }
    setSaving(false);
  };

  return (
    <AdminLayout>
      <div className="p-5 lg:p-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="font-syne font-bold text-white text-2xl">Finance</h1>
          <p className="text-white/40 font-dm text-sm mt-1">Sales stats, profit & loss, and provider balances</p>
        </div>

        <div className="flex gap-2 mb-6">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} className={`px-4 py-2 rounded-xl font-dm text-sm border transition-colors ${tab === i ? "bg-secondary/15 text-secondary border-secondary/25" : "text-white/50 border-white/10 hover:text-white"}`}>
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

        {loading ? (
          <div className="card-glass p-8 text-center text-white/35 font-dm text-sm">Loading...</div>
        ) : tab === 0 ? (
          <div className="card-glass p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/50 font-dm text-sm">Transaction volume — last {days} days</p>
              <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="bg-white/5 border border-white/10 rounded-lg text-white/70 font-dm text-xs px-2 py-1">
                <option value={7} style={{ backgroundColor: "#0d2248", color: "#fff" }}>7 days</option>
                <option value={30} style={{ backgroundColor: "#0d2248", color: "#fff" }}>30 days</option>
                <option value={90} style={{ backgroundColor: "#0d2248", color: "#fff" }}>90 days</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 mb-2">
              <div><p className="text-white/35 font-dm text-[11px] uppercase mb-1">Credit Volume</p><p className="text-secondary font-syne font-bold">{formatNaira(data.totals.totalCreditVolume)}</p></div>
              <div><p className="text-white/35 font-dm text-[11px] uppercase mb-1">Debit Volume</p><p className="text-red-400 font-syne font-bold">{formatNaira(data.totals.totalDebitVolume)}</p></div>
              <div><p className="text-white/35 font-dm text-[11px] uppercase mb-1">Transactions</p><p className="text-white font-syne font-bold">{data.totals.totalCount}</p></div>
            </div>
            <MiniBarChart series={data.series} />
          </div>
        ) : tab === 1 ? (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="card-glass p-4">
                <div className="flex items-center gap-1.5 text-secondary mb-1"><FiTrendingUp size={13} /><p className="font-dm text-[11px] uppercase">Revenue</p></div>
                <p className="text-white font-syne font-bold text-sm">{formatNaira(data.totals.totalCreditVolume)}</p>
              </div>
              <div className="card-glass p-4">
                <div className="flex items-center gap-1.5 text-red-400 mb-1"><FiTrendingDown size={13} /><p className="font-dm text-[11px] uppercase">Expenses</p></div>
                <p className="text-white font-syne font-bold text-sm">{formatNaira(data.totals.totalExpenses)}</p>
              </div>
              <div className="card-glass p-4">
                <p className="text-white/35 font-dm text-[11px] uppercase mb-1">Net (est.)</p>
                <p className={`font-syne font-bold text-sm ${data.totals.netProfit >= 0 ? "text-secondary" : "text-red-400"}`}>{formatNaira(data.totals.netProfit)}</p>
              </div>
            </div>
            <div className="card-glass p-4 mb-4">
              <p className="text-white/35 font-dm text-[11px] uppercase mb-1">Real Margin</p>
              <p className={`font-syne font-bold text-lg ${data.totals.totalMargin >= 0 ? "text-secondary" : "text-red-400"}`}>{formatNaira(data.totals.totalMargin)}</p>
              <p className="text-white/30 font-dm text-[11px] mt-1">
                Sum of actual recorded profit per transaction (Pricing Catalog margin on airtime/data/cable,
                fee minus coupon discount on transfers/bills), minus expenses. More accurate than "Net
                (est.)" below, but only as complete as what each purchase route records — deposits and
                wallet transfers correctly contribute nothing here, they're not revenue.
              </p>
            </div>
            <p className="text-white/30 font-dm text-xs mb-4">
              "Net (est.)" is a rough estimate (transaction volume minus logged expenses), not real
              accounting — treat it directionally, "Real Margin" above is the accurate figure.
            </p>
            <div className="card-glass p-5 mb-6">
              <p className="text-white font-syne font-semibold text-sm mb-3">Log an expense</p>
              <form onSubmit={logExpense} className="flex gap-3">
                <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Vercel hosting" className="input-field flex-1" />
                <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (₦)" className="input-field w-40" />
                <button type="submit" disabled={saving} className="btn-primary !w-auto px-5 flex items-center gap-2 disabled:opacity-60">
                  <FiPlusCircle size={15} /> Add
                </button>
              </form>
            </div>
            <div className="card-glass overflow-hidden">
              {data.expenses.length === 0 ? (
                <div className="p-8 text-center text-white/35 font-dm text-sm">No expenses logged in this window.</div>
              ) : (
                data.expenses.map((ex, i) => (
                  <div key={ex.id} className={`flex items-center justify-between p-4 ${i < data.expenses.length - 1 ? "border-b border-white/5" : ""}`}>
                    <div>
                      <p className="text-white font-dm text-sm">{ex.label}</p>
                      <p className="text-white/35 font-dm text-xs">{formatDate(ex.date)}</p>
                    </div>
                    <p className="text-red-400 font-syne font-semibold text-sm">-{formatNaira(ex.amount)}</p>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="card-glass p-6">
            {!wallet ? (
              <p className="text-white/35 font-dm text-sm">Checking provider balances...</p>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-white/35 font-dm text-[11px] uppercase mb-1">VTpass Balance</p>
                    <p className="text-white font-syne font-bold text-lg">{wallet.vtpass ? formatNaira(wallet.vtpass.balance) : "—"}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-white/35 font-dm text-[11px] uppercase mb-1">Paystack Balance</p>
                    {wallet.paystack ? wallet.paystack.map((b) => (
                      <p key={b.currency} className="text-white font-syne font-bold text-lg">{b.currency} {b.balance.toLocaleString()}</p>
                    )) : <p className="text-white font-syne font-bold text-lg">—</p>}
                  </div>
                </div>
                {wallet.errors?.length > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
                    {wallet.errors.map((e, i) => <p key={i} className="text-yellow-400 font-dm text-xs">{e}</p>)}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminFinance;
