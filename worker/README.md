# Easy Learning — Push Notification Backend

Cloudflare Worker that sends scheduled Web Push reminders to every device
that has subscribed via the Easy Learning frontend. Fires at the user's
**local** 09:00, 17:00, and 21:00.

Architecture in one paragraph: when the user clicks the 🔔 in the app, the
browser asks its push service for a subscription; the frontend POSTs that
subscription to `/api/subscribe` along with the user's IANA timezone and
UI locale; the Worker stores it in KV. A cron trigger fires every hour,
the Worker iterates subscriptions, computes each user's local hour, and
sends an empty VAPID-authenticated push to those currently at 9/17/21.
The service worker on the device receives the push, reads localized
title/body strings from IndexedDB (written by the page), and shows the
notification.

No payload encryption is needed — pushes carry no data; the SW composes
the message itself. No npm dependencies in the Worker — the inline
implementation uses only the Web Crypto API.

---

## Prerequisites
- **Node.js 18+** (for the VAPID key generation script and Wrangler CLI)
- **A free Cloudflare account** — sign up at <https://dash.cloudflare.com/sign-up>. No credit card required.

## Setup (one-time, ~15 minutes)

### 1. Generate VAPID keys

From the repo root:

```bash
node scripts/generate-vapid-keys.js
```

This prints two values:
- `PUSH_PUBLIC_KEY` — paste into `index.html` (safe to commit)
- `VAPID_PRIVATE_JWK` — set as a Worker secret in step 4 (never commit)

### 2. Install Wrangler and log in

```bash
cd worker
npm install
npx wrangler login
```

A browser window opens; authorize Wrangler to access your Cloudflare account.

### 3. Create the KV namespace

```bash
npx wrangler kv namespace create SUBSCRIPTIONS
npx wrangler kv namespace create SUBSCRIPTIONS --preview
```

Each command prints an `id` line. Open `worker/wrangler.toml` and replace
the two `REPLACE_WITH_..._KV_ID` placeholders with the printed IDs:

```toml
[[kv_namespaces]]
binding    = "SUBSCRIPTIONS"
id         = "abc123…"      # ← production
preview_id = "def456…"      # ← preview / dev
```

### 4. Set Worker secrets

```bash
npx wrangler secret put VAPID_PRIVATE_JWK
# paste the JWK JSON line from step 1, press Enter

npx wrangler secret put VAPID_SUBJECT
# paste:  mailto:you@example.com   (your real email — used by push services to contact you if your sender misbehaves)
```

### 5. Deploy

```bash
npx wrangler deploy
```

Wrangler prints the public URL — something like
`https://easy-learning-push.your-name.workers.dev`. Copy it.

### 6. Wire the frontend

Open `../index.html` and find the constants near the top of the
`<script>` block:

```js
const PUSH_API_URL    = 'https://easy-learning-push.YOUR-SUBDOMAIN.workers.dev';
const PUSH_PUBLIC_KEY = 'REPLACE_WITH_VAPID_PUBLIC_KEY';
```

Replace `PUSH_API_URL` with the URL Wrangler printed, and `PUSH_PUBLIC_KEY`
with the public key from step 1.

### 7. Tighten CORS (recommended before production)

In `worker/src/worker.js`, change `ALLOW_ORIGIN = '*'` to your frontend's
real origin (e.g. `'https://easy-learning.example.com'`). Re-deploy.
For local testing you can leave `'*'` — your frontend is on
`http://localhost:8000` and won't have credentialed requests.

---

## Testing

### Local smoke test
- Open `http://localhost:8000/` in Chrome or Edge.
- DevTools → Application → Service workers → confirm `service-worker.js`
  is "activated and running".
- Click the 🔔 in the header → grant notification permission → toast confirms
  "Reminders enabled".
- DevTools → Application → Storage → IndexedDB → `easy-learning` → `kv`:
  you should see a `reminderStrings` entry with the current locale's title/body.

### End-to-end test (manual fire)
You can trigger the cron logic on demand without waiting for the hourly tick:

```bash
curl -X POST https://easy-learning-push.your-name.workers.dev/api/test-fire \
     -H "Authorization: Bearer ok"
```

(This only fires for users whose **current local hour** is 9, 17, or 21, so
either be in one of those windows on your test device, or use the next
section to override the check temporarily.)

### Logs
Tail Worker logs in real time:

```bash
npx wrangler tail
```

Click 🔔 in the app while watching — you'll see the subscribe POST hit
the Worker. Then wait for the scheduled tick (or run `test-fire`) to see
the push being sent.

---

## Operating costs

Cloudflare Workers free plan:
- 100,000 requests / day
- 10ms CPU per request

For a personal learning app this is essentially free indefinitely. Each
subscriber generates 24 cron-list reads per day + at most 3 pushes per day.
A thousand subscribers would still be well under the free quota.

KV free plan:
- 100,000 reads / day
- 1,000 writes / day
- 1 GB storage

Each push subscription is ~500 bytes. The free tier holds ~2 million subs.

---

## Limitations & known issues

- **Half-hour-offset timezones** (India UTC+5:30, parts of Australia, Iran):
  the hourly cron may deliver the reminder up to 30 minutes after the
  intended hour. To tighten, change `crons = ["0 * * * *"]` in
  `wrangler.toml` to `["*/30 * * * *"]` — but then you'd need to also
  store last-fired-hour per subscription to avoid double-firing.

- **iOS Safari**: web push works only when the user has **installed the
  PWA to the home screen**. Push to a Safari browser tab is not supported.
  Once installed, it works the same as Android.

- **No payload encryption**: the Worker sends empty pushes, so an attacker
  who got hold of a subscription endpoint could fire wakeups, but they
  can't read or inject notification text. The text is composed locally
  by your service worker from IndexedDB. Acceptable for a learning
  reminder; revisit if you ever need to deliver sensitive content.

- **Subscription cleanup**: expired endpoints (HTTP 410 or 404 from push
  service) are removed automatically on the next cron run. Manually-
  unsubscribed entries (user toggled 🔔 off) are removed via
  `/api/unsubscribe`. Subscriptions whose user clears `localStorage`
  without unsubscribing will linger until the push service expires them.

---

## File layout

```
worker/
├── README.md          ← this file
├── package.json       ← Wrangler dependency + npm scripts
├── wrangler.toml      ← Worker config: cron, KV binding, name
└── src/
    └── worker.js      ← Worker code (HTTP routes + scheduled handler)

scripts/
└── generate-vapid-keys.js  ← Node script to generate VAPID keypair
```
