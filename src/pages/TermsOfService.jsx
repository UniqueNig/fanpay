import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BackToTop from "../components/BackToTop";
import SEO from "../components/SEO";

const SECTIONS = [
  {
    title: "The service",
    body: "FanFi lets you fund a wallet and use it to buy airtime, data, and pay electricity and cable TV bills. Deliveries are made by our third-party providers — we aim for instant delivery, but occasionally a purchase can take a few minutes to confirm.",
  },
  {
    title: "Your account",
    body: "You're responsible for keeping your login and transaction PIN private. Never share your PIN with anyone, including someone claiming to be FanFi support — we will never ask for it. You're responsible for transactions authorized with your correct PIN.",
  },
  {
    title: "Fees",
    body: "Card and bank transfer deposits carry a processing fee, shown clearly before you confirm. Any fee on a purchase or transfer is also shown up front — you'll never be charged something you weren't shown first.",
  },
  {
    title: "Refunds",
    body: "If a purchase genuinely fails to deliver, your wallet is refunded automatically. If you believe a delivered purchase was wrong or a deposit didn't reflect, contact us with the transaction reference and we'll look into it.",
  },
  {
    title: "Account limits and verification",
    body: "Unverified accounts have a limit on airtime/data/bill spending. Completing identity verification with your NIN increases these limits. We may suspend an account showing signs of fraud or abuse while we investigate.",
  },
  {
    title: "Changes",
    body: "We may update these terms as the service changes. Continuing to use FanFi after an update means you accept the current terms.",
  },
  {
    title: "Questions",
    body: "Reach us at support@fanfi.ng with any question about these terms.",
  },
];

const TermsOfService = () => (
  <div className="bg-surface min-h-screen">
    <SEO
      title="Terms of Service"
      description="The terms that govern using FanFi — your account, fees, refunds, and spending limits."
      path="/terms"
    />
    <Navbar />
    <div className="pt-32 pb-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <span className="text-iris font-dm text-sm font-medium tracking-widest uppercase">Legal</span>
      <h1 className="section-title mt-3 mb-2">Terms of Service</h1>
      <p className="text-ink/35 font-dm text-sm mb-10">Last updated August 2026</p>

      <div className="flex flex-col gap-8">
        {SECTIONS.map((s, i) => (
          <div key={i}>
            <h2 className="font-syne font-bold text-ink text-lg mb-2">{s.title}</h2>
            <p className="text-ink/60 font-dm text-sm leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
    <Footer />
    <BackToTop />
  </div>
);

export default TermsOfService;
