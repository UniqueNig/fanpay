import React from "react";
import { FiPlusCircle, FiFileText, FiSmartphone, FiLock, FiMessageCircle, FiUserCheck } from "react-icons/fi";

const features = [
  {
    icon: <FiPlusCircle size={22} />,
    title: "Flexible Wallet Funding",
    desc: "Top up by card, bank transfer, or send straight to your own dedicated Paga/PalmPay account number — instant either way.",
    color: "text-iris",
    bg: "bg-iris/10",
  },
  {
    icon: <FiSmartphone size={22} />,
    title: "Airtime & Data",
    desc: "Recharge MTN, Airtel, Glo, and 9mobile for yourself or anyone else, delivered instantly.",
    color: "text-gold",
    bg: "bg-gold/10",
  },
  {
    icon: <FiFileText size={22} />,
    title: "Bill Payments",
    desc: "Pay electricity across all major discos and cable TV subscriptions (DSTV, GOtv, StarTimes) from your wallet.",
    color: "text-naira",
    bg: "bg-naira/10",
  },
  {
    icon: <FiLock size={22} />,
    title: "PIN-Protected Wallet",
    desc: "Every purchase and transaction is confirmed with your own 4-digit transaction PIN — never shared, never guessable in a few tries.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: <FiUserCheck size={22} />,
    title: "Quick Identity Verification",
    desc: "Verify with just your NIN — no paperwork, no long forms, unlocks higher spending limits once approved.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    icon: <FiMessageCircle size={22} />,
    title: "Real Support, Real Fast",
    desc: "Live chat with our team whenever you need help — no ticket queues, no waiting days for a reply.",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
];

const Features = () => (
  <section id="features" className="py-24 relative">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <span className="text-iris font-dm text-sm font-medium tracking-widest uppercase">
          Everything You Need
        </span>
        <h2 className="section-title mt-3 mb-4">
          One Wallet. All Your<br />
          <span className="text-gradient">Everyday Bills</span>
        </h2>
        <p className="section-sub max-w-lg mx-auto">
          FanFi brings airtime, data, and bill payments into one simple wallet.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f, i) => (
          <div key={i} className="feature-card group">
            <div className={`w-11 h-11 rounded-xl ${f.bg} ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
              {f.icon}
            </div>
            <h3 className="font-syne font-semibold text-ink text-base mb-2">{f.title}</h3>
            <p className="font-dm text-ink/50 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
