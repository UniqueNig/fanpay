import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// React Router's <Link to="/#features"> only changes the URL — unlike a
// plain <a href="#features">, it does NOT scroll to the matching element,
// since that's native browser behavior for full page loads, not SPA route
// changes. Without this, clicking "Features"/"How It Works"/"FAQ" in the
// navbar just... didn't do anything visible, especially when navigating in
// from a different page entirely (e.g. from /about).
const ScrollToHash = () => {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.slice(1);
      // The target page's sections may not exist in the DOM yet on the
      // same tick this route change committed — one frame is enough since
      // nothing on the homepage gates its sections behind an async fetch.
      const t = setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
      return () => clearTimeout(t);
    }
    window.scrollTo({ top: 0 });
  }, [hash, pathname]);

  return null;
};

export default ScrollToHash;
