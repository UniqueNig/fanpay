import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { api } from "../api";
import { RECHARGE_NETWORKS, BILL_TYPES, formatNaira } from "../utils/helpers";
import { FiLoader } from "react-icons/fi";

const CABLE_PROVIDERS = ["DSTV", "GOtv", "StarTimes"];
const TABS = ["Data Plans", "Airtime", "Cable TV", "Electricity"];

const DataTab = () => {
  const [network, setNetwork] = useState(RECHARGE_NETWORKS[0]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planType, setPlanType] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/vtu/data-plans/${network.id}`)
      .then((res) => {
        const rows = res?.content?.varations || [];
        setPlans(rows);
        setPlanType(rows[0]?.plan_type || null);
      })
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, [network]);

  const planTypes = [...new Set(plans.map((p) => p.plan_type).filter(Boolean))];
  const visible = planType ? plans.filter((p) => p.plan_type === planType) : plans;

  return (
    <>
      <div className="flex gap-2 mb-4 flex-wrap">
        {RECHARGE_NETWORKS.map((n) => (
          <button key={n.id} onClick={() => setNetwork(n)}
            className={`px-3.5 py-1.5 rounded-lg font-dm text-xs font-semibold border transition-colors ${
              network.id === n.id ? "text-panel" : "bg-surface border-line text-ink/60 hover:text-ink"
            }`}
            style={network.id === n.id ? { backgroundColor: n.color, borderColor: n.color } : {}}>
            {n.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-ink/40 font-dm text-sm py-8 justify-center">
          <FiLoader size={15} className="animate-spin" /> Loading plans...
        </div>
      ) : (
        <>
          {planTypes.length > 1 && (
            <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
              {planTypes.map((pt) => (
                <button key={pt} onClick={() => setPlanType(pt)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full font-dm text-xs font-semibold border whitespace-nowrap transition-colors ${
                    planType === pt ? "bg-ink text-panel border-ink" : "bg-surface border-line text-ink/60 hover:text-ink"
                  }`}>
                  {pt}
                </button>
              ))}
            </div>
          )}
          <div className="card-flat overflow-hidden">
            {visible.map((p, i) => (
              <div key={p.variation_code} className={`flex items-center justify-between px-4 py-3 ${i < visible.length - 1 ? "border-b border-line" : ""}`}>
                <div>
                  <p className="text-ink font-syne font-semibold text-sm">{p.size || p.name}</p>
                  {p.validity && <p className="text-ink/40 font-dm text-xs">{p.validity}</p>}
                </div>
                <p className="text-ink font-syne font-bold text-sm">{formatNaira(parseFloat(p.variation_amount))}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
};

const CableTab = () => {
  const [provider, setProvider] = useState(CABLE_PROVIDERS[0]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/vtu/cable-plans/${provider}`)
      .then((res) => setPlans(res?.content?.varations || []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, [provider]);

  return (
    <>
      <div className="flex gap-2 mb-4">
        {CABLE_PROVIDERS.map((p) => (
          <button key={p} onClick={() => setProvider(p)}
            className={`px-3.5 py-1.5 rounded-lg font-dm text-xs font-semibold border transition-colors ${
              provider === p ? "bg-iris/15 text-iris border-iris/30" : "bg-surface border-line text-ink/60 hover:text-ink"
            }`}>
            {p}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-ink/40 font-dm text-sm py-8 justify-center">
          <FiLoader size={15} className="animate-spin" /> Loading bouquets...
        </div>
      ) : (
        <div className="card-flat overflow-hidden">
          {plans.map((p, i) => (
            <div key={p.variation_code} className={`flex items-center justify-between px-4 py-3 ${i < plans.length - 1 ? "border-b border-line" : ""}`}>
              <p className="text-ink font-dm text-sm">{p.name}</p>
              <p className="text-ink font-syne font-bold text-sm">{formatNaira(parseFloat(p.variation_amount))}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

const AirtimeTab = () => {
  const [rates, setRates] = useState(null);

  useEffect(() => {
    api.get("/pricing").then((res) => setRates(res.pricing?.airtimeRates || {})).catch(() => setRates({}));
  }, []);

  return (
    <div className="card-flat overflow-hidden">
      {!rates ? (
        <div className="flex items-center gap-2 text-ink/40 font-dm text-sm py-8 justify-center">
          <FiLoader size={15} className="animate-spin" /> Loading rates...
        </div>
      ) : (
        RECHARGE_NETWORKS.map((n, i) => {
          const percent = rates[n.id] ?? 100;
          return (
            <div key={n.id} className={`flex items-center justify-between px-4 py-3.5 ${i < RECHARGE_NETWORKS.length - 1 ? "border-b border-line" : ""}`}>
              <p className="font-syne font-bold text-sm" style={{ color: n.color }}>{n.label}</p>
              <p className="text-ink/60 font-dm text-sm">Pay {formatNaira(percent)} per ₦100 top-up</p>
            </div>
          );
        })
      )}
    </div>
  );
};

const ElectricityTab = () => {
  const [fee, setFee] = useState(null);
  const discos = BILL_TYPES.find((b) => b.id === "electricity")?.providers || [];

  useEffect(() => {
    api.get("/pricing").then((res) => setFee(res.pricing?.billFeeFlat ?? 0)).catch(() => setFee(0));
  }, []);

  return (
    <div className="card-flat p-5">
      <p className="text-ink font-dm text-sm mb-1">
        Pay any amount to any supported disco — a flat fee of{" "}
        <span className="font-syne font-bold">{fee != null ? formatNaira(fee) : "…"}</span> is added on top.
      </p>
      <p className="text-ink/40 font-dm text-xs mb-4">Supported discos:</p>
      <div className="flex flex-wrap gap-2">
        {discos.map((d) => (
          <span key={d} className="bg-surface border border-line rounded-lg px-3 py-1.5 text-ink font-dm text-xs">{d}</span>
        ))}
      </div>
    </div>
  );
};

const Pricing = () => {
  const [tab, setTab] = useState(0);

  return (
    <DashboardLayout>
      <div className="p-5 lg:p-8 max-w-2xl">
        <div className="mb-7">
          <h1 className="font-syne font-bold text-ink text-2xl">Pricing</h1>
          <p className="text-ink/40 font-dm text-sm mt-1">What everything costs — updated live</p>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`shrink-0 px-4 py-2 rounded-xl font-dm text-sm border transition-colors ${
                tab === i ? "bg-iris/15 text-iris border-iris/30" : "text-ink/50 border-line hover:text-ink"
              }`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 0 && <DataTab />}
        {tab === 1 && <AirtimeTab />}
        {tab === 2 && <CableTab />}
        {tab === 3 && <ElectricityTab />}
      </div>
    </DashboardLayout>
  );
};

export default Pricing;
