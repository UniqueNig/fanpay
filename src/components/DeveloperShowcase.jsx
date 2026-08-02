import React from "react";
import { Link } from "react-router-dom";
import { FiCode, FiArrowRight } from "react-icons/fi";

const SNIPPET = `POST https://fanpay-api-iti0.onrender.com/api/v1/airtime
X-Api-Key: fk_sandbox_...
Content-Type: application/json

{
  "network": "mtn",
  "phone": "08012345678",
  "amount": 500
}

200 OK
{ "success": true, "reference": "AIR-1785...", "amountCharged": 500 }`;

const DeveloperShowcase = () => (
  <section id="developer-api" className="py-24 relative">
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-iris/3 to-transparent pointer-events-none" />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="text-iris font-dm text-sm font-medium tracking-widest uppercase">Developer API</span>
          <h2 className="section-title mt-3 mb-4">
            Build airtime & data<br /><span className="text-gradient">into your own app</span>
          </h2>
          <p className="text-ink/50 font-dm text-sm leading-relaxed mb-6 max-w-md">
            Get an API key and call FanFi directly from your own product — a WhatsApp bot, a reseller
            dashboard, anything. Start in sandbox with realistic simulated responses and no approval needed;
            move to live when you're ready, billed against your own FanFi wallet balance.
          </p>
          <ul className="flex flex-col gap-2.5 mb-8">
            {[
              "Sandbox keys work instantly — no approval required to start testing",
              "Live keys bill your existing wallet — no separate balance to fund",
              "Simple key-based auth, JSON in and out, real error codes",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-ink/60 font-dm text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-iris mt-1.5 shrink-0" />
                {line}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Link to="/developer" className="btn-iris !w-auto px-5 py-2.5 text-sm flex items-center gap-2">
              Get API Access <FiArrowRight size={14} />
            </Link>
            <Link to="/developer/docs" className="btn-outline-iris !w-auto px-5 py-2.5 text-sm flex items-center gap-2">
              <FiCode size={14} /> Read the Docs
            </Link>
          </div>
        </div>

        <div className="relative bg-surface border border-line rounded-2xl overflow-hidden shadow-xl">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-line bg-ink/[0.02]">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
            <span className="ml-2 text-ink/30 font-dm text-xs">POST /api/v1/airtime</span>
          </div>
          <pre className="p-5 overflow-x-auto font-mono text-xs text-ink/70 leading-relaxed whitespace-pre-wrap">{SNIPPET}</pre>
        </div>
      </div>
    </div>
  </section>
);

export default DeveloperShowcase;
