import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BackToTop from "../components/BackToTop";
import SEO from "../components/SEO";
import { FiMapPin, FiPhone, FiMail, FiMessageCircle } from "react-icons/fi";

const CONTACTS = [
  { icon: FiPhone, label: "Phone", value: "08147261388" },
  { icon: FiMail, label: "Email", value: "support@fanfi.ng" },
  { icon: FiMapPin, label: "Address", value: "Abeokuta, Ogun State" },
];

const ContactUs = () => (
  <div className="bg-surface min-h-screen">
    <SEO
      title="Contact Us"
      description="Get in touch with FanFi — phone, email, and address, or live chat right in the app."
      path="/contact"
    />
    <Navbar />
    <div className="pt-32 pb-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <span className="text-iris font-dm text-sm font-medium tracking-widest uppercase">Contact Us</span>
      <h1 className="section-title mt-3 mb-4">
        Get in <span className="text-gradient">touch</span>
      </h1>
      <p className="section-sub max-w-lg mb-10">
        Already signed up? Live chat in the app is the fastest way to reach us. Otherwise, here's how
        to find us directly.
      </p>

      <div className="grid sm:grid-cols-3 gap-5 mb-10">
        {CONTACTS.map((c, i) => (
          <div key={i} className="card-flat p-5">
            <div className="w-10 h-10 rounded-xl bg-iris/10 flex items-center justify-center mb-3">
              <c.icon size={16} className="text-iris" />
            </div>
            <p className="text-ink/40 font-dm text-xs uppercase tracking-wider mb-1">{c.label}</p>
            <p className="text-ink font-dm text-sm font-medium">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="card-flat p-6 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-iris/10 flex items-center justify-center shrink-0">
          <FiMessageCircle size={18} className="text-iris" />
        </div>
        <p className="text-ink/60 font-dm text-sm">
          Signed in already? Open the chat bubble in the bottom-right corner of your dashboard for the
          fastest response.
        </p>
      </div>
    </div>
    <Footer />
    <BackToTop />
  </div>
);

export default ContactUs;
