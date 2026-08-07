import { resend, emailFrom } from "../config/resend.js";
import { ApiError } from "../middleware/errorHandler.js";
import { EmailQuota } from "../models/EmailQuota.js";
import { getSettings } from "./settings.js";
import { SystemLog } from "../models/SystemLog.js";

// fullName and admin-written rejection notes are user/admin-controlled text
// embedded straight into HTML email bodies below — escape before interpolating.
function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

// Persisted, atomic daily counter guarding Resend's free-tier 100/day hard
// cap — every real send attempt through this module counts against it,
// checked BEFORE calling Resend so a day that's already at the limit fails
// fast and loud (SystemLog) instead of discovering it via a rejected
// Resend call, or worse, silently going over.
async function withinDailyQuota() {
  const today = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
  const settings = await getSettings();
  const cap = settings.general?.dailyEmailCap || 90;

  const doc = await EmailQuota.findOneAndUpdate(
    { date: today },
    { $inc: { count: 1 } },
    { upsert: true, new: true }
  );

  if (doc.count > cap) {
    console.warn(`Email quota exceeded for ${today}: ${doc.count}/${cap}`);
    SystemLog.create({ level: "warn", source: "email", message: `Daily email cap (${cap}) exceeded — skipped a send.` }).catch(() => {});
    return false;
  }
  return true;
}

// Never throws — a failed or skipped (unconfigured, or over quota) email
// must not break the signup/admin-review flow that triggered it.
async function send(to, subject, html) {
  if (!resend || !to) return;
  try {
    if (!(await withinDailyQuota())) return;
    await resend.emails.send({ from: emailFrom, to, subject, html });
  } catch (err) {
    console.error("Email send failed:", err.message);
  }
}

// Where alerts (fraud/reconciliation, not routine transactional mail) get
// sent — falls back to supportEmail so this never silently has nowhere to
// go just because the more specific field was never filled in.
export async function resolveAdminAlertEmail() {
  const settings = await getSettings();
  return settings.general?.adminAlertEmail || settings.general?.supportEmail || null;
}

export function sendWelcomeEmail(to, fullName) {
  const name = escapeHtml(fullName) || "there";
  return send(
    to,
    "Welcome to FanFi",
    `<p>Hi ${name},</p>
     <p>Your FanFi account is ready. Fund your wallet, pay bills, and send money — all in one place.</p>
     <p>— The FanFi Team</p>`
  );
}

export function sendKycReviewedEmail(to, fullName, status, note) {
  const name = escapeHtml(fullName) || "there";
  const verified = status === "verified";
  return send(
    to,
    verified ? "Your identity has been verified" : "Your identity verification was rejected",
    verified
      ? `<p>Hi ${name},</p>
         <p>Your identity verification has been approved. You're all set.</p>
         <p>— The FanFi Team</p>`
      : `<p>Hi ${name},</p>
         <p>Your identity verification could not be approved.</p>
         <p><strong>Reason:</strong> ${escapeHtml(note) || "Not specified."}</p>
         <p>Please log in to FanFi and resubmit your documents.</p>
         <p>— The FanFi Team</p>`
  );
}

// Unlike the transactional senders above, a broadcast genuinely needs to
// reach every user — so a missing Resend config or a failure is a real
// problem for the caller (the admin's "queue for all users" button), not
// something to swallow silently. The free Resend tier caps at 100 sends/day;
// sequential sending (not Promise.all) keeps this from hammering that limit
// all at once, and a failure partway through still reports how many made it.
export async function sendBroadcastEmail(recipients, subject, html) {
  if (!resend) throw new ApiError(503, "No email provider is configured yet (set RESEND_API_KEY).");

  let sent = 0;
  let quotaStopped = false;
  const failures = [];
  for (const to of recipients) {
    if (!to) continue;
    // Checked per-recipient, not once up front — a broadcast is exactly the
    // call most likely to actually hit the daily cap, so stop as soon as
    // it's reached rather than after committing to the whole list.
    if (!(await withinDailyQuota())) { quotaStopped = true; break; }
    try {
      await resend.emails.send({ from: emailFrom, to, subject, html });
      sent++;
    } catch (err) {
      failures.push(to);
    }
  }
  return { sent, failed: failures.length, quotaStopped };
}

export function sendPinResetApprovedEmail(to, fullName) {
  const name = escapeHtml(fullName) || "there";
  return send(
    to,
    "Your PIN reset has been approved",
    `<p>Hi ${name},</p>
     <p>Your transaction PIN reset request has been approved. Log in and set a new PIN in Settings before making any transfers or purchases.</p>
     <p>— The FanFi Team</p>`
  );
}

// Fired by jobs/reconcileProviderBalance.js when a provider's balance has
// dropped by more than FanFi's own recorded purchases explain — the signal
// for exactly the "someone with backend access at the provider triggered
// purchases we have no record of" scenario. `to` resolved via
// resolveAdminAlertEmail() by the caller, not here, so this stays a pure
// formatter/sender like everything else in this file.
export function sendBalanceDiscrepancyAlert(to, { provider, lastBalance, currentBalance, expectedSpend, unexplainedDrop, windowStart }) {
  return send(
    to,
    `⚠️ Unexplained balance drop on ${provider}`,
    `<p>Hi,</p>
     <p><strong>${provider}</strong>'s balance dropped more than FanFi's own recorded purchases explain, since the last check at ${new Date(windowStart).toLocaleString("en-NG")}.</p>
     <ul>
       <li>Balance then: ₦${lastBalance.toLocaleString()}</li>
       <li>Balance now: ₦${currentBalance.toLocaleString()}</li>
       <li>FanFi's own recorded spend in that window: ₦${expectedSpend.toLocaleString()}</li>
       <li><strong>Unexplained drop: ₦${unexplainedDrop.toLocaleString()}</strong></li>
     </ul>
     <p>This can happen if a purchase was made against this account that FanFi's own backend never processed or recorded — worth checking directly with ${provider}.</p>
     <p>— FanFi System</p>`
  );
}
