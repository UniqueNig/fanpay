import axios from "axios";
import { env } from "../config/env.js";
import { ApiError } from "../middleware/errorHandler.js";
import { ExtraVtuService } from "../models/ExtraVtuService.js";

// Electricity keys match FanFi's existing frontend provider list exactly
// (src/utils/helpers.js's BILL_TYPES) — full disco names, not acronyms —
// so the frontend needs zero changes for provider selection. Values are
// VTpass's real serviceID slugs, confirmed live (2026-08-02) against
// GET /services?identifier=electricity-bill, not guessed. The previous
// version of this table used acronym keys (EKEDC, IKEDC...) from before the
// frontend was rewritten to Maskawasub's naming, had "Ibadan Electric"
// missing entirely, and had KEDCO incorrectly mapped to "kaduna-electric"
// instead of "kano-electric" — all fixed here from the live-confirmed list.
export const VTPASS_SERVICE = {
  airtime: { mtn: "mtn", airtel: "airtel", glo: "glo", "9mobile": "etisalat" },
  data: { mtn: "mtn-data", airtel: "airtel-data", glo: "glo-data", "9mobile": "etisalat-data" },
  electricity: {
    "Ikeja Electric": "ikeja-electric",
    "Eko Electric": "eko-electric",
    "Abuja Electric": "abuja-electric",
    "Kano Electric": "kano-electric",
    "Enugu Electric": "enugu-electric",
    "Port Harcourt Electric": "portharcourt-electric",
    "Ibadan Electric": "ibadan-electric",
    "Kaduna Electric": "kaduna-electric",
    "Jos Electric": "jos-electric",
    "Benin Electric": "benin-electric",
    "Yola Electric": "yola-electric",
  },
  cable: { DSTV: "dstv", GOtv: "gotv", StarTimes: "startimes" },
};

// Plain-object property access on a request-controlled key (e.g.
// VTPASS_SERVICE.electricity[req.params.provider]) resolves inherited
// properties like "__proto__" or "constructor" instead of returning
// undefined for an unrecognized provider — this only ever returns an actual
// own value from the lookup table.
export function lookupService(category, key) {
  const table = VTPASS_SERVICE[category];
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
}

// Resolves a provider key to its VTpass serviceID string — the hardcoded
// table above first, then an admin-registered ExtraVtuService row for
// anything not already mapped. Unlike Maskawasub's resolveProviderId
// (services/maskawasub.js), this never casts to Number — VTpass serviceIDs
// are slugs ("ibadan-electric"), not numeric codes.
export async function resolveVtpassProviderId(category, key) {
  const hardcoded = lookupService(category, key);
  if (hardcoded) return hardcoded;
  const extra = await ExtraVtuService.findOne({ category, networkKey: key, active: true }).lean();
  return extra ? extra.serviceID : null;
}

// Per VTpass's actual docs (vtpass.com/documentation/authentication/): POST
// requests authenticate with api-key + secret-key headers — no Basic Auth,
// no public-key (that pair is only for GET requests). The previous version of
// this function sent all three, which is what caused "Invalid credentials".
function headers() {
  return {
    "api-key": env.vtpassApiKey,
    "secret-key": env.vtpassSecretKey,
    "Content-Type": "application/json",
  };
}

export async function vtpassPay(payload, timeout = 25000) {
  let res;
  try {
    res = await axios.post(`${env.vtpassBaseUrl}/pay`, payload, { headers: headers(), timeout });
  } catch (err) {
    console.error("VTpass call error:", err.response?.data || err.message);
    throw new ApiError(502, "Could not complete delivery. No charge made.");
  }

  const code = res.data?.code;
  // "000" = success, "099" = processing (treat as ok, reconcile later via requery)
  if (code !== "000" && code !== "099") {
    console.error("VTpass returned non-success:", res.data);
    throw new ApiError(502, `Delivery failed: ${res.data?.response_description || "Unknown error"}`);
  }

  return res.data;
}

