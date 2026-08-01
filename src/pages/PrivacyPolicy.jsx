import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BackToTop from "../components/BackToTop";
import SEO from "../components/SEO";

const SECTIONS = [
  {
    title: "What we collect",
    body: "When you create an account, we collect your name, email address, and phone number. If you complete identity verification, we also collect your NIN and a photo ID/selfie. When you make a purchase or deposit, we record the transaction details necessary to deliver it and keep an accurate record of your wallet balance.",
  },
  {
    title: "How we use it",
    body: "Your information is used to run your account: authenticating you, processing deposits and purchases, verifying your identity where required, and reaching you about your account or a transaction. We don't sell your personal information to anyone.",
  },
  {
    title: "Who we share it with",
    body: "To actually deliver a purchase, some information has to reach the providers that make it happen — Paystack and Aspfiy for funding your wallet, and our airtime/data/bill provider for delivering what you buy. We share only what's needed for that specific transaction, nothing more.",
  },
  {
    title: "How we protect it",
    body: "Passwords are never stored by us — authentication runs through Firebase. Your transaction PIN is hashed, not stored in plain text. Identity documents are kept in access-controlled storage, viewable only by authorized staff reviewing your verification.",
  },
  {
    title: "Your choices",
    body: "You can update your phone number and other profile details in Settings at any time. To request deletion of your account and associated data, use the account deletion option in Settings, or contact us directly.",
  },
  {
    title: "Questions",
    body: "Reach us at fanpay@gmail.com with any question about how your data is handled.",
  },
];

const PrivacyPolicy = () => (
  <div className="bg-surface min-h-screen">
    <SEO
      title="Privacy Policy"
      description="How FanPay collects, uses, and protects your information."
      path="/privacy"
    />
    <Navbar />
    <div className="pt-32 pb-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <span className="text-iris font-dm text-sm font-medium tracking-widest uppercase">Legal</span>
      <h1 className="section-title mt-3 mb-2">Privacy Policy</h1>
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

export default PrivacyPolicy;
