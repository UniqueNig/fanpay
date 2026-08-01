import { ProductPrice } from "../models/ProductPrice.js";
import { ApiError } from "../middleware/errorHandler.js";
import {
  maskawasubUser, maskawasubDataPlans, maskawasubCablePlans, resolveProviderId,
  MASKAWASUB_NETWORK, MASKAWASUB_CABLE,
} from "./maskawasub.js";

// Mirrors productPricing.js's job (authoritative, tamper-proof pricing for
// purchase routes; a catalog view for the admin pricing page) but adapted to
// how Maskawasub actually works: the whole network's plan list comes back in
// one bulk /user/ fetch, already merged — there's no per-serviceID
// "variations" endpoint to query.
//
// Reuses the existing ProductPrice model rather than a new one: `serviceID`
// holds the Maskawasub network/cable key ("mtn", "DSTV", etc — including
// admin-registered extras, see ExtraVtuService/resolveProviderId in
// maskawasub.js), `key` holds the plan's own numeric id as a string (for
// airtime, which has no fixed plan, key === serviceID, same convention
// productPricing.js already uses). VTpass-era rows (serviceID like
// "mtn-data", key like a VTpass variation_code) stay in the same collection
// untouched — these functions never query by that pattern, so they're inert
// leftovers, not a conflict.

const NETWORK_LABEL = { mtn: "MTN", glo: "GLO", "9mobile": "9MOBILE", airtel: "AIRTEL" };

async function getOrSyncPrice(category, serviceID, key, label, cost) {
  const existing = await ProductPrice.findOne({ serviceID, key });
  if (existing) return existing;
  return ProductPrice.create({ category, serviceID, key, label, buyingPrice: cost, sellingPrice: cost });
}

// Batched version of getOrSyncPrice, for seeding an entire network/cable
// provider's plan list in ~2 round trips instead of one per plan — a
// network can have 100+ plans (confirmed: MTN alone is 112), and awaiting
// getOrSyncPrice in a loop meant the first-ever load of a network could take
// 15-30+ seconds. `entries` is [{ key, label, cost }]; returns a Map keyed
// by `key`. Uses bulkWrite upserts (not insertMany) so a concurrent request
// seeding the same network at the same time can't collide on the unique
// {serviceID, key} index.
async function batchSyncPrices(category, serviceID, entries) {
  if (entries.length === 0) return new Map();

  const keys = entries.map((e) => e.key);
  const existing = await ProductPrice.find({ serviceID, key: { $in: keys } }).lean();
  const priced = new Map(existing.map((r) => [r.key, r]));

  const missing = entries.filter((e) => !priced.has(e.key));
  if (missing.length > 0) {
    await ProductPrice.bulkWrite(
      missing.map((e) => ({
        updateOne: {
          filter: { serviceID, key: e.key },
          update: { $setOnInsert: { category, serviceID, key: e.key, label: e.label, buyingPrice: e.cost, sellingPrice: e.cost } },
          upsert: true,
        },
      })),
      { ordered: false }
    );
    const created = await ProductPrice.find({ serviceID, key: { $in: missing.map((e) => e.key) } }).lean();
    created.forEach((r) => priced.set(r.key, r));
  }
  return priced;
}

// Any ProductPrice rows for this serviceID that Maskawasub's live catalog
// doesn't currently list — either a manually-added plan (the admin Pricing
// Catalog page's "add a plan" fallback, for when auto-discovery can't find
// something — e.g. any cable plan on an admin-registered extra provider,
// since Maskawasub's cable catalog has no generic by-id lookup) or a plan
// Maskawasub has since removed from its own catalog. Surfaced so nothing an
// admin already priced silently disappears from the page.
async function listManualRows(category, serviceID, seenKeys) {
  const manual = await ProductPrice.find({ category, serviceID, key: { $nin: [...seenKeys] } }).lean();
  return manual.map((m) => ({
    id: m._id, serviceID, variationCode: m.key, label: m.label, validity: null,
    liveMaskawasubPrice: null, buyingPrice: m.buyingPrice, sellingPrice: m.sellingPrice, active: m.active,
  }));
}

// Seeds from Maskawasub's own live percentage table (topuppercentage.<NETWORK>.VTU,
// e.g. 98 meaning 98% of face value) the first time a network is priced —
// "sell at cost" until an admin sets a margin, same as VTpass's DEFAULT_AIRTIME_RATE
// pattern, just seeded from real data instead of a hardcoded 100/100. An
// admin-registered extra network has no entry in Maskawasub's percentage
// table (it only covers the 4 it already knows about) — falls back to
// 100/100 (face value, zero margin) same as any other unconfigured network.
export async function getAirtimeRate(networkKey) {
  const existing = await ProductPrice.findOne({ category: "airtime", serviceID: networkKey, key: networkKey });
  if (existing) return { buyingPrice: existing.buyingPrice, sellingPrice: existing.sellingPrice };

  const data = await maskawasubUser();
  const label = NETWORK_LABEL[networkKey];
  const percent = data?.topuppercentage?.[label]?.VTU ?? 100;
  const row = await getOrSyncPrice("airtime", networkKey, networkKey, label || networkKey, percent);
  return { buyingPrice: row.buyingPrice, sellingPrice: row.sellingPrice };
}

