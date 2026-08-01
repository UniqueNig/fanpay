import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import PinConfirmModal from "../components/PinConfirmModal";
import UssdCodes from "../components/UssdCodes";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { RECHARGE_NETWORKS, RECHARGE_AMOUNTS, formatNaira } from "../utils/helpers";
import { FiCheckCircle, FiAlertCircle, FiLoader } from "react-icons/fi";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

const Recharge = () => {
  const { user, userData, fetchUserData } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [network, setNetwork] = useState(null);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  // Preset via ?type=airtime|data — the Dashboard/Sidebar link straight into
  // one or the other instead of always landing on airtime and making the
  // user click again.
  const [type, setType] = useState(searchParams.get("type") === "data" ? "data" : "airtime");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dataPlans, setDataPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planType, setPlanType] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pricing, setPricing] = useState(null);
  const [extraNetworks, setExtraNetworks] = useState([]);
  const balance = userData?.balance ?? 0;

  useEffect(() => {
    api.get("/pricing").then((res) => setPricing(res.pricing)).catch(() => {});
  }, []);

  // Admin-added networks (e.g. a data-only ISP like Smile) beyond the
  // hardcoded 4 — fetched per type, since a data-only network shouldn't
  // show up under Airtime.
  useEffect(() => {
    api.get(`/networks/${type}`).then((res) => setExtraNetworks(res.networks || [])).catch(() => setExtraNetworks([]));
  }, [type]);

  const networks = [...RECHARGE_NETWORKS, ...extraNetworks];

  // Switching type can leave a data-only network selected while looking at
  // Airtime (or vice versa) — clear it rather than show a stale selection
  // for a network that isn't actually offered under the new type.
  useEffect(() => {
    if (network && !networks.some((n) => n.id === network.id)) setNetwork(null);
  }, [type, extraNetworks]);

  // Data bundles have fixed Maskawasub-defined prices, so the "amount" for a
  // data purchase comes from whichever plan was picked — and the plans
  // endpoint already returns the admin's real selling price, not
  // Maskawasub's wholesale cost, so no client-side math is needed for data.
  const finalAmount = type === "data"
    ? parseFloat(selectedPlan?.variation_amount || 0)
    : amount === "custom" ? parseFloat(customAmount) : parseFloat(amount);

  // Airtime prices per-network via the admin's Pricing Catalog (a percent of
  // face value, since airtime has no fixed "plan") — subtracted from what
  // the customer pays, never added on top, since Maskawasub sells airtime to
  // resellers below face value.
  const sellingPercent = type === "airtime" ? pricing?.airtimeRates?.[network?.id] ?? 100 : 100;
  const totalAmount = type === "airtime" ? finalAmount * (sellingPercent / 100) : finalAmount;
  const discount = Math.max(0, finalAmount - totalAmount);

  // Real Maskawasub plan ids must be fetched per network — a guessed code
  // doesn't match anything Maskawasub actually offers.
  useEffect(() => {
    if (type !== "data" || !network) {
      setDataPlans([]);
      setSelectedPlan(null);
      setPlanType(null);
      return;
    }
    setPlansLoading(true);
    setPlansError("");
    setSelectedPlan(null);
    api
      .get(`/vtu/data-plans/${network.id}`)
      .then((res) => {
        const plans = res?.content?.varations || [];
        setDataPlans(plans);
        setPlanType(plans[0]?.plan_type || null);
      })
      .catch(() => setPlansError("Could not load data plans. Try again."))
      .finally(() => setPlansLoading(false));
  }, [type, network]);

  // Distinct plan types this network actually offers (SME, GIFTING,
  // CORPORATE GIFTING, etc) — order of first appearance, not alphabetical,
  // so the most common ones (usually SME) land first.
  const planTypes = [...new Set(dataPlans.map((p) => p.plan_type).filter(Boolean))];
  const visiblePlans = planType ? dataPlans.filter((p) => p.plan_type === planType) : dataPlans;

  const handlePayClick = (e) => {
    e.preventDefault();
    setError("");
    if (!network || !phone || !finalAmount) return;
    if (type === "data" && !selectedPlan) return;
    if (totalAmount > balance) {
      setError("Insufficient balance. Please deposit more funds.");
      return;
    }

    if (!userData?.hasPin) {
      navigate("/set-pin", { state: { returnTo: "/recharge" } });
      return;
    }
    setPinError("");
    setShowPinModal(true);
  };

  const handlePinConfirm = async (pin) => {
    setLoading(true);
    setPinError("");
    try {
      const path = type === "airtime" ? "/vtu/airtime" : "/vtu/data";

      const payload = type === "airtime"
        ? { network: network.id, phone, amount: finalAmount, pin }
        : { network: network.id, phone, variationCode: selectedPlan.variation_code, pin };

      await api.post(path, payload);
      await fetchUserData(user.uid);
      setShowPinModal(false);
      setSuccess(true);
    } catch (err) {
      console.error("Recharge error:", err);
      setPinError(err.message?.includes("Insufficient")
        ? "Insufficient balance. Please deposit more funds."
        : err.message || "Recharge failed. Please try again.");
    }
    setLoading(false);
  };

  const reset = () => {
    setSuccess(false); setNetwork(null); setPhone("");
    setAmount(""); setCustomAmount(""); setError("");
    setSelectedPlan(null); setDataPlans([]); setPlanType(null);
  };

  const pinSummary = type === "airtime"
    ? [
        { label: "Network", value: network?.label },
        { label: "Phone Number", value: phone },
      ]
    : [
        { label: "Network", value: network?.label },
        { label: "Recipient Mobile", value: phone },
        { label: "Data Bundle", value: selectedPlan?.size || selectedPlan?.name },
        { label: "Plan Type", value: selectedPlan?.plan_type },
        { label: "Validity", value: selectedPlan?.validity },
      ].filter((row) => row.value);

  return (
    <DashboardLayout>
      <div className="p-5 lg:p-8 max-w-lg">
        <div className="mb-7">
          <h1 className="font-syne font-bold text-ink text-2xl">Buy Airtime & Data</h1>
          <p className="text-ink/40 font-dm text-sm mt-1">Recharge any Nigerian network instantly</p>
        </div>

        {success ? (
          <div className="card-flat p-10 flex flex-col items-center text-center gap-5">
            <div className="w-20 h-20 rounded-full flex items-center justify-center border-2"
              style={{ backgroundColor: network?.color + "20", borderColor: network?.color + "50" }}>
              <FiCheckCircle size={36} style={{ color: network?.color }} />
            </div>
            <div>
              <h2 className="font-syne font-bold text-ink text-xl mb-2">
                {type === "airtime" ? "Airtime" : "Data"} Delivered!
              </h2>
              <p className="text-ink/60 font-dm text-sm">
                <span className="font-bold" style={{ color: network?.color }}>{formatNaira(finalAmount)}</span>{" "}
                {type} sent to {phone} · {network?.label}
              </p>
            </div>
            <div className="w-full bg-surface border border-line rounded-2xl px-5 py-4 flex justify-between">
              <span className="text-ink/50 font-dm text-sm">Remaining Balance</span>
              <span className="text-ink font-syne font-bold">{formatNaira(userData?.balance ?? 0)}</span>
            </div>
            <button onClick={reset} className="btn-iris w-full">Recharge Again</button>
          </div>
        ) : (
          <div className="card-flat p-6">
            {/* Balance */}
            <div className={`${balance === 0 ? "bg-red-500/8 border-red-500/20" : "bg-gold/8 border-gold/20"} border rounded-2xl px-5 py-4 mb-5 flex items-center justify-between`}>
              <div>
                <p className="text-ink/50 font-dm text-xs uppercase tracking-wider mb-1">Wallet Balance</p>
                <p className={`font-syne font-bold text-xl ${balance === 0 ? "text-red-400" : "text-gold"}`}>{formatNaira(balance)}</p>
              </div>
              {balance === 0 && (
                <Link to="/deposit" className="text-iris font-dm text-xs border border-iris/30 rounded-xl px-3 py-1.5 hover:bg-iris/10 transition-colors">Add funds →</Link>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 mb-4">
                <FiAlertCircle size={15} className="text-red-400 flex-shrink-0" />
                <p className="text-red-400 font-dm text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handlePayClick} className="flex flex-col gap-5">
              {/* Type */}
              <div>
                <label className="text-ink/80 font-dm text-sm font-medium mb-2 block">Type</label>
                <div className="flex gap-2">
                  {["airtime", "data"].map((t) => (
                    <button key={t} type="button"
                      onClick={() => { setType(t); setAmount(""); setCustomAmount(""); setSelectedPlan(null); }}
                      className={`flex-1 py-3 rounded-xl font-dm text-sm font-semibold capitalize transition-all duration-200 border ${
                        type === t ? "bg-gold/15 border-gold/40 text-gold" : "bg-surface border-line text-ink/60 hover:text-ink hover:border-iris/30"
                      }`}>
                      {t === "airtime" ? "📱 Airtime" : "📶 Data"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Network */}
              <div>
                <label className="text-ink/80 font-dm text-sm font-medium mb-2 block">Select Network</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {networks.map((n) => (
                    <button key={n.id} type="button" onClick={() => setNetwork(n)}
                      className={`py-4 px-3 rounded-xl font-syne font-bold text-base border-2 transition-all duration-200 ${
                        network?.id === n.id ? "scale-105" : "border-line bg-surface hover:bg-line text-ink/55"}`}
                      style={network?.id === n.id
                        ? { color: n.color, borderColor: n.color + "80", backgroundColor: n.color + "15", boxShadow: `0 0 16px ${n.color}25` }
                        : undefined}>
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="text-ink/80 font-dm text-sm font-medium mb-2 block">Phone Number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="input-field-light text-base" placeholder="08012345678" maxLength={11} required />
              </div>

              {/* Amount presets (airtime) / real Maskawasub plans (data) */}
              {type === "airtime" ? (
                <div>
                  <label className="text-ink/80 font-dm text-sm font-medium mb-2 block">Amount (₦)</label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {RECHARGE_AMOUNTS.map((a) => (
                      <button key={a} type="button"
                        onClick={() => { setAmount(String(a)); setCustomAmount(""); }}
                        className={`py-3 rounded-xl font-dm text-sm font-semibold border transition-all duration-200 ${
                          amount === String(a)
                            ? "bg-iris text-accent-ink border-iris shadow-lg shadow-iris/20"
                            : "bg-surface border-line text-ink/75 hover:bg-line hover:border-iris/30 hover:text-ink"
                        }`}>
                        ₦{a.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <input type="number" value={customAmount}
                    onChange={(e) => { setCustomAmount(e.target.value); setAmount("custom"); }}
                    className="input-field-light text-base" placeholder="Or enter custom amount" min="50" />
                </div>
              ) : (
                <div>
                  <label className="text-ink/80 font-dm text-sm font-medium mb-2 block">Select Data Plan</label>
                  {!network ? (
                    <p className="text-ink/40 font-dm text-sm">Select a network first</p>
                  ) : plansLoading ? (
                    <div className="flex items-center gap-2 text-ink/40 font-dm text-sm py-4">
                      <FiLoader size={15} className="animate-spin" /> Loading plans...
                    </div>
                  ) : plansError ? (
                    <p className="text-red-400 font-dm text-sm">{plansError}</p>
                  ) : dataPlans.length === 0 ? (
                    <p className="text-ink/40 font-dm text-sm">No plans available for this network right now.</p>
                  ) : (
                    <>
                      {planTypes.length > 1 && (
                        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 -mx-1 px-1">
                          {planTypes.map((pt) => (
                            <button key={pt} type="button" onClick={() => setPlanType(pt)}
                              className={`shrink-0 px-3.5 py-1.5 rounded-full font-dm text-xs font-semibold border whitespace-nowrap transition-colors ${
                                planType === pt ? "bg-ink text-panel border-ink" : "bg-surface border-line text-ink/60 hover:text-ink"
                              }`}>
                              {pt}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                        {visiblePlans.map((plan) => (
                          <button key={plan.variation_code} type="button"
                            onClick={() => setSelectedPlan(plan)}
                            className={`flex flex-col items-start gap-0.5 px-3.5 py-3 rounded-xl border font-dm text-sm text-left transition-all duration-200 ${
                              selectedPlan?.variation_code === plan.variation_code
                                ? "bg-gold/15 border-gold/40"
                                : "bg-surface border-line hover:bg-line hover:border-iris/30"
                            }`}>
                            <span className="font-syne font-bold text-ink text-base">{plan.size || plan.name}</span>
                            {plan.validity && <span className="text-ink/40 text-xs">{plan.validity}</span>}
                            <span className={`font-syne font-bold text-sm mt-1 ${selectedPlan?.variation_code === plan.variation_code ? "text-gold" : "text-ink"}`}>
                              {formatNaira(parseFloat(plan.variation_amount))}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {discount > 0 && (
                <p className="text-iris font-dm text-xs -mt-2">
                  {formatNaira(discount)} off face value · You pay {formatNaira(totalAmount)}
                </p>
              )}

              <button type="submit"
                disabled={loading || !network || !phone || !finalAmount || totalAmount > balance || (type === "data" && !selectedPlan)}
                className="btn-iris flex items-center justify-center gap-2 py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? "Processing..." : `Pay ${finalAmount ? formatNaira(totalAmount) : ""} from Wallet`}
              </button>

              <p className="text-ink/30 font-dm text-xs text-center">
                Delivered instantly · Charged from your wallet balance
              </p>
            </form>
          </div>
        )}

        <UssdCodes />

        {showPinModal && (
          <PinConfirmModal
            title="Confirm Purchase"
            amount={totalAmount}
            summary={pinSummary}
            balance={balance}
            onConfirm={handlePinConfirm}
            onClose={() => { setShowPinModal(false); setPinError(""); }}
            submitting={loading}
            error={pinError}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Recharge;
