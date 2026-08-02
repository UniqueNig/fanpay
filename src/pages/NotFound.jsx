import React from "react";
import { Link, useLocation } from "react-router-dom";
import FanFiLogo from "../components/FanFiLogo";
import SEO from "../components/SEO";
import { FiArrowRight, FiHome } from "react-icons/fi";

const NotFound = () => {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-surface mesh-bg flex items-center justify-center px-4 py-12">
      <SEO title="Page Not Found" description="This page doesn't exist." path={location.pathname} noindex />
      <div className="w-full max-w-md text-center">
        <Link to="/" className="inline-flex items-center justify-center mb-10">
          <FanFiLogo className="h-9 w-auto" />
        </Link>

        <div className="relative mb-6">
          <p className="font-syne font-extrabold text-[7rem] sm:text-[9rem] leading-none text-gradient select-none">
            404
          </p>
          <div className="absolute inset-0 -z-10 blur-3xl bg-iris/10 rounded-full scale-75 mx-auto" />
        </div>

        <h1 className="font-syne font-bold text-ink text-xl mb-2">Page not found</h1>
        <p className="text-ink/50 font-dm text-sm leading-relaxed mb-8">
          The page you're looking for doesn't exist, or may have moved.
        </p>

        <div className="flex flex-col xs:flex-row gap-3 justify-center">
          <Link to="/" className="btn-iris inline-flex items-center justify-center gap-2 !w-auto px-6">
            <FiHome size={15} /> Back to Home
          </Link>
          <Link to="/help" className="btn-outline-iris inline-flex items-center justify-center gap-2 !w-auto px-6">
            Get Help <FiArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
