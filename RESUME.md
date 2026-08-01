# FanPay — resume notes

Read this first in a new conversation, then say: **"Read RESUME.md and continue from where we left off."**

## What this is

Forked from the Abopay codebase (`c:\Users\user\Downloads\abopay-vercel-ready-fixed\abopay-vercel-ready`)
on 2026-07-30. Going independent because the collaborator on the original Abopay
project (GitHub: `dsc-creator/abopayyy`) never paid. Deliberately **not** sharing
any infrastructure with Abopay — separate Firebase project, separate database,
eventually a separate backend deployment. Abopay itself was reverted back to
its original state and left untouched, in case that situation resolves later.

## Firebase project

- Project: **fanpay-a512a** ("fanPay" in the console), Spark (free) plan — no need to upgrade.
- Auth enabled: Email/Password ✅, Google ✅.
- Firestore Database: **not confirmed created yet** — check console, create in
  production mode (region near Nigeria) if missing.
- Firestore rules (`firestore.rules` in this repo, includes the `/chats/{uid}`
  rules for Live Chat) — **not yet deployed** to this project. Needs:
  `npm install -g firebase-tools` → `firebase login` → `firebase use --add`
  (select fanpay-a512a) → `firebase deploy --only firestore:rules,firestore:indexes`.
- Frontend config: already in `.env` (`VITE_FIREBASE_*`).
- Backend service account: already in `server/.env` (`FIREBASE_SERVICE_ACCOUNT_JSON`) —
  verified it parses and the Admin SDK can reach the Auth API.

## Immediate next step (was in progress when we paused)

1. ✅ `npm install` done in repo root AND in `server/` (server's node_modules
   was corrupted from the copy and had to be wiped and reinstalled clean).
2. ✅ Both dev servers running locally — frontend on http://localhost:5173,
   backend on http://localhost:4000 (MongoDB connects fine).
3. ✅ Signed up through the app with `faniyiemmanuel2018@gmail.com`. Note:
   Google sign-up failed on the first attempt with a swallowed error message
   ("Google sign-up failed. Please try again.") — a temporary
   `console.error(err.code, err.message, err)` was added in
   `src/pages/Signup.jsx`'s `handleGoogle` catch block to debug it, but a
   server restart alone made the retry succeed, so the underlying cause
   (likely a stale popup/session state, not a Firebase config issue) was
   never confirmed. **The console.error debug line is still in
   `src/pages/Signup.jsx` — remove it once Google sign-up has proven stable,
   or leave it if you want the visibility.**
4. ✅ Ran `node scripts/grant-admin.js faniyiemmanuel2018@gmail.com` — admin
   claim granted (uid `TDNBObdSyaMaUoGOJNhk3Hm4kZF3`).
