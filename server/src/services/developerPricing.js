import { DeveloperAccount } from "../models/DeveloperAccount.js";

// A user approved for live API access gets the same wholesale-ish apiPrice
// on their REGULAR dashboard purchases too, not just via /api/v1/* — the
// premise is they're now reselling to their own users, so they need real
// margin everywhere they buy, not only through the API. Takes effect the
// moment an admin flips DeveloperAccount.status to "approved" (no key
// generation or separate flag needed) and stops the moment it's revoked.
export async function isApprovedApiDeveloper(uid) {
  const developer = await DeveloperAccount.findOne({ uid, status: "approved" }).select("_id").lean();
  return !!developer;
}

// `priced` is any object with buyingPrice/sellingPrice/apiPrice (a
// ProductPrice document/row, or getAirtimeRate's plain object) — returns
// whichever price this specific uid should actually be charged.
export async function resolveEffectivePrice(uid, priced) {
  const isApiDev = await isApprovedApiDeveloper(uid);
  return isApiDev ? (priced.apiPrice ?? priced.buyingPrice) : priced.sellingPrice;
}
