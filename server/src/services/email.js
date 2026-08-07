import { resend, emailFrom } from "../config/resend.js";
import { ApiError } from "../middleware/errorHandler.js";
import { EmailQuota } from "../models/EmailQuota.js";
import { getSettings } from "./settings.js";
import { SystemLog } from "../models/SystemLog.js";
import { env } from "../config/env.js";

// fullName and admin-written rejection notes are user/admin-controlled text
// embedded straight into HTML email bodies below — escape before interpolating.
function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

// --- Brand shell -----------------------------------------------------------
// One template every sender below renders through, so the FanFi look (logo,
// palette, footer) lives in exactly one place instead of being copy-pasted
// per email — same reasoning as withinDailyQuota() being centralized rather
// than checked per-caller. Colors are lifted straight from src/index.css's
// --fp-* tokens (light theme only — see the color-scheme meta tags below for
// why this deliberately doesn't attempt email-client dark mode).
const LOGO_URL = `${env.publicAppUrl}/brand/fanfi-icon.png`;
const COLOR = {
  surface: "#F6F3FB",
  panel: "#FFFFFF",
  ink: "#17111F",
  muted: "#8A8398",
  line: "#E7E1F5",
  iris: "#6E64A6",
  irisSoft: "#EDEAF7",
};
// Google Fonts (Syne/DM Sans, used on the actual site) can't be trusted to
// load in email clients — Gmail and Outlook both strip <link>/@font-face in
// varying ways. A bold system-font stack gets close to Syne's geometric
// weight for the wordmark without depending on a webfont fetch succeeding.
const FONT = "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif";

function p(html) {
  return `<p style="margin:0 0 14px; font-family:${FONT}; font-size:15px; line-height:1.65; color:${COLOR.ink};">${html}</p>`;
}

function ul(items) {
  return `<ul style="margin:0 0 14px; padding-left:20px; font-family:${FONT}; font-size:15px; line-height:1.65; color:${COLOR.ink};">${items
    .map((i) => `<li style="margin-bottom:6px;">${i}</li>`)
    .join("")}</ul>`;
}

// `heading` is the bold line under the logo (kept short — this isn't the
// email subject, just an in-body echo of it); `bodyHtml` is pre-built via
// p()/ul() above. Explicitly declares light-only color-scheme rather than
// attempting a dark-mode variant — an auto-inverted table-based layout in
// Gmail/Apple Mail's dark mode tends to look worse than a clearly-declared
// light email, and this is a 480px card, not a full page.
function shell({ heading, bodyHtml, preheader }) {
  const preview = escapeHtml(preheader || heading || "FanFi");
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>FanFi</title>
  </head>
  <body style="margin:0; padding:0; background-color:${COLOR.surface}; font-family:${FONT};">
    <span style="display:none; max-height:0; overflow:hidden; opacity:0;">${preview}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR.surface};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background-color:${COLOR.panel}; border:1px solid ${COLOR.line}; border-radius:16px;">
            <tr>
              <td style="padding:26px 32px; border-bottom:1px solid ${COLOR.line};">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:10px;">
                      <img src="${LOGO_URL}" width="28" height="28" alt="FanFi" style="display:block; border-radius:7px;" />
                    </td>
                    <td style="font-family:${FONT}; font-size:20px; font-weight:800; letter-spacing:0.3px; color:${COLOR.iris};">FanFi</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${heading ? `<div style="font-family:${FONT}; font-size:18px; font-weight:700; color:${COLOR.ink}; margin-bottom:16px;">${heading}</div>` : ""}
                ${bodyHtml}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                  <tr>
                    <td style="background-color:${COLOR.iris}; border-radius:10px;">
                      <a href="${env.publicAppUrl}" style="display:inline-block; padding:11px 22px; font-family:${FONT}; font-size:14px; font-weight:600; color:#FFFFFF; text-decoration:none;">Open FanFi &rarr;</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px; background-color:${COLOR.irisSoft}; text-align:center; border-radius:0 0 16px 16px;">
                <div style="font-family:${FONT}; font-size:12px; color:${COLOR.muted};">FanFi &mdash; fund your wallet, pay bills, and send money, all in one place.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
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
    shell({
      heading: "Welcome to FanFi 🎉",
      preheader: "Your FanFi account is ready.",
      bodyHtml: p(`Hi ${name}, your FanFi account is ready. Fund your wallet, pay bills, and send money — all in one place.`) + p("— The FanFi Team"),
    })
  );
}

export function sendKycReviewedEmail(to, fullName, status, note) {
  const name = escapeHtml(fullName) || "there";
  const verified = status === "verified";
  return send(
    to,
    verified ? "Your identity has been verified" : "Your identity verification was rejected",
    shell({
      heading: verified ? "You're verified ✅" : "Verification not approved",
      preheader: verified ? "Your identity verification has been approved." : "Your identity verification could not be approved.",
      bodyHtml: verified
        ? p(`Hi ${name}, your identity verification has been approved. You're all set.`) + p("— The FanFi Team")
        : p(`Hi ${name}, your identity verification could not be approved.`) +
          p(`<strong>Reason:</strong> ${escapeHtml(note) || "Not specified."}`) +
          p("Please log in to FanFi and resubmit your documents.") +
          p("— The FanFi Team"),
    })
  );
}

