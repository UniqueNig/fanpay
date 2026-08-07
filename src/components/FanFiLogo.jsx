import React from "react";

// Icon (two mirrored F-strokes interlocked at the crossbar — decoded from
// "Fan-Fi" containing two F's; standalone version at public/brand/fanfi-icon.svg)
// combined with the wordmark as ONE svg, so every call site (Navbar,
// Sidebar, Footer, etc.) keeps working unchanged — they only ever set a
// height via className, width follows this viewBox's aspect ratio same as
// before. Tile background uses --fp-iris-soft (not a fixed dark chip)
// specifically so it reads correctly on both the light/dark customer app
// AND the permanently-dark admin/marketing surfaces.
const FanFiLogo = ({ className }) => (
  <svg viewBox="0 0 246 40" fill="none" className={className} role="img" aria-label="FanFi">
    <defs>
      <linearGradient id="fanfiIconViolet" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    <rect width="36" height="36" y="2" rx="8" style={{ fill: "rgb(var(--fp-iris-soft))" }} />
    <g transform="translate(7,9) scale(0.216)">
      <g style={{ fill: "rgb(var(--fp-ink))" }}>
        <rect x="32" y="14" width="14" height="72" rx="7" />
        <rect x="32" y="14" width="40" height="14" rx="7" />
        <rect x="32" y="44" width="30" height="13" rx="6.5" />
      </g>
      <g fill="url(#fanfiIconViolet)" transform="rotate(180 50 50)">
        <rect x="32" y="14" width="14" height="72" rx="7" />
        <rect x="32" y="14" width="40" height="14" rx="7" />
        <rect x="32" y="44" width="30" height="13" rx="6.5" />
      </g>
    </g>
    <text fontFamily="Syne, sans-serif" fontWeight="800" fontSize="32" letterSpacing="-1">
      <tspan style={{ fill: "rgb(var(--fp-ink))" }} x="46" y="32">Fan</tspan>
      <tspan style={{ fill: "rgb(var(--fp-iris))" }}>Fi</tspan>
    </text>
  </svg>
);

export default FanFiLogo;
