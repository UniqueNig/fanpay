import { useEffect } from "react";

const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://fanpay-peach.vercel.app").replace(/\/+$/, "");
const SITE_NAME = "FanFi";
const DEFAULT_DESCRIPTION = "Fund your wallet, buy airtime and data, and pay electricity and cable TV bills — all in one simple app.";
// PNG, not SVG — WhatsApp/Facebook/LinkedIn's link-preview crawlers
// generally refuse to render SVG as an og:image at all (confirmed live: a
// shared link showed title/description fine but no image whatsoever).
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

function setMeta(attr, key, content) {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

// Per-page title/description/canonical/Open Graph/Twitter Card tags —
// mount once near the top of each public page's JSX. Only actually reaches
// crawlers that execute JavaScript (Googlebot does; most social link-
// preview bots — Facebook, Twitter, WhatsApp, Slack — do NOT, they read
// the raw HTML response only). This is a plain client-rendered app with no
// server-side rendering, so there's no way around that without a much
// bigger architecture change — index.html carries static fallback OG tags
// for exactly that reason, this component is what makes actual search
// results (title/snippet) and the browser tab accurate per page on top of that.
const SEO = ({ title, description = DEFAULT_DESCRIPTION, path = "/", image = DEFAULT_IMAGE, noindex = false }) => {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} – Fund Your Wallet, Sort Every Bill`;
    const url = `${SITE_URL}${path}`;

    document.title = fullTitle;
    setMeta("name", "description", description);
    setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");

    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", image);
    setMeta("property", "og:type", "website");

    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", image);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);
  }, [title, description, path, image, noindex]);

  return null;
};

export default SEO;
