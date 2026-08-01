import React, { useState } from "react";
import { FiChevronDown } from "react-icons/fi";

const FAQS = [
  {
    q: "How do I fund my wallet?",
    a: "Two ways: pay by card or bank transfer (a small processing fee applies, shown before you confirm), or send money straight to your own dedicated Paga/PalmPay account number — both land in your wallet automatically.",
  },
  {
    q: "How do I buy airtime or data?",
    a: "Sign in, go to Buy Airtime or Buy Data, pick your network and a plan, then confirm with your transaction PIN. It's delivered instantly.",
  },
  {
    q: "Which networks and bills can I pay for?",
    a: "Airtime and data for MTN, Airtel, Glo, and 9mobile. Electricity for every major disco, plus cable TV subscriptions for DSTV, GOtv, and StarTimes.",
  },
  {
    q: "What if my identity isn't verified yet?",
    a: "You can still fund your wallet and make purchases, but unverified accounts have a spending limit on airtime/data/bill purchases. Verifying with your NIN — quick, no paperwork — unlocks higher limits.",
  },
  {
    q: "What happens if a purchase fails?",
    a: "If a purchase can't be completed, your wallet is refunded automatically. You don't need to contact support to get your money back.",
  },
  {
    q: "Can I get help if something goes wrong?",
    a: "Yes — live chat is available right in the app, any time.",
  },
];

const FAQItem = ({ item, open, onClick }) => (
  <div className="card-flat overflow-hidden">
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
    >
      <span className="text-ink font-dm text-sm font-medium">{item.q}</span>
      <FiChevronDown size={16} className={`text-ink/40 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
    </button>
    <div className={`grid transition-all duration-200 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
      <div className="overflow-hidden">
        <p className="text-ink/50 font-dm text-sm leading-relaxed px-5 pb-4">{item.a}</p>
      </div>
    </div>
  </div>
);

const FAQAccordion = () => {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="py-24 relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-iris font-dm text-sm font-medium tracking-widest uppercase">
            Questions
          </span>
          <h2 className="section-title mt-3 mb-4">
            Frequently Asked <span className="text-gradient">Questions</span>
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {FAQS.map((item, i) => (
            <FAQItem
              key={i}
              item={item}
              open={openIndex === i}
              onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQAccordion;
