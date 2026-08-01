import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getSettings } from "../services/settings.js";
import { getAirtimeRate, listDataCatalog, MASKAWASUB_NETWORK } from "../services/maskawasubPricing.js";

// Lets the frontend preview the real fee/markup-inclusive total before a
// user confirms a transfer/purchase — the backend routes are what actually
// enforce the charge, this is purely a UX preview.
const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const settings = await getSettings();

    // Airtime prices per-network via the product-pricing catalog now, not a
    // blanket percentage — see services/maskawasubPricing.js.
    const airtimeRates = {};
    for (const network of Object.keys(MASKAWASUB_NETWORK)) {
      const rate = await getAirtimeRate(network);
      airtimeRates[network] = rate.sellingPrice;
    }

    // Nested under `pricing`, not a sibling key — both Recharge.jsx and
    // Pricing.jsx read it as `pricing.airtimeRates`. It used to be a sibling
    // here, which meant that path was always undefined and every airtime
    // rate silently fell back to the "unconfigured network" 100% default —
    // real purchases were still charged correctly (vtu.js calls
    // getAirtimeRate directly, server-side), this only broke the preview.
    res.json({ pricing: { ...settings.pricing, airtimeRates } });
  } catch (err) {
    next(err);
  }
});

// Public (no login) — a small teaser for the marketing homepage's plans
// section, not the full authenticated catalog. Only ever returns selling
// prices (never buyingPrice/margin — see routes/users.js's sanitizeMeta for
// the same principle applied elsewhere), and only the 2 cheapest active
// plans per network, to keep an anonymous visitor's page load cheap rather
// than pulling every plan for all 4 networks.
router.get("/public-teaser", async (req, res, next) => {
  try {
    const airtimeRates = {};
    for (const network of Object.keys(MASKAWASUB_NETWORK)) {
      const rate = await getAirtimeRate(network);
      airtimeRates[network] = rate.sellingPrice;
    }

    const dataPlans = {};
    for (const network of Object.keys(MASKAWASUB_NETWORK)) {
      const rows = await listDataCatalog(network);
      dataPlans[network] = rows
        .filter((r) => r.active)
        .sort((a, b) => a.sellingPrice - b.sellingPrice)
        .slice(0, 2)
        .map((r) => ({ size: r.sizeLabel, validity: r.validity, price: r.sellingPrice }));
    }

    res.json({ airtimeRates, dataPlans });
  } catch (err) {
    next(err);
  }
});

export default router;