5. ✅ Signed out/in, Admin Panel link appears, `/admin` works.
6. **Not done yet**: set the same env vars (`VITE_FIREBASE_*`, `VITE_API_URL`,
   backend's `FIREBASE_SERVICE_ACCOUNT_JSON`, `MONGODB_URI`) on wherever this
   ends up deployed (Vercel for frontend, a new Render service or similar for
   backend — not the existing `abopay.onrender.com`, that stays Abopay-only).

## What's already ported into this codebase (vs. plain Abopay)

Admin pages: Finance, Marketing, Pricing Catalog, Settings, Email & SMS (Comms),
System Logs, Live Chat, Admin Login, Assistant (empty placeholder, not built).
Plus the customer-facing `ChatWidget`. All verified against matching backend
routes already in `server/src/routes/` before copying — see git log for the
"Sync from collaborator's frontend" work if you need the detail.

## Rebrand pass — mostly done

- ✅ Text: "Abopay" → "FanPay" across every user-facing string in `src/`
  (page titles, footer, receipts, placeholders, error messages), `index.html`
  title/meta, plus internal identifiers (import names, localStorage key,
  receipt filename, `.ng` email placeholders).
- ✅ Colors: navy/green (`#0d1b3e`/`#22c55e`) → violet-black/violet
  (`#181229`/`#8b5cf6`) brand palette in `tailwind.config.js` + `index.css`
  (cascades everywhere via the `primary`/`secondary` tokens).
- ✅ Logo: wordmark SVGs (`src/assets/abopay-logo.svg`, `public/favicon.svg`)
  edited to say "FanPay". Filenames themselves still say "abopay" internally
  (harmless, not user-visible) — only worth renaming during a future cleanup pass.
- ❌ **Not done**: the old fancy Abopay logo mark (mountain icon + lightning
  bolt + "PAY EASY, LIVE MORE" tagline, `public/abopay-logo.png`) has no
  FanPay equivalent — no new logo asset exists yet. Everywhere that used it
  now falls back to the plain text wordmark instead.
- ❌ **Not done**: root `package.json` name (`nairabank`), `README.md`,
  `DEPLOY.md` still reference Abopay — cosmetic/internal, low priority.

## UI redesign — light/flat + dark mode (core app only)

- ✅ Dashboard and everything under it (`DashboardLayout`, `Sidebar`,
  Transactions, Transfer, Bills, Recharge, Deposit, Savings, Settings, KYC,
  Set PIN, the receipt modal, notifications) converted from the old dark
  glass/blur look to a light, flat, card-first design — muted violet (`iris`
  token) instead of the vivid brand violet.
- ✅ Light/dark toggle added (sun/moon icon, top bar next to the notification
  bell — both mobile and desktop). Defaults to OS preference, remembers your
  choice in `localStorage`, no flash-of-wrong-theme on load. Architecture:
  CSS custom properties (`--fp-*` in `src/index.css`) flipped via a
  `data-theme` attribute on `<html>`, `ThemeContext` in
  `src/context/ThemeContext.jsx`.
- ✅ **Admin panel converted too** (2026-08-01, see "Done: full admin panel
  light/dark + skeleton conversion" below) — same token system, same toggle,
  same skeleton-loading treatment as the core app.
- ❌ **Not done**: Login, Signup, and the marketing homepage (Home/Hero/
  Features/Navbar/Footer) are still the old fixed-dark Abopay-era theme —
  untouched, no toggle awareness. Converting them isn't a simple token swap
  like the color rebrand was — they use hardcoded dark utility classes
  (`bg-white/5`, `border-white/10`, `backdrop-blur-sm`, etc.) throughout, so
  it's the same file-by-file effort the core app and admin panel already
  went through.

## Done: VTU provider cut over from VTpass to Maskawasub

User's decision. **The live app now runs on Maskawasub, not VTpass** — server
restarted clean and verified after the cutover (2026-07-31).

- ✅ `server/src/services/maskawasub.js` — auth (`Authorization: Token <key>`
  header — the literal word "Token" is part of the header value, easy to get
  wrong), base URL (`https://www.maskawasub.com/api`, no sandbox), full
  network/disco/cable ID tables, all purchase/verify functions.
  `assertDelivered()` checks the `Status` field explicitly on every purchase
  response — a 2xx HTTP status alone does **not** mean delivery succeeded,
  this guards the existing refund-on-failure logic in `vtu.js`.
- ✅ `server/src/services/maskawasubPricing.js` — the `productPricing.js`
  equivalent, reusing the existing `ProductPrice` Mongo model unchanged.
  Simpler than VTpass's version: Maskawasub returns a whole network's plan
  catalog in one bulk `GET /user/` call (cached 2 min in-memory), so there's
  no per-serviceID "variations" lookup and no equivalent to VTpass's
  `ExtraVtuService` "add a service" system — nothing to discover/merge.
- ✅ `server/src/routes/vtu.js`, `pricing.js`, `adminProductPrices.js`,
  `adminFinance.js` all rewired to call Maskawasub instead of VTpass.
  Frontend needed **zero changes** — the Maskawasub ID tables were built
  using the exact same key names VTpass used (`mtn`/`glo`/`9mobile`/`airtel`,
  `DSTV`/`GOtv`/`StarTimes`, `EKEDC`/`IKEDC`/etc), and the plan-catalog route
  responses keep the old `variation_code`/`variation_amount` shape.
- ✅ Removed the "Add a VTpass service" feature from the admin Pricing
  Catalog page (`AdminPricingCatalog.jsx`) — it doesn't map onto Maskawasub's
  catalog model (nothing to discover; the bulk fetch is already complete)
  and would have kept "working" in a way that did nothing, since `vtu.js` no
  longer calls VTpass at all. `adminNetworkServices.js`'s backing route is
  now orphaned (unused, harmless) rather than deleted outright.
- ✅ `env.js`: `MASKAWASUB_API_KEY` moved to `required`; `VTPASS_*` moved to
  optional (kept only so `reconcileVtu.js`'s cron can still settle any
  already-pending VTpass-era transactions without the server refusing to
  boot). **Safe to delete entirely** — `vtpass.js`, `productPricing.js`, and
  `reconcileVtu.js`'s VTpass branch — once no `AIR-`/`DATA-`/`BILL-`
  transaction older than the cutover date is still `meta.deliveryStatus:
  pending`.
- ✅ **Live-tested**: a real ₦250 MTN data purchase (`POST /data/`, plan id
  497) confirmed the success shape (`"Status": "successful"`, `balance_before`/
  `balance_after`, transaction `id`) and separately the error shape for a
  rejected plan (`{"error": ["message"]}`, different from the auth-layer
  `{"detail": "..."}` DRF error format).
- ✅ **`/data/` and `/topup/` (airtime) both live-tested and confirmed** —
  real MTN airtime purchase delivered successfully through the actual app
  (2026-07-31), confirming `assertDelivered()`'s `Status` check holds for
  airtime too, not just data. Electricity (`/billpayment/` +
  `/validatemeter`) and cable (`/cablesub/` + `/validateiuc`) are still
  untested — same assumption, not yet confirmed. Worth testing each for real
  before trusting them at scale. The airtime status-*query* endpoint
  specifically (`GET /topup/{id}`, for the reconcile job) is still a
  guess — Maskawasub's own Postman docs mislabel it, pointing at
  `/api/data/{id}` instead (likely their copy-paste error, not intentional).
  The electricity token field name is also an unconfirmed guess (`token`/
  `Token`/`electricity_token`) — falls back to the raw `api_response` text
  either way, so the token is never actually lost even if the dedicated
  field extraction misses.
- Pricing decision: purchases cost `TopUser_price` from Maskawasub's catalog
  (the account is `user_type: "API"`) — confirmed consistent with the one
  real test purchase, though that test's four price tiers happened to be
  identical so it doesn't fully prove which tier specifically gets charged.
- Full disco ID list (Maskawasub covers 11, VTpass only had 8): 1 Ikeja,
  2 Eko, 3 Abuja, 4 Kano, 5 Enugu, 6 Port Harcourt, 7 Ibadan, 8 Kaduna, 9 Jos,
  10 Benin, 11 Yola.

### Extensibility: registering a new network/provider Maskawasub adds later

User flagged this explicitly — the pricing system needed to handle both
Maskawasub's network id *and* plan id, so a future new network/cable
provider/disco (not just a new plan on an existing one) can be added without
a code change.

- ✅ New plans on the 4 existing networks / 3 cable providers were already
  auto-discovered (Maskawasub's bulk `/user/` catalog has no per-plan
  hardcoding) — this part needed no work.
- ✅ `ExtraVtuService` model repurposed (was VTpass-era "merge a service into
  a network"; now a flat "register a network/cable/disco by Maskawasub's
  numeric id" — no live discovery endpoint to check against, unlike VTpass,
  so it's admin-typed, not a picker).
- ✅ `resolveProviderId(category, key)` in `maskawasub.js` — checks the
  hardcoded tables first, falls back to `ExtraVtuService`. All of `vtu.js`,
  `maskawasubPricing.js`, `adminProductPrices.js`, `networks.js` now go
  through this instead of direct object lookups.
- ✅ Admin UI: a "Register a new one" mini-form on each Pricing Catalog tab
  (Airtime/Data share the same "network" registry since Maskawasub uses one
  id for both; Cable and a new **Electricity tab** each have their own), plus
  an "Add a plan manually by id" fallback on Data/Cable for when
  auto-discovery can't find something — genuinely necessary for cable
  specifically, since Maskawasub's cable catalog has no generic by-id lookup,
  only 3 named tables (GOTVPLAN/DSTVPLAN/STARTIMEPLAN). A 4th cable provider
  can never auto-discover its plans; manual entry is the only path.
- ✅ Bills.jsx got the same "fetch admin-added extras" pattern cable already
  had — electricity previously had zero extensibility path on the frontend
  even before this, a real (now-fixed) gap.
- 🐛 **Bug caught and fixed along the way**: the cable-bill purchase route
  was passing the numeric Maskawasub cable id into `resolveCablePlanPrice`
  where it needed the string key instead (used both as the DB lookup and to
  pick which of the 3 named catalog tables to search) — would have thrown
  "Unknown or unavailable bouquet" on every real cable purchase attempt.
  Caught during this rewrite, never actually shipped/tested live before the fix.

### Post-launch fixes (from real usage, 2026-07-31)

- 🐛 **Logo clipping** — `FanPayLogo.jsx` and the wordmark SVGs
  (`abopay-logo.svg`, both copies) had `viewBox="0 0 160 40"`, sized for the
  old "Abopay" text. "FanPay" has two capital letters (F, P) instead of one
  and is wider — the trailing "y" was getting clipped by the viewBox
  boundary on every page using the logo, including the receipt. Widened to
  `0 0 200 40`.
- 🐛 **Receipt exposed internal cost data to customers** — `buyingPrice`/
  `sellingPrice` (wholesale margin) and `maskawasubId` (the backend VTU
  provider's transaction id) were leaking through
  `TransactionDetailModal.jsx`'s generic "extra details" list. Customers
  should only see what they were actually charged (already shown as the
  headline amount) — naming the backend provider on a customer receipt is
  also just bad practice regardless (same principle applies to VTpass, had
  the migration not happened). Both now in `HIDDEN_KEYS`.
- 🐛 **Real performance bug**: admin Pricing Catalog's Data tab looked like
  it only had MTN plans — GLO/9MOBILE/AIRTEL "weren't there." Root cause:
  `listDataCatalog`/`listCableCatalog` seeded new plans into `ProductPrice`
  one row at a time (`await` in a loop) — MTN alone is 112 plans, so a
  network's *first* load did 20-112+ sequential DB round trips, taking
  15-30+ seconds (confirmed by direct testing). Not a display bug — the data
  was always correct, it just hadn't finished loading. Rewrote to
  `bulkWrite` with upserts — 2-3 round trips total regardless of plan count.

## Done: Aspfiy virtual-account funding (alternative to Paystack)

User's decision — Paga/Palmpay reserved virtual accounts as a second funding
method, generated per-user via Aspfiy. Fully built and live-tested
(2026-08-01).

- ✅ `server/src/services/aspfiy.js` — auth is `Authorization: Bearer <key>`
  (different scheme from Maskawasub's `Token <key>` — easy to mix up).
  `buildReference(uid, bank)` → `fanpay-{uid}-{bank}`, embedded directly in
  what's sent to Aspfiy so the webhook can recover the uid later with no
  separate mapping table needed.
- ✅ **Live-tested both `/reserve-paga/` and `/reserve-palmpay/`** against
  the real account — confirmed response shape (docs only showed empty `{}`
  examples): `{ status, message, data: { reference, account: {
  account_number, account_name, bank_name, created_at }, meta, webhook_url } }`.
  Error shape: `{ status: false, message }` — still HTTP 200, so `status` is
  what actually needs checking, not just a non-throw from axios.
- 🔑 **Gotcha found live**: `reference` must be unique across *both* banks
  for the same person, not just per-bank — reusing one for both calls fails
  the second with `"Refrence already exist"` (their typo). Already handled
  since `buildReference` includes the bank name.
- ⚠️ **Branding note for the user, not a code issue**: the reserved account's
  `account_name` came back as `"Aspfiy-Vtufan Emmanuel"` — "Vtufan" appears
  to be the business name registered on the Aspfiy account (matches the
  Maskawasub username), not "FanPay". This is what a customer's bank app
  will show when they go to send money — worth checking the Aspfiy dashboard
  for a business-name field to change if cleaner branding matters; not
  something the API lets this code control.
- ✅ `User.virtualAccounts.{paga,palmpay}` — reserved lazily (first request
  to `GET /api/deposits/virtual-accounts`, not at signup — most users may
  never need this, and reservation requires a phone number, which Google
  sign-in doesn't collect), then permanent, never re-reserved.
- ✅ Webhook receiver: `POST /api/webhooks/aspfiy` (extended the existing
  `webhooks.js`, same file as the Paystack handler, same `express.raw()` +
  mounted-before-`express.json()` pattern). Signature is header
  `x-wiaxy-signature` — **a static MD5 hash of the secret key, not an HMAC of
  the payload** (confirmed from Aspfiy's docs — "Wiaxy" appears to be the
  underlying/former brand name, shows up in this header name and one webhook
  field). Unlike Paystack's per-payload HMAC, this doesn't bind the
  signature to specific request content — implemented exactly as documented,
  but noted here since it's a real (if minor, server-to-server-over-HTTPS)
  difference worth knowing about.
- ✅ Wallet crediting mirrors the Paystack pattern exactly: `data.reference`
  (Aspfiy's own transaction id) as the `creditWallet` idempotency key —
  already-proven-safe via `Transaction.reference`'s unique index +
  duplicate-key swallow in `services/wallet.js`.
- ✅ **Not live-tested**: real webhook delivery. Aspfiy needs to reach
  `PUBLIC_API_URL` (new env var) over the internet — `localhost` only works
  once this is deployed, or tunneled (ngrok etc.) for local testing. The
  receiver code itself was smoke-tested directly with a hand-computed valid
  signature (200 OK, correctly parsed, gracefully no-op'd on an unknown
  test reference) — the gap is specifically "does Aspfiy's server actually
  call this," not the handler logic.
- ✅ Dashboard (`Dashboard.jsx`) and Deposit page (`Deposit.jsx`) both show
  the Paga/Palmpay account numbers now — Dashboard replaced the old
  "Account No. / Bank: FanPay" chip (that was for wallet-to-wallet transfer,
  a feature currently hidden — see below); Deposit gained a "Card / Bank" vs
  "Bank Transfer" tab switcher.

## Done: product scope trim + loading UX fix (2026-08-01)

- ✅ **Transfer and Savings hidden** from `Sidebar.jsx` nav and Dashboard
  quick actions — user's call, "can come back as a future feature." Routes
  themselves still work if visited directly; only the nav/dashboard entry
  points were removed, nothing deleted.
- ✅ **Quick actions restructured**: Deposit / Buy Airtime / Buy Data / Pay
  Bills (was Deposit / Send Money / Pay Bills / Recharge) — Recharge split
  into two tiles via `/recharge?type=airtime` and `?type=data`
  (`Recharge.jsx` now reads the query param to preset its tab).
- 🐛 **Real bug fixed**: the whole app rendered *blank* (not even a spinner)
  on every page refresh while Firebase resolved the auth state —
  `AuthContext.jsx` was gating its entire `children` tree behind
  `{!loading && children}`, which also made `ProtectedRoute.jsx`'s own
  loading-spinner branch permanently unreachable dead code (App never
  mounted at all until AuthContext's loading was already false, so
  ProtectedRoute's own `loading` was always false by the time it rendered).
  Fixed: `AuthContext` now always renders `children`; `ProtectedRoute` shows
  the real `DashboardLayout` (Sidebar + top bar) immediately with a new
  `PageSkeleton` component in the content area, and `Sidebar.jsx` shows its
  own skeleton for the user-info block (avatar/name/balance) while `loading`
  is true — matches the user's explicit ask: "topbar and sidebar already
  loaded" instead of the page going blank.
  - New reusable pieces: `src/components/Skeleton.jsx` (pulse-block
    primitive) and `src/components/PageSkeleton.jsx` (generic page-shape
    fallback — heading + big card + tile row + list, not any one specific
    page's exact layout).
  - `AdminRoute.jsx` had the same shape of loading branch and wasn't given
    the same skeleton treatment at the time — since fixed, see "Done: full
    admin panel light/dark + skeleton conversion" below.

## Done: purchase-flow UX pass (2026-08-01)

All from real usage feedback, all shipped and build-verified:

- ✅ **`BILL_TYPES` trimmed** to Electricity + Cable TV only (`utils/helpers.js`)
  — Water and Internet were listed but had zero backend implementation
  (`vtu.js`'s `POST /bill` only ever accepted `electricity`/`cable`), so
  picking either was a guaranteed dead-end error. Real bug fix disguised as
  a UX ask.
- ✅ **"Maskawasub" branding text actually removed this time** — Recharge
  and Bills now say "Delivered instantly · Charged from your wallet
  balance", no third-party name at all (the first attempt had just swapped
  VTpass→Maskawasub instead of dropping the mention, which was the actual
  point — caught on the second pass).
- ✅ **Real spinners** (`FiLoader` + `animate-spin`) replace plain "Loading
  plans.../Loading bouquets..." text in Recharge and Bills.
- ✅ **KYC is NIN-only now** — `ID_TYPES` picker (NIN/BVN/Driver's
  License/Passport) removed entirely, hardcoded to NIN, one input field.
- ✅ **Settings**: internal FanPay account number display removed (it only
  mattered for wallet-to-wallet transfer, a hidden feature); replaced with
  an editable phone number field + `PATCH /api/users/me` (new route) — this
  is also what unblocks the Aspfiy "add a phone number" error message from
  actually being fixable, closing the loop from the Aspfiy work above.
  `api.js` gained a `.patch()` method (didn't exist before).
- ✅ **`PinConfirmModal.jsx` fully rebuilt** — it had never been converted
  during the earlier light-theme redesign (still on `bg-[#0d2248]` and
  other old dark tokens, a real inconsistency popping a dark modal over the
  light app). Now light-themed, and takes optional `summary` (array of
  `{label, value}` rows), `amount`, and `balance` props to show a full
  purchase breakdown before the PIN boxes — matches the confirm-purchase
  pattern in Maskawasub's own consumer app (user's explicit reference).
  Recharge and Bills both pass real summaries now (network/recipient/plan
  for data, provider/meter/bouquet for bills).
- ✅ **Data plan picker redesigned** — a network's plans now group into
  swipeable type tabs (SME/GIFTING/CORPORATE GIFTING/etc, whatever a given
  network actually has) instead of one long list, 2-column card grid
  showing size + validity + price per plan. Needed backend changes too:
  `listDataCatalog` (`maskawasubPricing.js`) now carries `planType`/
  `sizeLabel` through, and `GET /vtu/data-plans/:network` (`vtu.js`) forwards
  `plan_type`/`validity`/`size` in its response (previously only
  `variation_code`/`name`/`variation_amount`).
- ✅ **USSD balance-check codes** — new `UssdCodes.jsx`, a collapsible
  panel on the Recharge page listing phone-number/airtime/data check codes
  per network with tap-to-copy + a confirmation modal. **Codes were taken
  directly from the user's reference screenshot (Maskawasub's own consumer
  app), not independently re-verified** against each network's currently
  published codes — worth a spot-check if a customer ever reports one not
  working, since these do occasionally get reassigned.
- ✅ **New customer-facing Pricing page** (`src/pages/Pricing.jsx`, linked
  from the sidebar) — read-only, tabbed (Data/Airtime/Cable/Electricity),
  reuses the same already-authenticated endpoints Recharge/Bills call
  (`/vtu/data-plans/:network`, `/vtu/cable-plans/:provider`, `/pricing`) —
  no new backend routes needed for this one.

## Done: financial correctness — real fee handling on deposits (2026-08-01)

Both explicitly flagged by the user after live-testing real deposits — "I don't
want to be in debt" (Aspfiy) and "Paystack also have charges o" (Paystack).
Both fees are now admin-editable (`AdminSettings.jsx` → Pricing tab →
`pricing.aspfiyDepositFeePercent` / `pricing.paystackDepositFeePercent`,
`AppSettings` schema defaults 1.5% each, user set both to 1.5%).

- ✅ **Aspfiy**: Aspfiy always deducts their own cut before settling a
  transfer, with no field anywhere in their API that reports the exact
  amount deducted. `webhooks.js`'s Aspfiy handler now credits
  `grossAmount * (1 - feePercent/100)`, not the raw gross amount.
- ✅ **Paystack**: FanPay was absorbing Paystack's own processing fee
  entirely. Now added **on top** of what the customer asked to deposit —
  `Deposit.jsx` shows an Amount/Fee/Total breakdown and charges the total;
  the actual wallet credit is always re-derived server-side from Paystack's
  own confirmed charge amount in `deposits.js`'s `/verify` route and
  `webhooks.js`'s `charge.success` handler
  (`netNaira = grossNaira / (1 + feePercent/100)`) — client-supplied amounts
  are never trusted for the credited figure.
- 🔑 **Field-name corrections caught via live testing** (Aspfiy's docs didn't
  match production, same pattern as Maskawasub below): webhook payload's
  payer name is `data.payer?.account_name` (there's no first_name/last_name),
  and the transaction reference is `data.wiaxy_ref || data.transaction_ref`
  (not `aspfiy_ref`).
- ⚠️ **One real stuck transaction, not yet resolved**: reference
  `R-DHNCVDNRYK`, a real ₦200 Palmpay transfer that arrived before the
  webhook fee-handling fix and before deployment (webhook delivery to
  localhost failed). Net ₦197 after 1.5% was never credited to the wallet —
  needs a manual credit (offered, not yet actioned as of 2026-08-01).

## Done: Ibadan Electric meter verification bug (2026-08-01)

User reported picking Ibadan Electric didn't return a customer name and the
pay button stayed disabled. Root cause: `vtu.js`'s `verify-electricity`/
`verify-cable` routes were built on **guessed** Maskawasub field names
(`customer_name`/`Customer_Name`/`CustomerName`) that don't exist in the real
API. Live-diagnosed against the actual `/validatemeter`/`/validateiuc`
endpoints — confirmed real shape is `{ invalid: true, name: "INVALID METER
NUMBER", address: "INVALID METER NUMBER" }` for a bad meter (still **200
OK**, not an error status — must check the `invalid` boolean or the literal
placeholder string renders as if it were a real customer name). Fixed to read
`content?.invalid` / `content?.name` / `content?.address`. Same root cause as
the disco names themselves being wrong — `MASKAWASUB_DISCO` was an 8-entry
acronym table (`IKEDC` etc.) that never actually matched Maskawasub's real
11-name list; replaced with the real names (`server/src/services/
maskawasub.js`, mirrored in `src/utils/helpers.js`'s `BILL_TYPES.electricity.
providers`): Ikeja, Eko, Abuja, Kano, Enugu, Port Harcourt, Ibadan, Kaduna,
Jos, Benin, Yola Electric.

## Done: full admin panel light/dark + skeleton conversion (2026-08-01)

User's explicit ask, chose "start now, work through it fully" over a phased
approach. Brings the entire admin panel to parity with the core customer
app's theme system (see "UI redesign" section above) — same `--fp-*` CSS
custom properties, same `data-theme` toggle, no more fixed-dark-only admin.

- ✅ `AdminLayout.jsx` — `bg-surface`, added the same `ThemeToggleButton`
  `DashboardLayout.jsx` uses, inline `FanPayLogo` (was a static old-logo
  import), iris-token Admin badge.
- ✅ `AdminSidebar.jsx` — full token conversion, all 18 nav items unchanged.
- ✅ `AdminRoute.jsx` — loading branch now renders `<AdminLayout><PageSkeleton
  /></AdminLayout>` instead of a bare full-screen dark spinner (closes the
  gap noted as "not done yet" in the product-scope-trim section above —
  `ProtectedRoute.jsx` got this fix first, `AdminRoute.jsx` was the same bug,
  fixed the same way). Access-denied screen also converted to light tokens.
- ✅ **All 20 admin page files** converted via a class-mapping bulk pass,
  then a manual review pass for edge cases the bulk pass couldn't safely
  auto-detect:
  - Mapping: `bg-primary`→`bg-surface`, `card-glass`→`card-flat`,
    `bg-card`→`bg-panel`, `border-white/N`→`border-line`,
    `bg-white/N`→`bg-surface`, `text-white(+opacity)`→`text-ink(+opacity)`,
    `text-secondary`/`border-secondary`→`text-iris`/`border-iris`,
    `btn-primary`→`btn-iris`, `btn-outline`→`btn-outline-iris`,
    `input-field`→`input-field-light`.
  - **Solid-fill special case** (would've silently broken button legibility
    if bulk-swapped naively): `bg-secondary text-primary` → `bg-iris
    text-accent-ink` specifically where text sits *on* the solid violet fill
    — `AdminDisputes.jsx` (refund button), `AdminKyc.jsx` (verified badge),
    `AdminLiveChat.jsx` (admin's own chat bubble + send button). Plain
    translucent tab-selector patterns (`bg-secondary/15 text-secondary`)
    didn't need this — already safe under the generic mapping.
  - **Missed by the first bulk pass, caught on a second sweep**: numbered
    opacity variants of `border-white/N`/`bg-white/N` beyond just `/8` and
    `/10` (the ubiquitous `border-white/5` row-divider pattern, used in
    nearly every admin list page) — fixed with a broader regex pass.
    `via-secondary` (a Tailwind gradient stop, `AdminLogin.jsx`'s top accent
    bar) — fixed to `via-iris`. Hardcoded `<option>` dropdown colors
    (`backgroundColor: "#0d2248"`, `AdminFinance.jsx`/`AdminMarketing.jsx`)
    — native `<select>` options can't take Tailwind classes reliably, so
    these were inline-styled; fixed to reference the CSS custom properties
    directly (`rgb(var(--fp-panel))`/`rgb(var(--fp-ink))`) so they flip with
    theme. `AdminSettings.jsx`'s `Toggle` component's off-state
    (`bg-white/15`, invisible in light theme) → `bg-line`.
- ✅ Build-verified clean (`npx vite build`) after every phase.
- Per-page loading states were **not** uniformly upgraded to animated
  skeleton blocks — most admin list pages already had a simple theme-token
  "Loading X..." text state (now correctly re-themed by the bulk pass) and
  a handful (`AdminDashboard`, `AdminFinance`, `AdminPinRequests`,
  `AdminVtuTransactions`, `AdminPricingCatalog`) already had `animate-pulse`
  skeleton blocks pre-dating this pass. Judged consistent enough with the
  existing pattern not to warrant rebuilding every page's loading state from
  scratch — flag if a specific page's loading state should get the fuller
  skeleton treatment.

## Done: real bug fixes from live usage (2026-08-01, second pass)

- 🐛 **Bills.jsx meter/smartcard verification looked permanently stuck on
  "Verifying meter..."** — live-diagnosed the exact reported meter number
  directly against Maskawasub's real API (confirmed it responds in ~2s,
  correctly returning `invalid: true` for that number — not a hang on
  Maskawasub's end). Two real bugs found instead: (1) when a meter/smartcard
  comes back invalid, `Bills.jsx` showed **nothing at all** (fell through to
  `null`) instead of an error message — indistinguishable from "still
  loading" at a glance, which is what actually produced the "just says
  verifying, never verifies" symptom; (2) no debounce or stale-response
  guard on the verify `useEffect`s — every keystroke fired its own request,
  and with no cancellation, an out-of-order response could clobber a newer
  one's state. Fixed both in the cable and electricity verify effects:
  added a 500ms debounce, a `cancelled` guard in the effect cleanup, and an
  explicit "Meter not found. Check the number and try again." /
  "Smartcard not found..." message shown when the number is genuinely invalid.
- 🐛 **Dashboard greeting wasn't actually static** (it was already computed
  from `new Date().getHours()`), **but had no "night" bucket** — every hour
  from midnight to 11:59am fell into "morning", so the greeting was wrong
  for several real hours of the day, which read as "static" to the user.
  Fixed to four buckets: morning (5am–12pm), afternoon (12–5pm), evening
  (5–9pm), night (9pm–5am).

## Done: Firestore created + Login/Signup/homepage theme conversion (2026-08-01)

- ✅ **Firestore Database created** in the `fanpay-a512a` Firebase console
  (user completed this) and **security rules deployed** (`firebase-tools
  login` → `use --add` → `deploy --only firestore:rules,firestore:indexes`,
  run by the user directly — the CLI needs an interactive browser login this
  environment can't do non-interactively). This unblocks the AI live chat
  build below.
- ✅ **`ANTHROPIC_API_KEY` added to `server/.env`** by the user — the second
  and last blocker for the AI live chat.
- ✅ **Login, Signup, and the marketing homepage** (Home, Hero, Features,
  Navbar, Footer) converted to the same theme-token system as the rest of
  the app — the last surviving fixed-dark-only surface. Same bulk
  class-mapping approach as the admin panel conversion above
  (`bg-primary`→`bg-surface`, `card-glass`→`card-flat`, `text-white`→
  `text-ink`, `btn-primary`→`btn-iris`, `btn-outline`→`btn-outline-iris`,
  `input-field`→`input-field-light`, `text-secondary`/`bg-secondary`/
  `border-secondary`→the `iris` equivalents, `border-white/N`/`bg-white/N`→
  `border-line`/`bg-surface`, `via-secondary` gradient stops→`via-iris`).
  - **Shared marketing-only CSS classes retextured at the definition level**
    instead of per-file (`.section-title`, `.section-sub`, `.nav-link`,
    `.stat-card`, `.feature-card` in `src/index.css`) — confirmed via a
    repo-wide grep that nothing outside Home/Hero/Features/Navbar depends on
    these, so changing the class definitions themselves (rather than
    touching every usage site) was safe and cascades automatically. Also
    fixed `.section-sub`'s `text-muted` (a hardcoded white-based color,
    invisible in light theme) → `text-ink/55`.
  - **`.card-glass`/`.btn-primary`/`.btn-outline`/`.input-field` were
    deliberately left untouched** at the CSS definition level — still used
    by `ChatWidget.jsx` and `ErrorBoundary.jsx`, which weren't in scope here
    (ChatWidget is about to be rebuilt for the AI live chat feature below
    anyway). Login/Signup/Home/Hero swapped to the newer `-flat`/`-iris`/
    `-light` classes instead of inheriting a retextured base class, so
    ChatWidget/ErrorBoundary's look is unaffected.
  - ✅ Added a light/dark toggle to `Navbar.jsx` (same `ThemeToggleButton`
    pattern as `DashboardLayout`/`AdminLayout`) — the pre-auth marketing
    site previously had no way to switch theme at all. Login/Signup
    themselves still don't have an explicit toggle control (no natural
    chrome for one, same precedent as `AdminLogin.jsx`) — they just respect
    whatever theme is already stored/system-preferred.
  - 🐛 **Rebrand miss caught along the way**: `Features.jsx` still said
    "NairaBank brings together every financial service..." — leftover from
    the original fork, missed by the earlier Abopay→FanPay text pass since
    it wasn't literally the string "Abopay". Fixed to "FanPay".
  - 🐛 **Real JSX bug introduced then caught during this edit**: adding the
    new theme-toggle button to `Navbar.jsx`'s mobile toggle required wrapping
    it in a new `<div>` — the first attempt consumed the *original* closing
    `</div>` for that new wrapper instead of adding its own, leaving the
    outer `h-16` flex container unclosed (build failed immediately with a
    clear "Expected `</div>`" error, caught before shipping).
  - ✅ Build-verified clean (`npx vite build`) after every phase.

## Done: AI-powered live chat (2026-08-01)

Built once both blockers cleared — Firestore created/rules deployed and
`ANTHROPIC_API_KEY` added to `server/.env`. Matches the explicit requirement:
**"if AI isn't active, let human do the responding, and if AI is active, let
it do it."**

- ✅ **Architecture**: the existing `/chats/{uid}` + `/chats/{uid}/messages`
  Firestore schema (already live for human-only chat) is unchanged. The
  backend (already an always-on Node/Express process, not serverless)
  attaches its own Firestore listener at boot via the Admin SDK
  (`server/src/config/firebaseAdmin.js` gained a `firestoreDb` export) —
  deliberately **not** a Cloud Function, since Cloud Functions with outbound
  network access need the paid Blaze plan and this project is intentionally
  staying on Spark (free), per earlier notes in this file.
  `server/src/services/chatListener.js` watches the single top-level
  `/chats` collection (not a collection-group query across every thread's
  `messages` subcollection) — a plain single-collection listener needs no
  composite Firestore index, so nothing extra had to be deployed. It relies
  on a `lastSender` field (`"user"`/`"admin"`/`"ai"`) written onto the
  summary doc on every send, already known without re-reading a thread.
  - Guards against replaying the entire chat history as new events on every
    server restart (Firestore's `onSnapshot` fires the whole current
    collection as "added" on first callback) by ignoring the first callback.
  - `server/src/services/chatAi.js` calls the real Anthropic Messages API
    directly via `axios` (`https://api.anthropic.com/v1/messages`,
    `x-api-key` header) — no SDK dependency added, consistent with how
    Maskawasub/Aspfiy/Paystack are all called elsewhere in this codebase.
    Model is `claude-sonnet-5` by default, overridable via `ANTHROPIC_MODEL`.
  - **Live-tested against the real Anthropic API** (2026-08-01) — confirmed
    the API key and request shape are both valid. The one live call made
    failed with a **402-class billing error**: `"Your credit balance is too
    low to access the Anthropic API."` — **not a code problem**, the
    Anthropic account itself needs credits purchased (Anthropic Console →
    Plans & Billing) before any reply will actually generate. Everything
    downstream of that call (parsing, Firestore writes, escalation
    handling) is implemented but **unverified against a real successful
    reply** until credits are added.
- ✅ **Global AI on/off toggle**: `AppSettings.chat.aiEnabled` (new field,
  default `false` — an admin has to opt in), same generic `/admin/settings`
  GET/POST pattern as every other setting. Toggle lives directly on the
  **Live Chat admin page** (`AdminLiveChat.jsx`) rather than buried in
  Settings, since that's where whoever's managing chat is already looking.
- ✅ **Per-thread override, so AI and a human never talk over each other**:
  the moment an admin sends a reply into a thread, `chats/{uid}.aiPaused` is
  set `true` and stays true — the AI won't respond to that thread again
  until the admin explicitly clicks **"Resume AI"** (visible per-thread when
  paused). Clearing `aiPaused` alone (without a new customer message) is
  enough to make the listener pick the thread back up, if the customer's
  last message is still unanswered — `chatListener.js` only checks
  `lastSender`/`aiPaused` on the doc, not what specifically changed.
- ✅ **Escalation**: the system prompt (in `chatAi.js`) tells Claude to write
  a normal short reply and then append a literal `<<ESCALATE>>` token on its
  own line when it can't fully help (needs real account data it has no
  access to, a refund/dispute, or the customer explicitly asks for a human)
  — stripped before storage/display, and flips `chats/{uid}.needsHuman: true`
  instead. Escalated threads show a red-flag icon in the admin thread list
  and a "needs a human" banner in the open conversation. A clean AI
  resolution (no escalation) clears `unreadByAdmin` so the admin inbox only
  surfaces what actually needs attention — an escalation keeps/sets it.
  - **Deliberately no live account data** (balance, transaction history,
    KYC status) is fed to the AI at all — keeps a bad/misread reply's blast
    radius to general product info only, never a misquoted balance or a
    leaked detail from someone else's account. The system prompt explicitly
    tells it to hand off anything needing real account lookups.
- ✅ `ChatWidget.jsx` (customer-facing) and `AdminLiveChat.jsx` (admin inbox)
  both converted to the theme-token system in the same pass (were still
  fixed-dark, out of scope until this feature needed touching them anyway).
  AI replies are visually distinguished with a small "AI Assistant" /
  "FanPay Assistant" label but otherwise sit in the same bubble style as a
  human admin reply — the customer doesn't need to consciously think about
  which one they're getting.
- 🐛 **Rebrand misses caught along the way**: `services/settings.js`'s
  maintenance-mode message and `index.js`'s startup log line both still said
  "Abopay" — fixed to "FanPay".

## Still pending / not started

- **Anthropic account needs credits purchased** before the AI live chat can
  actually generate a reply — confirmed live (2026-08-01) via a real API
  call that the key and integration are otherwise correctly wired, but it
  failed with a billing error (`"Your credit balance is too low..."`). Add
  credits at the Anthropic Console → Plans & Billing, then send a real test
  message through the customer chat widget with the AI toggle on (Admin →
  Live Chat) to confirm an actual reply comes back — this is the one part
  of the AI chat feature not yet verified end-to-end.
- **Dashboard plan grouping/hiding**: user wants to hide/show entire plan
  groups on the Dashboard (e.g. all of "Corporate Gifting" at once) as well
  as individual plans within a group independently — not yet built. Note
  this is distinct from the bulk-hide-by-`planType` feature already built
  into `AdminPricingCatalog.jsx`'s `GroupedDataTable` (that's an admin-side
  pricing-catalog control, not a customer-facing Dashboard grouping toggle).
- **Toast notifications on signup/signin and other key actions**: partially
  covered by the existing `ToastContext.jsx` infrastructure (already used in
  various places) — user asked for it to be comprehensive across every
  significant success/error action; not audited end-to-end for gaps.
- **WhatsApp purchase bot** (buy airtime/data/bills via WhatsApp chat, no app
  needed) — scoped but not started. Needs a Meta Business Manager account,
  WhatsApp Business API access, and business verification (can take days to
  weeks, entirely on the user side).
- **Separate backend deployment** — currently only exists locally. Needs its
  own Render (or similar) service + its own MongoDB Atlas database (can reuse
  the same Atlas cluster, different DB name, already set to `fanPay`). Also
  now the thing that unblocks real Aspfiy webhook testing (see above —
  needs a real `PUBLIC_API_URL`), and would let the stuck ₦200 Aspfiy
  transaction's kind of failure stop recurring.
- **Cutting off the collaborator's frontend from the Abopay backend** — this
  is an Abopay-side task (on `abopay.onrender.com`'s `ALLOWED_ORIGIN`), not a
  FanPay task, but part of the same overall plan. Still pending, waiting on
  confirmation of the collaborator's live frontend domain.
- **Firestore Database still not confirmed created** in the `fanpay-a512a`
  console (needed for Live Chat only — everything else uses MongoDB via the
  REST API). Rules in `firestore.rules` not yet deployed either. User was
  given step-by-step console instructions; awaiting confirmation.
- **Google account-chooser branding**: user asked whether the OAuth consent
  screen's app name can be changed so Google's "choose an account" screen
  shows "FanPay" instead of the raw `fanpay-a512a.firebaseapp.com` domain —
  guidance given (Google Cloud Console → OAuth consent screen → App name),
  not yet confirmed by the user whether it actually changed the display.
- **Login, Signup, and the marketing homepage** (Home/Hero/Features/Navbar/
  Footer) are still the old fixed-dark theme, same class of gap the admin
  panel just had — not yet scoped as its own task, flagged here since the
  admin panel (the other half of this gap) is now done.

- **WhatsApp purchase bot** (buy airtime/data/bills via WhatsApp chat, no app
  needed) — scoped but not started. Needs a Meta Business Manager account,
  WhatsApp Business API access, and business verification (can take days to
  weeks, entirely on the user side).
- **Separate backend deployment** — currently only exists locally. Needs its
  own Render (or similar) service + its own MongoDB Atlas database (can reuse
  the same Atlas cluster, different DB name, already set to `fanPay`). Also
  now the thing that unblocks real Aspfiy webhook testing (see above —
  needs a real `PUBLIC_API_URL`).
- **Cutting off the collaborator's frontend from the Abopay backend** — this
  is an Abopay-side task (on `abopay.onrender.com`'s `ALLOWED_ORIGIN`), not a
  FanPay task, but part of the same overall plan. Still pending, waiting on
  confirmation of the collaborator's live frontend domain.
- **Firestore Database still not confirmed created** in the `fanpay-a512a`
  console (needed for Live Chat only — everything else uses MongoDB via the
  REST API). Rules in `firestore.rules` not yet deployed either.

Full interactive checklist (all three phases — Firebase, WhatsApp bot, cut off
collaborator): https://claude.ai/code/artifact/c8b6ef69-cb7a-41bc-bd28-010aad4bb430
