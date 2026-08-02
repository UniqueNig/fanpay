import React from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import PlansShowcase from "../components/PlansShowcase";
import FAQAccordion from "../components/FAQAccordion";
import Footer from "../components/Footer";
import BackToTop from "../components/BackToTop";
import SEO from "../components/SEO";

const HowItWorks = () => (
  <section id="how" className="py-24 relative">
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-iris/3 to-transparent pointer-events-none" />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <span className="text-iris font-dm text-sm font-medium tracking-widest uppercase">
          Simple Process
        </span>
        <h2 className="section-title mt-3 mb-4">
          Get Started in <span className="text-gradient">4 Steps</span>
        </h2>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { step: "01", title: "Create Account", desc: "Sign up with your email and phone number in under a minute.", icon: "👤" },
          { step: "02", title: "Verify Your Identity", desc: "Add your NIN to unlock higher spending limits — takes a couple of minutes.", icon: "🪪" },
          { step: "03", title: "Fund Your Wallet", desc: "Top up by card, bank transfer, or your own dedicated account number.", icon: "💳" },
          { step: "04", title: "Start Spending", desc: "Buy airtime, data, and pay bills — delivered instantly from your dashboard.", icon: "🚀" },
        ].map((s, i) => (
          <div key={i} className="relative flex flex-col items-center text-center card-flat p-6">
            <div className="absolute -top-4 left-5 font-syne font-extrabold text-5xl text-ink/5 select-none">
              {s.step}
            </div>
            <div className="text-4xl mb-4">{s.icon}</div>
            <h3 className="font-syne font-bold text-ink text-base mb-2">{s.title}</h3>
            <p className="text-ink/50 font-dm text-sm leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const ORG_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "FanFi",
  description: "Buy airtime, data, pay utility bills, access developer APIs, and manage your digital payment services from one secure platform.",
  url: "https://fanpay-peach.vercel.app/",
  email: "support@fanfi.ng",
  telephone: "+2348147261388",
  address: { "@type": "PostalAddress", addressLocality: "Abeokuta", addressRegion: "Ogun State", addressCountry: "NG" },
};

const Home = () => (
  <div className="bg-surface min-h-screen">
    <SEO
      title="FanFi – Simple, Secure Digital Payments"
      description="Buy airtime, data, pay utility bills, access developer APIs, and manage your digital payment services from one secure platform."
      path="/"
    />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_SCHEMA) }} />
    <Navbar />
    <Hero />
    <Features />
    <HowItWorks />
    <PlansShowcase />
    <FAQAccordion />
    <Footer />
    <BackToTop />
  </div>
);

export default Home;
