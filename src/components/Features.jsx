import React from "react";
import { Link } from "react-router-dom";
import {
  FiSmartphone, FiWifi, FiZap, FiTv, FiBookOpen, FiCode, FiList,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

const WHATSAPP_LINK = "https://wa.me/2348147261388?text=" + encodeURIComponent("Hi, I'd like to place an order.");

// Only what's actually live — no placeholder cards for anything not shipped
// yet (matches the same discipline the rest of the marketing site follows:
// real coverage numbers in Hero.jsx, not usage stats FanFi doesn't have).
const services = [
  { icon: <FiSmartphone size={20} />, title: "Airtime", desc: "MTN, Airtel, Glo, and 9mobile — delivered instantly.", color: "text-iris", bg: "bg-iris/10" },
  { icon: <FiWifi size={20} />, title: "Data", desc: "Affordable data bundles across every major network.", color: "text-gold", bg: "bg-gold/10" },
  { icon: <FiZap size={20} />, title: "Electricity", desc: "Pay electricity bills across all major discos, instantly.", color: "text-naira", bg: "bg-naira/10" },
  { icon: <FiTv size={20} />, title: "Cable TV", desc: "Subscribe to DSTV, GOtv, and StarTimes from your wallet.", color: "text-blue-400", bg: "bg-blue-400/10" },
  { icon: <FiBookOpen size={20} />, title: "Education PINs", desc: "WAEC result checker and JAMB UTME PINs, delivered instantly.", color: "text-accent", bg: "bg-accent/10" },
  { icon: <FiCode size={20} />, title: "Developer API", desc: "Sandbox and live API keys to build FanFi payments into your own app.", color: "text-purple-400", bg: "bg-purple-400/10", to: "/developer" },
  { icon: <FiList size={20} />, title: "Transaction History", desc: "A complete, searchable record of every payment on your wallet.", color: "text-pink-400", bg: "bg-pink-400/10" },
  { icon: <FaWhatsapp size={20} />, title: "WhatsApp Ordering", desc: "Message us on WhatsApp to place an order.", color: "text-green-400", bg: "bg-green-400/10", href: WHATSAPP_LINK },
];

const Features = () => (
  <section id="features" className="py-24 relative">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <span className="text-iris font-dm text-sm font-medium tracking-widest uppercase">
          Everything You Need
        </span>
        <h2 className="section-title mt-3 mb-4">
          One Platform.<br />
          <span className="text-gradient">Every Payment You Need</span>
        </h2>
        <p className="section-sub max-w-lg mx-auto">
          Airtime, data, bills, and developer APIs — all in one secure platform.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {services.map((s, i) => {
          const card = (
            <>
              <div className={`w-11 h-11 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                {s.icon}
              </div>
              <h3 className="font-syne font-semibold text-ink text-base mb-2">{s.title}</h3>
              <p className="font-dm text-ink/50 text-sm leading-relaxed">{s.desc}</p>
            </>
          );
          if (s.to) {
            return <Link key={s.title} to={s.to} className="feature-card group block">{card}</Link>;
          }
          if (s.href) {
            return (
              <a key={s.title} href={s.href} target="_blank" rel="noopener noreferrer" className="feature-card group block">
                {card}
              </a>
            );
          }
          return <div key={s.title} className="feature-card group">{card}</div>;
        })}
      </div>
    </div>
  </section>
);

export default Features;
