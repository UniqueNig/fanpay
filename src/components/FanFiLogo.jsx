import React from "react";

// Inline (not an <img>) specifically so the "Fan" fill can track the
// --fp-ink CSS variable and stay legible in both themes — a plain SVG file
// loaded via <img src> can't see the page's CSS variables.
const FanFiLogo = ({ className }) => (
  <svg viewBox="0 0 200 40" fill="none" className={className} role="img" aria-label="FanFi">
    <text fontFamily="Syne, sans-serif" fontWeight="800" fontSize="32" letterSpacing="-1">
      <tspan style={{ fill: "rgb(var(--fp-ink))" }} x="0" y="32">Fan</tspan>
      <tspan style={{ fill: "rgb(var(--fp-iris))" }}>Fi</tspan>
    </text>
  </svg>
);

export default FanFiLogo;
