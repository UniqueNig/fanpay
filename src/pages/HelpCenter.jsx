import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FAQAccordion from "../components/FAQAccordion";
import BackToTop from "../components/BackToTop";
import { Link } from "react-router-dom";
import { FiMessageCircle, FiMail } from "react-icons/fi";

const HelpCenter = () => (
  <div className="bg-surface min-h-screen">
    <Navbar />
    <div className="pt-32 pb-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <span className="text-iris font-dm text-sm font-medium tracking-widest uppercase">Help Center</span>
      <h1 className="section-title mt-3 mb-4">
        How can we <span className="text-gradient">help?</span>
      </h1>
      <p className="section-sub max-w-lg mx-auto mb-8">
        Answers to the questions we get asked most. Can't find yours? Reach out directly.
      </p>
      <div className="flex flex-col xs:flex-row gap-3 justify-center mb-4">
        <Link to="/contact" className="btn-iris inline-flex items-center justify-center gap-2 !w-auto px-6">
          <FiMail size={14} /> Contact Us
        </Link>
        <p className="flex items-center justify-center gap-2 text-ink/40 font-dm text-sm">
          <FiMessageCircle size={14} /> Or use live chat in the app
        </p>
      </div>
    </div>
    <FAQAccordion />
    <Footer />
    <BackToTop />
  </div>
);

export default HelpCenter;
