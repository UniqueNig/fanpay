import axios from "axios";
import { env } from "../config/env.js";
import { ApiError } from "../middleware/errorHandler.js";
import { ExtraVtuService } from "../models/ExtraVtuService.js";

// Confirmed from Maskawasub's own /api/user/ response (the `network` field on
// every data-plan row) — same numeric IDs apply to airtime (POST /topup/).
export const MASKAWASUB_NETWORK = { mtn: 1, glo: 2, "9mobile": 3, airtel: 4 };

// Confirmed from maskawasub.com/documentation/ → Electricity → "Electricity
// Companies (DisCos)" table — all 11, keyed by Maskawasub's own full names
// (not the acronym-style names VTpass used) so what a customer picks in the
// UI is the exact same string used to look up the id. Previously only 8 of
// these were mapped (missing Kano/Ibadan/Yola) — that's why Ibadan Electric
// wasn't selectable.
export const MASKAWASUB_DISCO = {
  "Ikeja Electric": 1,
  "Eko Electric": 2,
  "Abuja Electric": 3,
  "Kano Electric": 4,
  "Enugu Electric": 5,
  "Port Harcourt Electric": 6,
  "Ibadan Electric": 7,
  "Kaduna Electric": 8,
  "Jos Electric": 9,
  "Benin Electric": 10,
  "Yola Electric": 11,
};

// Confirmed from the `Cableplan.cablename` list in /api/user/.
export const MASKAWASUB_CABLE = { GOtv: 1, DSTV: 2, StarTimes: 3 };

const HARDCODED_TABLE = { network: MASKAWASUB_NETWORK, cable: MASKAWASUB_CABLE, electricity: MASKAWASUB_DISCO };

// Resolves a network/cable/disco key to its Maskawasub numeric id — checking
// the hardcoded tables above first, then falling back to an admin-registered
// ExtraVtuService row for anything Maskawasub adds later that isn't one of
// the ones already mapped (a 5th mobile network, a new cable company, a
// disco outside the original 8). Returns null if the key is unknown either way.
export async function resolveProviderId(category, key) {
  const hardcoded = HARDCODED_TABLE[category]?.[key];
  if (hardcoded) return hardcoded;
  const extra = await ExtraVtuService.findOne({ category, networkKey: key, active: true }).lean();
  return extra ? Number(extra.serviceID) : null;
}

// Admin-registered providers beyond the hardcoded tables, for merging into
// customer-facing pickers (routes/networks.js) and the admin Pricing Catalog
// page's tab list. Unlike the pre-migration version of this, there's no
// "already in use" exclusion to compute against a live external list —
// Maskawasub has no such discovery endpoint, admins just register what they
// know needs adding.
export async function listExtraProviders(category) {
  const extras = await ExtraVtuService.find({ category, active: true }).lean();
  return extras.map((e) => ({ id: e.networkKey, label: e.label, color: e.color }));
}

function headers() {
  return {
    Authorization: `Token ${env.maskawasubApiKey}`,
    "Content-Type": "application/json",
  };
}

// GET /api/user/ returns the account profile AND the full data/cable plan
// catalog bundled together in one (large) payload — there's no separate
// "list variations" endpoint like VTpass has. Cached briefly in memory so a
// customer browsing the recharge/bills page doesn't trigger a fresh
// multi-hundred-plan fetch on every request.
let userCache = null;
let userCacheAt = 0;
const USER_CACHE_TTL_MS = 2 * 60 * 1000;

export async function maskawasubUser({ fresh = false } = {}) {
  if (!fresh && userCache && Date.now() - userCacheAt < USER_CACHE_TTL_MS) {
    return userCache;
  }
  try {
    const res = await axios.get(`${env.maskawasubBaseUrl}/user/`, { headers: headers(), timeout: 15000 });
    userCache = res.data;
    userCacheAt = Date.now();
    return res.data;
  } catch (err) {
    console.error("Maskawasub /user/ error:", err.response?.data || err.message);
    throw new ApiError(502, "Could not reach Maskawasub. Try again.");
  }
}

export async function maskawasubBalance() {
  const data = await maskawasubUser();
  const balance = data?.user?.Account_Balance;
  if (balance === undefined) throw new ApiError(502, "Unexpected response shape from Maskawasub user endpoint.");
  return { balance: parseFloat(balance) };
}

// Flat list of every data plan across all four networks, from the cached
// /user/ payload — Dataplans.{NETWORK}_PLAN.{CATEGORY} is an array per plan
// "shelf" (CORPORATE/SME/GIFTING/etc, with an "ALL" bucket that already
// merges them). A handful of rows in Maskawasub's own catalog have corrupted
// prices (e.g. a "100.0MB" plan priced in the billions) — filtered out here
// with a sanity ceiling rather than trusted blindly.
const INSANE_PRICE_CEILING = 1_000_000;

