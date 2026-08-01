import axios from "axios";
import crypto from "crypto";
import { env } from "../config/env.js";
import { ApiError } from "../middleware/errorHandler.js";

// Confirmed from https://aspfiy.readme.io/reference/ — auth is
// `Authorization: Bearer <secret key>` (not an api-key header, and not
// prefixed with the word "Token" the way Maskawasub's is — easy to mix up
// between the two integrations).
function headers() {
  return {
    Authorization: `Bearer ${env.aspfiySecretKey}`,
    "Content-Type": "application/json",
  };
}

// `reference` doubles as the lookup key when Aspfiy's webhook fires later —
// embedding the uid directly means the webhook handler needs no separate
// mapping table. Confirmed live: reference must be unique across BOTH banks
// for the same person, not just per-bank — reusing one for both the Paga
// and Palmpay calls fails the second with "Refrence already exist" (their
// typo, not mine).
export function buildReference(uid, bank) {
  return `fanpay-${uid}-${bank}`;
}

export function parseReference(reference) {
  const match = /^fanpay-(.+)-(paga|palmpay)$/.exec(reference || "");
  return match ? { uid: match[1], bank: match[2] } : null;
}

// Reserves a permanent virtual account for a customer — any transfer to it
// credits them, at any time, not a one-off payment link. Both /reserve-paga/
// and /reserve-palmpay/ take an identical body shape and return an identical
// response shape per a live test (2026-07-31, real ₦0-cost reservation —
// creating a reserved account number costs nothing, unlike a VTU purchase):
//   { status: true, message: "Account reserved",
//     data: { reference, account: { account_number, account_name, bank_name, created_at }, meta, webhook_url } }
// Error shape: { status: false, message: "..." } — no HTTP-level distinction
// observed (still 200), so `status` is what actually needs checking, not
// just a non-throw from axios.
export async function aspfiyReserveAccount(bank, { email, reference, firstName, lastName, phone, webhookUrl }) {
  const path = bank === "paga" ? "/reserve-paga/" : "/reserve-palmpay/";
  let res;
  try {
    res = await axios.post(
      `${env.aspfiyBaseUrl}${path}`,
      { email, reference, firstName, lastName, phone, webhookUrl },
      { headers: headers(), timeout: 20000 }
    );
  } catch (err) {
    console.error(`Aspfiy ${bank} reserve error:`, err.response?.status, err.response?.data || err.message);
    throw new ApiError(502, `Could not reserve a ${bank} account. Try again.`);
  }

  if (!res.data?.status) {
    console.error(`Aspfiy ${bank} reserve rejected:`, res.data);
    throw new ApiError(502, res.data?.message || `Could not reserve a ${bank} account.`);
  }
  return res.data.data.account; // { account_number, account_name, bank_name, created_at }
}

// Aspfiy signs every webhook with a STATIC header — x-wiaxy-signature, the
// MD5 hash of your secret key — not an HMAC of the payload (their docs are
// explicit: "value set to the MD5 hash of your secret dashboard key"). This
// confirms the request came from someone who knows the secret key, but
// unlike Paystack's per-payload HMAC it doesn't bind the signature to the
// specific request body — the same header value is valid on every webhook
// forever. Implemented exactly as documented; noted here because it's a
// real (if minor, over HTTPS server-to-server) difference from the Paystack
// webhook pattern this mirrors otherwise.
export function verifyAspfiyWebhookSignature(signatureHeader) {
  if (!signatureHeader) return false;
  const expected = crypto.createHash("md5").update(env.aspfiySecretKey).digest("hex");
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
