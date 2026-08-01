import React from "react";
import { Link } from "react-router-dom";
import { FiMapPin, FiPhone, FiMail } from "react-icons/fi";
import FanPayLogo from "./FanPayLogo";

const COLUMNS = [
  {
    title: "Products",
    links: [
      { label: "Fund Wallet", to: "/deposit" },
      { label: "Buy Airtime", to: "/recharge?type=airtime" },
      { label: "Buy Data", to: "/recharge?type=data" },
      { label: "Pay Bills", to: "/bills" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", to: "/help" },
      { label: "Contact Us", to: "/contact" },
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
    ],
  },
];

const Footer = () => (
  <footer className="border-t border-line py-16">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid md:grid-cols-3 gap-10 mb-12">
        <div className="md:col-span-1">
          <Link to="/" className="flex items-center mb-4">
            <FanPayLogo className="h-9 w-auto" />
          </Link>
          <p className="text-ink/40 font-dm text-sm leading-relaxed mb-5">
            Fund your wallet, buy airtime and data, and pay your bills — all in one simple app.
          </p>
          <div className="flex flex-col gap-2 text-ink/40 font-dm text-xs">
            <span className="flex items-center gap-2">
              <FiMapPin size={13} className="shrink-0" /> Abeokuta, Ogun State
            </span>
            <span className="flex items-center gap-2">
              <FiPhone size={13} className="shrink-0" /> 08147261388
            </span>
            <span className="flex items-center gap-2">
              <FiMail size={13} className="shrink-0" /> fanpay@gmail.com
            </span>
          </div>
        </div>

        {COLUMNS.map((col, i) => (
          <div key={i}>
            <h4 className="font-syne font-semibold text-ink text-sm mb-4">{col.title}</h4>
            <ul className="flex flex-col gap-2.5">
              {col.links.map((l, j) => (
                <li key={j}>
                  <Link to={l.to} className="text-ink/40 font-dm text-sm hover:text-iris transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="pt-8 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-ink/30 font-dm text-xs">
          © 2026 FanPay. All rights reserved.
        </p>
        <a
          href="https://emmanuelfaniyi.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink/30 font-dm text-xs hover:text-iris transition-colors"
        >
          Developed by tech_with_dami
        </a>
      </div>
    </div>
  </footer>
);

export default Footer;