// Takes the already-resolved Maskawasub numeric network id (not a key) — the
// search below scans every shelf under Dataplans for one containing this id,
// so it works unchanged for an admin-registered network too, as long as
// Maskawasub's /user/ response actually has a shelf for it.
export async function maskawasubDataPlans(networkId) {
  if (!networkId) return [];
  const data = await maskawasubUser();
  const plans = data?.Dataplans || {};
  const shelf = Object.values(plans).find((byNetwork) =>
    Object.values(byNetwork).some((rows) => rows.some((r) => r.network === networkId))
  );
  const rows = shelf?.ALL || Object.values(shelf || {}).flat();
  const seen = new Set();
  return rows.filter((r) => {
    if (r.network !== networkId) return false;
    if (seen.has(r.id)) return false; // "ALL" buckets repeat plans already listed under their own shelf
    seen.add(r.id);
    return parseFloat(r.TopUser_price) < INSANE_PRICE_CEILING;
  });
}

// Cable, unlike data, has no generic "filter by id" — Maskawasub's /user/
// response only exposes named tables (GOTVPLAN/DSTVPLAN/STARTIMEPLAN) for
// the 3 providers it already knows about. An admin-registered 4th cable
// provider has no such table to auto-discover from — this returns an empty
// list for it, and its plans have to go through the manual "add a plan"
// fallback in the admin Pricing Catalog page instead.
export async function maskawasubCablePlans(cableKey) {
  const table = { GOtv: "GOTVPLAN", DSTV: "DSTVPLAN", StarTimes: "STARTIMEPLAN" }[cableKey];
  if (!table) return [];
  const data = await maskawasubUser();
  return data?.Cableplan?.[table] || [];
}

// Confirmed live against POST /data/ (real ₦250 purchase, 2026-07-31): a
// successful delivery returns HTTP 200 with "Status": "successful" in the
// body — NOT just a 2xx status code. A request that fails validation before
// ever reaching the network (e.g. an unavailable plan) instead returns HTTP
// 400 with { "error": ["message"] }, which axios already throws on.
// The dangerous case this guards against: Maskawasub accepting the request
// (HTTP 200) but the delivery itself failing (network-side issue) — that
// would come back as HTTP 200 with a non-"successful" Status, which without
// this check would be silently treated as a success and the customer's
// wallet would never be refunded (see debitThenPurchase in vtu.js).
//
// "pending" is NOT a failure — confirmed live (2026-08-01) that /cablesub/
// always returns Status: "pending" immediately (delivery confirms
// asynchronously), unlike /topup/ and /data/ which return "successful"
// right away. The original version of this function treated anything but
// "successful" as an instant failure, which meant every cable purchase was
// auto-refunded to the customer's wallet while Maskawasub had *already*
// charged FanFi's real account balance for it (confirmed: balance_before/
// balance_after moved on a purchase this code was simultaneously reporting
// as failed) — a real, live money-losing bug, not a hypothetical one.
// "pending" purchases are left as-is here; the caller records
// deliveryStatus: "pending" and jobs/reconcileVtu.js resolves it later via
// maskawasubRequery, same pattern already used for airtime/data's much
// rarer "still processing" case.
// Maskawasub isn't consistent about the shape of its `error` field — usually
// an array of strings ({"error": ["This field is required."]}), but at least
// /billpayment/ sends it as a plain string ({"error": "Customer_Phone is
// required..."}). Blindly indexing [0] on a string silently truncates it to
// its first character (confirmed live: a real error came through as just
// "C"), so every extraction has to handle both shapes.
function extractApiErrorMessage(data) {
  const err = data?.error;
  if (Array.isArray(err)) return err[0];
  if (typeof err === "string") return err;
  return null;
}

function assertDelivered(data, label) {
  if (data?.Status === "successful" || data?.Status === "pending") return data;
  const msg = data?.api_response || extractApiErrorMessage(data) || `${label} delivery could not be confirmed.`;
  throw new ApiError(502, msg);
}

// Result-checker for a "pending" purchase — confirmed live (2026-08-01) that
// each purchase endpoint doubles as its own by-id lookup: GET /cablesub/{id}
// returns the exact same transaction record the original POST did, with an
// up-to-date Status. No separate "/requery" or "/status" endpoint exists
// (both 404); this is the real pattern. Only /cablesub/{id} has actually
// been confirmed against a real transaction — /topup/{id}, /data/{id}, and
// /billpayment/{id} are assumed to follow the same convention (same account,
// same underlying API framework) but haven't individually been tested,
// since airtime/data return "successful" immediately in every case seen so
// far and rarely need requerying, and no electricity purchase has been made
// yet to test against.
const REQUERY_PATH = { airtime: "topup", data: "data", cable: "cablesub", electricity: "billpayment", exam: "epin" };

export async function maskawasubRequery(kind, id) {
  const path = REQUERY_PATH[kind];
  if (!path) throw new ApiError(400, `Unknown requery kind: ${kind}`);
  try {
    const res = await axios.get(`${env.maskawasubBaseUrl}/${path}/${id}`, { headers: headers(), timeout: 20000 });
    return res.data;
  } catch (err) {
    console.error(`Maskawasub requery error (${kind}/${id}):`, err.response?.data || err.message);
    throw new ApiError(502, "Could not check delivery status. Try again shortly.");
  }
}

