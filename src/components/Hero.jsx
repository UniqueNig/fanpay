import React from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiShield, FiZap } from "react-icons/fi";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-20 pb-16 overflow-hidden mesh-bg">
      {/* Decorative circles */}
      <div className="absolute top-1/4 -left-40 w-96 h-96 rounded-full bg-iris/8 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-40 w-96 h-96 rounded-full bg-iris/6 blur-3xl pointer-events-none" />
      <div className="absolute top-10 right-1/3 w-2 h-2 rounded-full bg-iris pulse-dot" />
      <div className="absolute bottom-32 left-1/4 w-1.5 h-1.5 rounded-full bg-gold pulse-dot" style={{ animationDelay: "1s" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text */}
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 bg-iris/10 border border-iris/20 rounded-full px-4 py-1.5 w-fit">
              <div className="w-1.5 h-1.5 rounded-full bg-iris pulse-dot" />
              <span className="text-iris font-dm text-xs font-medium tracking-wide">
                Nigeria's Fastest Payment App
              </span>
            </div>

            <h1 className="font-syne font-extrabold text-4xl sm:text-5xl lg:text-6xl text-ink leading-[1.1]">
              Pay Easy,<br />
              <span className="text-gradient">Live More</span>
            </h1>

            <p className="section-sub max-w-md text-base leading-relaxed">
              Pay bills, buy airtime, transfer money, and grow your savings — all
              in one place. Powered by Paystack. Secured by Firebase.
            </p>

            <div className="flex flex-col xs:flex-row gap-3 pt-2">
              <Link to="/signup" className="btn-iris flex items-center justify-center gap-2 text-sm">
                Open Free Account <FiArrowRight size={15} />
              </Link>
              <Link to="/login" className="btn-outline-iris text-sm text-center">
                Login to Dashboard
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex items-center gap-2 text-ink/50 text-xs font-dm">
                <FiShield className="text-iris" size={14} />
                CBN Compliant
              </div>
              <div className="flex items-center gap-2 text-ink/50 text-xs font-dm">
                <FiZap className="text-iris" size={14} />
                Instant Transfers
              </div>
              <div className="flex items-center gap-2 text-ink/50 text-xs font-dm">
                <span className="text-iris text-base leading-none">₦</span>
                <span>Zero Fees*</span>
              </div>
            </div>
          </div>

          {/* Dashboard mockup card */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-sm float">
              {/* Main card */}
              <div className="card-flat p-6 glow-accent">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-ink/50 font-dm text-xs">Total Balance</p>
                    <p className="font-syne font-bold text-2xl text-ink mt-1">
                      ₦<span className="text-gradient">847,520</span>.00
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-iris/15 flex items-center justify-center">
                    <span className="text-iris font-syne font-bold">₦</span>
                  </div>
                </div>

                {/* Quick action pills */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {["Send", "Bills", "Recharge", "Save"].map((a, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <div className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center text-lg">
                        {["↗️", "📋", "📱", "🏦"][i]}
                      </div>
                      <span className="text-ink/50 text-[10px] font-dm">{a}</span>
                    </div>
                  ))}
                </div>

                {/* Recent transactions */}
                <div className="flex flex-col gap-3">
                  <p className="text-ink/40 text-xs font-dm">Recent Transactions</p>
                  {[
                    { name: "DSTV Subscription", amount: "-₦19,000", color: "text-red-400" },
                    { name: "Salary Credit", amount: "+₦350,000", color: "text-iris" },
                    { name: "MTN Airtime", amount: "-₦1,000", color: "text-red-400" },
                  ].map((tx, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-line last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center text-xs">
                          {["📺", "💰", "📱"][i]}
                        </div>
                        <span className="text-ink/70 font-dm text-xs">{tx.name}</span>
                      </div>
                      <span className={`font-syne font-semibold text-xs ${tx.color}`}>
                        {tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating savings card */}
              <div className="absolute -bottom-4 -right-4 card-flat p-3 flex items-center gap-3 shadow-xl">
                <div className="w-8 h-8 rounded-lg bg-iris/15 flex items-center justify-center text-sm">⚡</div>
                <div>
                  <p className="text-ink/50 text-[10px] font-dm">Savings Goal</p>
                  <p className="text-iris font-syne font-bold text-sm">₦120,000</p>
                </div>
                <div className="ml-2">
                  <div className="w-1.5 h-8 rounded-full bg-surface">
                    <div className="w-full h-3/5 rounded-full bg-iris" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 pt-12 border-t border-line">
          {[
            { val: "2M+", label: "Active Users" },
            { val: "₦50B+", label: "Transactions" },
            { val: "99.9%", label: "Uptime" },
            { val: "4.8★", label: "App Rating" },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className="font-syne font-bold text-2xl text-gradient">{s.val}</p>
              <p className="text-ink/40 font-dm text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
