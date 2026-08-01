import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BackToTop from "../components/BackToTop";
import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";

const AboutUs = () => (
  <div className="bg-surface min-h-screen">
    <Navbar />
    <div className="pt-32 pb-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <span className="text-iris font-dm text-sm font-medium tracking-widest uppercase">About Us</span>
      <h1 className="section-title mt-3 mb-6">
        Built to make everyday <span className="text-gradient">payments simple</span>
      </h1>
      <div className="flex flex-col gap-5 text-ink/60 font-dm text-base leading-relaxed">
        <p>
          FanPay is a wallet app built for one job: making the payments Nigerians make every day —
          airtime, data, electricity, cable TV — fast, reliable, and simple to get right.
        </p>
        <p>
          No clutter, no features you'll never use. Fund your wallet, spend it on what you actually
          need, and get on with your day.
        </p>
        <p>
          We're early — a new platform, still growing. If something doesn't work the way it should,
          we want to hear about it. <Link to="/contact" className="text-iris hover:underline">Reach out</Link>{" "}
          any time.
        </p>
      </div>
      <Link to="/signup" className="btn-iris inline-flex items-center gap-2 !w-auto px-6 mt-8">
        Open Free Account <FiArrowRight size={14} />
      </Link>
    </div>
    <Footer />
    <BackToTop />
  </div>
);

export default AboutUs;