export async function maskawasubBuyAirtime({ network, mobile_number, amount, airtime_type = "VTU" }) {
  try {
    const res = await axios.post(
      `${env.maskawasubBaseUrl}/topup/`,
      { network, amount, mobile_number, Ported_number: true, airtime_type },
      { headers: headers(), timeout: 25000 }
    );
    return assertDelivered(res.data, "Airtime");
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error("Maskawasub airtime error:", err.response?.data || err.message);
    throw new ApiError(502, extractApiErrorMessage(err.response?.data) || "Could not complete delivery. No charge made.");
  }
}

export async function maskawasubBuyData({ network, mobile_number, plan }) {
  try {
    const res = await axios.post(
      `${env.maskawasubBaseUrl}/data/`,
      { network, mobile_number, plan, Ported_number: true },
      { headers: headers(), timeout: 25000 }
    );
    return assertDelivered(res.data, "Data");
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error("Maskawasub data error:", err.response?.data || err.message);
    throw new ApiError(502, extractApiErrorMessage(err.response?.data) || "Could not complete delivery. No charge made.");
  }
}

export async function maskawasubBuyElectricity({ disco_name, amount, meter_number, MeterType, Customer_Phone }) {
  try {
    const res = await axios.post(
      `${env.maskawasubBaseUrl}/billpayment/`,
      { disco_name, amount, meter_number, MeterType, Customer_Phone },
      { headers: headers(), timeout: 30000 }
    );
    return assertDelivered(res.data, "Bill payment");
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error("Maskawasub billpayment error:", err.response?.data || err.message);
    throw new ApiError(502, extractApiErrorMessage(err.response?.data) || "Could not complete delivery. No charge made.");
  }
}

// meterType: 1 = prepaid, 2 = postpaid (per Maskawasub's docs).
export async function maskawasubValidateMeter({ meternumber, disconame, mtype }) {
  try {
    const res = await axios.get(`${env.maskawasubBaseUrl}/validatemeter`, {
      params: { meternumber, disconame, mtype },
      headers: headers(),
      timeout: 15000,
    });
    return res.data;
  } catch (err) {
    console.error("Maskawasub validatemeter error:", err.response?.data || err.message);
    throw new ApiError(400, "Could not verify that meter number. Check it and try again.");
  }
}

export async function maskawasubBuyCable({ cablename, cableplan, smart_card_number }) {
  try {
    const res = await axios.post(
      `${env.maskawasubBaseUrl}/cablesub/`,
      { cablename, cableplan, smart_card_number },
      { headers: headers(), timeout: 30000 }
    );
    return assertDelivered(res.data, "Cable subscription");
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error("Maskawasub cablesub error:", err.response?.data || err.message);
    throw new ApiError(502, extractApiErrorMessage(err.response?.data) || "Could not complete delivery. No charge made.");
  }
}

// WAEC/NECO/NABTEB result checker PIN. Confirmed live (2026-08-01) that
// POST /epin/ is the real endpoint and `exam_name` is the required field —
// {"exam_name":["This field is required."]} came back for every other guess
// (exam, name, exam_type). A successful purchase was NOT tested (that would
// spend real money — cheapest live option is NECO at ₦2,100), so the exact
// success response shape is unconfirmed. assertDelivered's Status check and
// the pin/serial field-name guesses below follow the same convention every
// other Maskawasub endpoint has used so far; worth a real purchase to
// confirm the first time this actually runs.
export async function maskawasubBuyExamPin({ exam_name }) {
  try {
    const res = await axios.post(
      `${env.maskawasubBaseUrl}/epin/`,
      { exam_name },
      { headers: headers(), timeout: 30000 }
    );
    return assertDelivered(res.data, "Result checker pin");
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error("Maskawasub epin error:", err.response?.data || err.message);
    throw new ApiError(502, extractApiErrorMessage(err.response?.data) || "Could not complete delivery. No charge made.");
  }
}

export async function maskawasubValidateIUC({ smart_card_number, cablename }) {
  try {
    const res = await axios.get(`${env.maskawasubBaseUrl}/validateiuc`, {
      params: { smart_card_number, cablename },
      headers: headers(),
      timeout: 15000,
    });
    return res.data;
  } catch (err) {
    console.error("Maskawasub validateiuc error:", err.response?.data || err.message);
    throw new ApiError(400, "Could not verify that smartcard number. Check it and try again.");
  }
}

// data/billpayment/cablesub all confirmed as GET /{resource}/{id} in the
// docs. Airtime's query endpoint is NOT confirmed — Maskawasub's own Postman
// collection labels it "Query Airtime Transaction" but points the URL at
// /api/data/{id} (almost certainly a copy-paste error in their docs, not
// actually the airtime endpoint). Using /topup/{id} here as the logical
// match for POST /topup/ — needs a live check before this is relied on.
const QUERY_PATH = { data: "data", electricity: "billpayment", cable: "cablesub", airtime: "topup" };

export async function maskawasubQuery(kind, id) {
  const path = QUERY_PATH[kind];
  if (!path) throw new Error(`Unknown Maskawasub query kind: ${kind}`);
  const res = await axios.get(`${env.maskawasubBaseUrl}/${path}/${id}`, { headers: headers(), timeout: 25000 });
  return res.data;
}
