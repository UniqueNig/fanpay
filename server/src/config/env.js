import "dotenv/config";

const required = [
  "MONGODB_URI",
  "PAYSTACK_SECRET_KEY",
  "MASKAWASUB_API_KEY",
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  throw new Error(
    "Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH so the server can verify Firebase ID tokens."
  );
}

export const env = {
  port: process.env.PORT || 4000,
  // Comma-separated so both a local dev frontend and the deployed one can hit
  // the same backend without editing env vars every time you switch between them.
  allowedOrigins: (process.env.ALLOWED_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  mongodbUri: process.env.MONGODB_URI,
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
  firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY,
  maskawasubApiKey: process.env.MASKAWASUB_API_KEY,
  maskawasubBaseUrl: process.env.MASKAWASUB_BASE_URL || "https://www.maskawasub.com/api",
  // Not in `required` above yet — the virtual-account funding feature isn't
  // built out on the frontend yet, so the server should still boot without
  // it while that's in progress.
  aspfiySecretKey: process.env.ASPFIY_SECRET_KEY,
  aspfiyBaseUrl: process.env.ASPFIY_BASE_URL || "https://api-v1.aspfiy.com",
  // Aspfiy needs a real, internet-reachable URL to send funding webhooks to
  // — passed at reservation time (services/aspfiy.js). localhost only works
  // once this is actually deployed, or tunneled (ngrok etc.) for local testing.
  publicApiUrl: process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 4000}`,
  // Not required — the AI support chat can't work without it, but nothing
  // else in the app depends on it, so the server shouldn't refuse to boot
  // for accounts that haven't set this up yet.
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
  // VTpass is back in active use (2026-08-02) — electricity, cable, and WAEC
  // result-checker purchases now go through it (routes/vtu.js); Maskawasub
  // is scoped to airtime/data only. Not yet in `required` above because
  // production (Render) is still only configured with sandbox keys — move
  // it there once live VTPASS_* keys are set and VTPASS_BASE_URL points at
  // vtpass.com instead of sandbox.vtpass.com.
  vtpassApiKey: process.env.VTPASS_API_KEY,
  vtpassPublicKey: process.env.VTPASS_PUBLIC_KEY,
  vtpassSecretKey: process.env.VTPASS_SECRET_KEY,
  vtpassBaseUrl: process.env.VTPASS_BASE_URL || "https://sandbox.vtpass.com/api",
  // Not in `required` above — missing these should only break KYC uploads
  // (checked lazily in config/cloudinary.js), not take down the whole server
  // on deploy before the operator has had a chance to set them.
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  // Also optional — missing this should just silently skip sending emails
  // (see config/resend.js), never block signup or an admin's KYC/PIN review.
  resendApiKey: process.env.RESEND_API_KEY,
  resendFromEmail: process.env.RESEND_FROM_EMAIL,
};
