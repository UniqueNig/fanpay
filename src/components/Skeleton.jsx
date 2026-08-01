import React from "react";

// Generic pulse-block placeholder — pass sizing/shape via className
// (h-4 w-32, rounded-full for an avatar circle, etc). Deliberately not a
// shimmer-sweep effect: this app has both a light theme (core app) and dark
// theme (marketing/admin, still pending conversion) sharing this component,
// and a plain opacity pulse on the `line` token reads correctly against
// both without needing a second gradient tuned per-theme.
const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-line rounded-md ${className}`} />
);

export default Skeleton;