// GET requests use api-key + public-key (per VTpass docs — different from the
// api-key + secret-key pair used for POST /pay above). Used to fetch the real
// variation codes for data bundles / cable bouquets — the frontend can't just
// guess a code like "mtn-1000", VTpass has its own fixed list per service.
export async function vtpassVariations(serviceID) {
  try {
    const res = await axios.get(`${env.vtpassBaseUrl}/service-variations`, {
      params: { serviceID },
      headers: { "api-key": env.vtpassApiKey, "public-key": env.vtpassPublicKey },
      timeout: 15000,
    });
    return res.data;
  } catch (err) {
    console.error("VTpass variations error:", err.response?.data || err.message);
    throw new ApiError(502, "Could not load plans. Try again.");
  }
}

// Confirms a meter/smartcard number belongs to a real, active
// account/subscription before payment — same trust pattern as resolving a
// bank account name before a transfer. POST, so api-key + secret-key per
// VTpass's documented rule. Deliberately does NOT surface a "renewal amount"
// from this response — VTpass's own docs don't clearly confirm that field's
// exact name, and guessing wrong could silently charge the wrong amount. The
// bouquet price from vtpassVariations (already confirmed correct) is what's
// actually billed.
//
// A genuinely invalid billersCode does NOT throw — confirmed live
// (2026-08-02) that VTpass returns HTTP 200, code:"000" either way, with the
// failure signalled inside `content` instead: {error: "This meter is not
// correct...", WrongBillersCode: true} for electricity, {error: "The
// Smartcard/Decoder Number you entered may be invalid..."} for cable (no
// WrongBillersCode flag on that one). Callers must check `content?.error` —
// don't rely on a thrown exception to detect an invalid number.
export async function vtpassMerchantVerify({ billersCode, serviceID, extra = {} }) {
  try {
    const res = await axios.post(
      `${env.vtpassBaseUrl}/merchant-verify`,
      { billersCode, serviceID, ...extra },
      { headers: headers(), timeout: 15000 }
    );
    return res.data?.content;
  } catch (err) {
    console.error("VTpass merchant-verify error:", err.response?.data || err.message);
    throw new ApiError(400, "Could not verify that number. Check it and try again.");
  }
}

// GET, so api-key + public-key per the same rule as vtpassVariations above.
export async function vtpassBalance() {
  try {
    const res = await axios.get(`${env.vtpassBaseUrl}/balance`, {
      headers: { "api-key": env.vtpassApiKey, "public-key": env.vtpassPublicKey },
      timeout: 15000,
    });
    const balance = res.data?.contents?.balance;
    if (balance === undefined) throw new Error("Unexpected response shape from VTpass balance endpoint.");
    return { balance: parseFloat(balance) };
  } catch (err) {
    console.error("VTpass balance error:", err.response?.data || err.message);
    throw new ApiError(502, "Could not check VTpass balance.");
  }
}

// Category → VTpass's own identifier string for GET /services?identifier=X
// (confirmed against the live API, not guessed — cable's identifier is
// "tv-subscription", not "cable").
export const VTPASS_CATEGORY_IDENTIFIER = { airtime: "airtime", data: "data", cable: "tv-subscription" };

// Lists every service VTpass offers under a category — used by the admin
// "add a service" tool to discover things not in the hardcoded
// VTPASS_SERVICE table above (e.g. glo-sme-data, smile-direct, showmax).
// GET, so api-key + public-key per the same rule as vtpassVariations.
export async function listVtpassServices(identifier) {
  try {
    const res = await axios.get(`${env.vtpassBaseUrl}/services`, {
      params: { identifier },
      headers: { "api-key": env.vtpassApiKey, "public-key": env.vtpassPublicKey },
      timeout: 15000,
    });
    return res.data?.content || [];
  } catch (err) {
    console.error("VTpass services list error:", err.response?.data || err.message);
    throw new ApiError(502, "Could not load VTpass's service list. Try again.");
  }
}

export async function vtpassRequery(requestId) {
  const res = await axios.post(
    `${env.vtpassBaseUrl}/requery`,
    { request_id: requestId },
    { headers: headers(), timeout: 25000 }
  );
  return res.data;
}