// Authoritative price for one data-plan purchase — never trusts a
// client-supplied amount. Checked against the stored catalog first; falls
// back to a live Maskawasub lookup (seeding the catalog for next time) if
// this exact plan id has never been priced before.
export async function resolveDataPlanPrice(networkKey, planId) {
  const key = String(planId);
  const existing = await ProductPrice.findOne({ serviceID: networkKey, key });
  if (existing) {
    if (!existing.active) throw new ApiError(400, "This plan is currently unavailable.");
    return existing;
  }

  const networkId = await resolveProviderId("network", networkKey);
  const plans = await maskawasubDataPlans(networkId);
  const match = plans.find((p) => p.id === Number(planId));
  if (!match) throw new ApiError(400, "Unknown or unavailable plan. Please pick again.");

  return getOrSyncPrice("data", networkKey, key, `${match.plan} (${match.plan_type})`, parseFloat(match.TopUser_price));
}

export async function resolveCablePlanPrice(cableKey, planId) {
  const key = String(planId);
  const existing = await ProductPrice.findOne({ serviceID: cableKey, key });
  if (existing) {
    if (!existing.active) throw new ApiError(400, "This bouquet is currently unavailable.");
    return existing;
  }

  const plans = await maskawasubCablePlans(cableKey);
  const match = plans.find((p) => p.id === Number(planId));
  if (!match) throw new ApiError(400, "Unknown or unavailable bouquet. Please pick again.");

  return getOrSyncPrice("cable", cableKey, key, match.package, parseFloat(match.plan_amount));
}

// For the admin pricing page — merges Maskawasub's live plan list with
// stored pricing, seeding anything never touched before, plus any manually-
// added rows the live catalog doesn't list. Returns both the live
// Maskawasub price and the stored (possibly admin-overridden) price side by
// side, same as productPricing.js's listCatalog, so drift is visible rather
// than silently overwritten.
export async function listDataCatalog(networkKey) {
  const networkId = await resolveProviderId("network", networkKey);
  const plans = await maskawasubDataPlans(networkId);
  const entries = plans.map((p) => ({ key: String(p.id), label: `${p.plan} (${p.plan_type})`, cost: parseFloat(p.TopUser_price) }));
  const priced = await batchSyncPrices("data", networkKey, entries);

  const rows = plans.map((p) => {
    const stored = priced.get(String(p.id));
    return {
      id: stored._id, serviceID: networkKey, variationCode: String(p.id), label: stored.label,
      validity: p.month_validate, planType: p.plan_type, sizeLabel: p.plan,
      liveMaskawasubPrice: parseFloat(p.TopUser_price), buyingPrice: stored.buyingPrice, sellingPrice: stored.sellingPrice, active: stored.active,
    };
  });
  rows.push(...(await listManualRows("data", networkKey, new Set(plans.map((p) => String(p.id))))));
  return rows;
}

export async function listCableCatalog(cableKey) {
  const plans = await maskawasubCablePlans(cableKey);
  const entries = plans.map((p) => ({ key: String(p.id), label: p.package, cost: parseFloat(p.plan_amount) }));
  const priced = await batchSyncPrices("cable", cableKey, entries);

  const rows = plans.map((p) => {
    const stored = priced.get(String(p.id));
    return {
      id: stored._id, serviceID: cableKey, variationCode: String(p.id), label: stored.label,
      liveMaskawasubPrice: parseFloat(p.plan_amount), buyingPrice: stored.buyingPrice, sellingPrice: stored.sellingPrice, active: stored.active,
    };
  });
  rows.push(...(await listManualRows("cable", cableKey, new Set(plans.map((p) => String(p.id))))));
  return rows;
}

// WAEC/NECO result checker PINs — a tiny fixed catalog (2 items, unlike
// data's 100+ plans), so no need for listManualRows-style handling of plans
// Maskawasub might drop; the set of exam types itself barely changes.
// Priced from the /user/ response's `Exam` key ({WAEC:{amount:5050}, ...}),
// confirmed live (2026-08-01) — the purchase endpoint itself (POST /epin/,
// body {exam_name}) was only confirmed for its required-field validation,
// not an actual successful purchase, since testing that would have spent
// real money. See services/maskawasub.js's maskawasubBuyExamPin.
//
// NABTEB is deliberately excluded — Maskawasub's own site marks it "Coming
// Soon", and a live test confirmed POST /epin/ {exam_name: "NABTEB"} errors
// (500) even though /user/'s Exam key lists a price for it. Add it back
// once Maskawasub actually turns it on (an admin can also just re-add it
// manually via "Add a plan manually by id" in the meantime if it starts
// working before this gets updated).
export const EXAM_TYPES = ["WAEC", "NECO"];

export async function resolveExamPrice(examName) {
  const key = (examName || "").toUpperCase();
  const existing = await ProductPrice.findOne({ serviceID: "exam", key });
  if (existing) {
    if (!existing.active) throw new ApiError(400, "This exam pin is currently unavailable.");
    return existing;
  }

  const data = await maskawasubUser();
  const cost = data?.Exam?.[key]?.amount;
  if (cost == null) throw new ApiError(400, "Unknown or unavailable exam type.");

  const priced = await batchSyncPrices("exam", "exam", [{ key, label: `${key} Result Checker PIN`, cost }]);
  return priced.get(key);
}

export async function listExamCatalog() {
  const data = await maskawasubUser();
  const entries = EXAM_TYPES
    .filter((k) => data?.Exam?.[k]?.amount != null)
    .map((k) => ({ key: k, label: `${k} Result Checker PIN`, cost: data.Exam[k].amount }));
  const priced = await batchSyncPrices("exam", "exam", entries);

  return entries.map((e) => {
    const stored = priced.get(e.key);
    return {
      id: stored._id, serviceID: "exam", variationCode: e.key, label: stored.label,
      liveMaskawasubPrice: e.cost, buyingPrice: stored.buyingPrice, sellingPrice: stored.sellingPrice, active: stored.active,
    };
  });
}

export { MASKAWASUB_NETWORK, MASKAWASUB_CABLE };
