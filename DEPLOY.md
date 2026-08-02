# FanFi — Deployment Guide

## Architecture

| Layer | Platform | What it does |
|---|---|---|
| **Frontend** | Vercel | React/Vite app — repo root |
| **Backend** | Render | Express API — `server/` folder |
| **Database** | MongoDB Atlas | Users, wallets, transactions |
| **Auth + support chat** | Firebase (Auth + Firestore) | Sign-in, live chat threads |

---

## Step 1 — Deploy the backend to Render

1. New **Web Service** → connect the `fanpay` repo.
2. **Root Directory**: `server`
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. Environment variables (see `server/.env.example` for the full list):
   - `ALLOWED_ORIGIN` — set this once you have the Vercel URL (step 2)
   - `MONGODB_URI` — Atlas connection string
   - `FIREBASE_SERVICE_ACCOUNT_JSON` — full service account JSON, one line
   - `PAYSTACK_SECRET_KEY`, `MASKAWASUB_API_KEY`, `ASPFIY_SECRET_KEY`, `ANTHROPIC_API_KEY`
   - `PUBLIC_API_URL` — set to this Render service's own URL, so Aspfiy's funding webhooks can actually reach it
6. Deploy, then note the resulting URL (e.g. `https://fanpay-api.onrender.com`).

---

## Step 2 — Deploy the frontend to Vercel

1. New Project → import the `fanpay` repo.
2. **Root Directory**: `.` (repo root)
3. Vercel auto-detects Vite — build command `npm run build`, output `dist`.
4. Environment variables (see `.env.example` for the full list):
   - `VITE_API_URL` — the Render URL from Step 1
   - `VITE_PAYSTACK_PUBLIC_KEY`
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`
5. Deploy, then note the resulting URL (e.g. `https://fanpay.vercel.app`).

---

## Step 3 — Close the loop

Go back to Render and set `ALLOWED_ORIGIN` to the real Vercel URL from Step 2, then redeploy the backend — until this is set, the frontend's API requests will be rejected by CORS.

---

## Step 4 — Firestore rules (one-time, if not already done)

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select the FanPay Firebase project
firebase deploy --only firestore:rules,firestore:indexes
```

---

## Step 5 — Set the Paystack and Aspfiy webhook URLs

- **Paystack Dashboard → Settings → API Keys & Webhooks → Webhook URL**:
  `https://<your-render-url>/api/webhooks/paystack`
- **Aspfiy dashboard** — webhook URL is set automatically per-account at reservation time via `PUBLIC_API_URL` (Step 1), nothing to paste manually here.
