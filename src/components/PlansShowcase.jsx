import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { publicGet } from "../api";
import { formatNaira } from "../utils/helpers";
import { FiArrowRight } from "react-icons/fi";

const NETWORK_LABEL = { mtn: "MTN", airtel: "Airtel", glo: "Glo", "9mobile": "9mobile" };
const NETWORK_COLOR = { mtn: "text-gold", airtel: "text-red-400", glo: "text-naira", "9mobile": "text-blue-400" };

// Real prices, fetched live from the same catalog the app itself purchases
// from (routes/pricing.js's /public-teaser) — not a hardcoded/stale table
// that'd drift from what a signed-in user actually gets charged.
const PlansShowcase = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    publicGet("/pricing/public-teaser")
      .then(setData)
      .catch(() => setError(true));
  }, []);

  if (error) return null; // quietly skip the section rather than show broken pricing

  return (
    <section className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-iris font-dm text-sm font-medium tracking-widest uppercase">
            Real Prices
          </span>
          <h2 className="section-title mt-3 mb-4">
            Data Plans, <span className="text-gradient">At a Glance</span>
          </h2>
          <p className="section-sub max-w-lg mx-auto">
            A sample of what's on offer — sign in to see every plan and airtime rate.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Object.keys(NETWORK_LABEL).map((network) => (
            <div key={network} className="card-flat p-5">
              <h3 className={`font-syne font-bold text-base mb-4 ${NETWORK_COLOR[network]}`}>
                {NETWORK_LABEL[network]}
              </h3>
              <div className="flex flex-col gap-3 mb-4">
                {!data ? (
                  <>
                    <div className="h-10 rounded-lg bg-surface animate-pulse" />
                    <div className="h-10 rounded-lg bg-surface animate-pulse" />
                  </>
                ) : (
                  data.dataPlans?.[network]?.map((plan, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-line pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="text-ink font-dm text-sm font-medium">{plan.size}</p>
                        {plan.validity && <p className="text-ink/35 font-dm text-[11px]">{plan.validity}</p>}
                      </div>
                      <p className="text-iris font-syne font-bold text-sm">{formatNaira(plan.price)}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-line">
                <span className="text-ink/40 font-dm text-xs">Airtime rate</span>
                <span className="text-ink/70 font-dm text-xs">
                  {data ? `${data.airtimeRates?.[network]}%` : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link to="/signup" className="btn-outline-iris inline-flex items-center gap-2 !w-auto px-6">
            See Full Pricing <FiArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PlansShowcase;