// Unlike the transactional senders above, a broadcast genuinely needs to
// reach every user — so a missing Resend config or a failure is a real
// problem for the caller (the admin's "queue for all users" button), not
// something to swallow silently. The free Resend tier caps at 100 sends/day;
// sequential sending (not Promise.all) keeps this from hammering that limit
// all at once, and a failure partway through still reports how many made it.
// `bodyHtml` is the admin's raw message content (see routes/adminComms.js) —
// wrapped in the same brand shell as every other email here so an
// admin-authored broadcast doesn't look like a different, unbranded product.
export async function sendBroadcastEmail(recipients, subject, bodyHtml) {
  if (!resend) throw new ApiError(503, "No email provider is configured yet (set RESEND_API_KEY).");

  const html = shell({ heading: subject, preheader: subject, bodyHtml });
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
    shell({
      heading: "PIN reset approved",
      preheader: "Set a new transaction PIN before your next transfer or purchase.",
      bodyHtml: p(`Hi ${name}, your transaction PIN reset request has been approved. Log in and set a new PIN in Settings before making any transfers or purchases.`) + p("— The FanFi Team"),
    })
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
    shell({
      heading: `⚠️ Unexplained balance drop on ${provider}`,
      preheader: `Unexplained drop of ₦${unexplainedDrop.toLocaleString()} on ${provider}.`,
      bodyHtml:
        p(`<strong>${escapeHtml(provider)}</strong>'s balance dropped more than FanFi's own recorded purchases explain, since the last check at ${new Date(windowStart).toLocaleString("en-NG")}.`) +
        ul([
          `Balance then: ₦${lastBalance.toLocaleString()}`,
          `Balance now: ₦${currentBalance.toLocaleString()}`,
          `FanFi's own recorded spend in that window: ₦${expectedSpend.toLocaleString()}`,
          `<strong>Unexplained drop: ₦${unexplainedDrop.toLocaleString()}</strong>`,
        ]) +
        p(`This can happen if a purchase was made against this account that FanFi's own backend never processed or recorded — worth checking directly with ${escapeHtml(provider)}.`) +
        p("— FanFi System"),
    })
  );
}

// Routine "still fine" digest — distinct from sendBalanceDiscrepancyAlert
// above, which only fires when something's actually wrong. Sent at most
// once/day by jobs/reconcileProviderBalance.js regardless of outcome, so
// the admin alert address isn't ONLY ever hearing from FanFi when there's
// a problem.
export function sendReconciliationDigest(to, summaries) {
  const rows = summaries.map(
    (s) => `<strong>${escapeHtml(s.provider)}</strong>: balance ₦${s.currentBalance.toLocaleString()}, recorded spend today ₦${s.expectedSpend.toLocaleString()} — no unexplained gap.`
  );
  return send(
    to,
    "FanFi — daily provider balance check",
    shell({
      heading: "Daily provider balance check",
      preheader: "Routine check-in — all provider balances reconciled cleanly.",
      bodyHtml:
        p("Routine check-in — all provider balances reconciled cleanly against FanFi's own records in the last 24 hours:") +
        ul(rows) +
        p("You'll get a separate, immediate alert (not this digest) if a real discrepancy ever shows up.") +
        p("— FanFi System"),
    })
  );
}

export function sendPinChangedEmail(to, fullName) {
  const name = escapeHtml(fullName) || "there";
  return send(
    to,
    "Your FanFi PIN was changed",
    shell({
      heading: "Your PIN was changed",
      preheader: "If this wasn't you, contact support immediately.",
      bodyHtml:
        p(`Hi ${name}, your transaction PIN was just changed. If this was you, no action is needed.`) +
        p("If you didn't make this change, contact support immediately — someone else may have access to your account.") +
        p("— The FanFi Team"),
    })
  );
}

export function sendNewDeviceLoginEmail(to, fullName, { ip, userAgent }) {
  const name = escapeHtml(fullName) || "there";
  return send(
    to,
    "New sign-in to your FanFi account",
    shell({
      heading: "New sign-in detected",
      preheader: "Your account was just signed into from a new device or location.",
      bodyHtml:
        p(`Hi ${name}, your account was just signed into from a device or location we haven't seen before.`) +
        ul([`IP address: ${escapeHtml(ip) || "unknown"}`, `Device: ${escapeHtml(userAgent) || "unknown"}`]) +
        p("If this was you, no action is needed. If it wasn't, change your password and PIN immediately and contact support.") +
        p("— The FanFi Team"),
    })
  );
}

export function sendDepositConfirmationEmail(to, fullName, amount) {
  const name = escapeHtml(fullName) || "there";
  return send(
    to,
    "Wallet deposit confirmed",
    shell({
      heading: "Deposit confirmed ✅",
      preheader: `₦${Number(amount).toLocaleString()} has been added to your FanFi wallet.`,
      bodyHtml: p(`Hi ${name}, ₦${Number(amount).toLocaleString()} has been added to your FanFi wallet.`) + p("— The FanFi Team"),
    })
  );
}
