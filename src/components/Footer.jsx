import React from "react";
import { Link } from "react-router-dom";
import { FiInstagram, FiTwitter, FiFacebook, FiLinkedin } from "react-icons/fi";
import fanpayLogo from "../assets/abopay-logo.svg";

const Footer = () => (
  <footer className="border-t border-line py-16">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid md:grid-cols-4 gap-10 mb-12">
        <div className="md:col-span-1">
          <Link to="/" className="flex items-center mb-4">
            <img src={fanpayLogo} alt="FanPay" className="h-9 w-auto" />
          </Link>
          <p className="text-ink/40 font-dm text-sm leading-relaxed mb-2 italic">
            Pay Easy, Live More
          </p>
          <p className="text-ink/40 font-dm text-sm leading-relaxed mb-5">
            Smart payments for every Nigerian. Secure, fast, and always available.
          </p>
          <div className="flex gap-3">
            {[FiInstagram, FiTwitter, FiFacebook, FiLinkedin].map((Icon, i) => (
              <a key={i} href="#" className="w-8 h-8 rounded-lg bg-surface border border-line flex items-center justify-center text-ink/50 hover:text-iris hover:border-iris/30 transition-all">
                <Icon size={14} />
              </a>
            ))}
          </div>
        </div>

        {[
          {
            title: "Products",
            links: ["Transfer Money", "Pay Bills", "Buy Airtime", "Savings", "Cards"],
          },
          {
            title: "Company",
            links: ["About Us", "Careers", "Blog", "Press", "Partners"],
          },
          {
            title: "Support",
            links: ["Help Center", "Contact Us", "Privacy Policy", "Terms of Service", "CBN Compliance"],
          },
        ].map((col, i) => (
          <div key={i}>
            <h4 className="font-syne font-semibold text-ink text-sm mb-4">{col.title}</h4>
            <ul className="flex flex-col gap-2.5">
              {col.links.map((l, j) => (
                <li key={j}>
                  <a href="#" className="text-ink/40 font-dm text-sm hover:text-iris transition-colors">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="pt-8 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-ink/30 font-dm text-xs">
          © 2026 FanPay. All rights reserved. Licensed by the Central Bank of Nigeria.
        </p>
        <div className="flex items-center gap-4">
          <img src="https://img.shields.io/badge/Paystack-00C3F7?style=flat&logo=paystack&logoColor=white" alt="Paystack" className="h-5 opacity-60" />
          <img src="https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black" alt="Firebase" className="h-5 opacity-60" />
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
