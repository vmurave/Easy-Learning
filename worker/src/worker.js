// Easy Learning — push notification backend (Cloudflare Worker).
//
// Responsibilities:
//   1. POST /api/subscribe   — stores a browser push subscription in KV
//   2. POST /api/unsubscribe — removes a subscription by ID
//   3. Scheduled cron event  — fires hourly; sends VAPID-authenticated
//      empty-payload push notifications to every subscription whose user
//      is currently at local 09:00, 17:00, or 21:00.
//
// Web Push is implemented inline using only the Web Crypto API — no npm
// dependencies. We send empty pushes; the service worker on each device
// composes the localised notification body using its own stored locale.
//
// Required environment:
//   env.SUBSCRIPTIONS    — KV namespace binding (see wrangler.toml)
//   env.VAPID_PRIVATE_JWK — secret: JSON-stringified private JWK (kty,crv,x,y,d)
//   env.VAPID_SUBJECT     — secret (optional): "mailto:you@example.com"
//                           required by some push services so they can reach
//                           you if your sender starts misbehaving.

'use strict';

const REMINDER_HOURS = [9, 17, 21];
const ALLOW_ORIGIN   = '*'; // tighten to your frontend's origin in production

export default {
  async fetch(request, env, ctx) {
    return handleFetch(request, env);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduled(env));
  },
};

// ─── HTTP routing ───────────────────────────────────────────────────────────

async function handleFetch(request, env) {
  const url  = new URL(request.url);
  const cors = corsHeaders();

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (url.pathname === '/api/subscribe' && request.method === 'POST') {
    return handleSubscribe(request, env, cors);
  }
  if (url.pathname === '/api/unsubscribe' && request.method === 'POST') {
    return handleUnsubscribe(request, env, cors);
  }
  if (url.pathname === '/api/health' || url.pathname === '/') {
    return new Response('OK — easy-learning push backend', { headers: cors });
  }
  // Manual trigger (for testing). Lets the developer fire the cron logic
  // on-demand without waiting for the scheduled tick. Protected by the
  // VAPID_PRIVATE_JWK existing — if the request is malformed it just 401s.
  if (url.pathname === '/api/test-fire' && request.method === 'POST') {
    const auth = request.headers.get('authorization');
    if (!auth || auth !== `Bearer ${env.VAPID_PRIVATE_JWK ? 'ok' : 'no'}`) {
      // Simple secret: the request must include `Authorization: Bearer ok`
      // and the worker must have VAPID configured. Not strong; rotate in prod.
      return new Response('Unauthorized', { status: 401, headers: cors });
    }
    await handleScheduled(env);
    return new Response('Fired.', { headers: cors });
  }

  return new Response('Not found', { status: 404, headers: cors });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age':       '86400',
  };
}

function jsonResp(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

// ─── Subscribe / unsubscribe handlers ──────────────────────────────────────

async function handleSubscribe(request, env, cors) {
  let body;
  try { body = await request.json(); }
  catch (_) { return jsonResp({ error: 'Invalid JSON' }, 400, cors); }

  const { subscription, timezone, locale } = body || {};
  if (!subscription || !subscription.endpoint || !subscription.keys ||
      !subscription.keys.p256dh || !subscription.keys.auth) {
    return jsonResp({ error: 'Missing or malformed subscription' }, 400, cors);
  }

  const id = randomId();
  const record = {
    endpoint:  subscription.endpoint,
    keys:      subscription.keys,
    timezone:  typeof timezone === 'string' ? timezone : 'UTC',
    locale:    typeof locale   === 'string' ? locale   : 'en',
    createdAt: Date.now(),
  };
  await env.SUBSCRIPTIONS.put(id, JSON.stringify(record));
  return jsonResp({ id }, 200, cors);
}

async function handleUnsubscribe(request, env, cors) {
  let body;
  try { body = await request.json(); }
  catch (_) { return jsonResp({ error: 'Invalid JSON' }, 400, cors); }

  const { id } = body || {};
  if (!id || typeof id !== 'string') {
    return jsonResp({ error: 'Missing id' }, 400, cors);
  }
  await env.SUBSCRIPTIONS.delete(id);
  return jsonResp({ ok: true }, 200, cors);
}

// ─── Scheduled cron handler ────────────────────────────────────────────────

async function handleScheduled(env) {
  if (!env.VAPID_PRIVATE_JWK) {
    console.warn('VAPID_PRIVATE_JWK not set — skipping scheduled run');
    return;
  }

  let cursor;
  const publicKeyB64 = await getPublicKeyB64FromJwk(env);

  do {
    const list = await env.SUBSCRIPTIONS.list({ cursor });
    cursor = list.list_complete ? undefined : list.cursor;

    for (const key of list.keys) {
      try {
        const raw = await env.SUBSCRIPTIONS.get(key.name);
        if (!raw) continue;
        const sub = JSON.parse(raw);
        if (!shouldSendNow(sub.timezone)) continue;
        const status = await sendEmptyPush(sub, env, publicKeyB64);
        // 404/410 mean the subscription is dead — clean it up.
        if (status === 404 || status === 410) {
          await env.SUBSCRIPTIONS.delete(key.name);
        }
      } catch (e) {
        console.warn(`scheduled: failed for ${key.name}:`, e && e.message);
      }
    }
  } while (cursor);
}

function shouldSendNow(timezone) {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', hour12: false, timeZone: timezone,
    });
    const hour = parseInt(fmt.format(new Date()), 10);
    return REMINDER_HOURS.includes(hour);
  } catch (_) {
    return false;
  }
}

// ─── Web Push sender (empty payload, VAPID-authenticated) ──────────────────

async function sendEmptyPush(sub, env, publicKeyB64) {
  const url      = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt      = await makeVapidJWT(audience, env);

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization':  `vapid t=${jwt}, k=${publicKeyB64}`,
      'TTL':            '60',
      'Content-Length': '0',
      'Urgency':        'normal',
    },
  });
  return res.status;
}

async function makeVapidJWT(audience, env) {
  const jwk     = JSON.parse(env.VAPID_PRIVATE_JWK);
  const subject = env.VAPID_SUBJECT || 'mailto:admin@example.com';

  const header  = b64UrlEncode(new TextEncoder().encode(JSON.stringify({
    typ: 'JWT', alg: 'ES256',
  })));
  const payload = b64UrlEncode(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  })));

  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${b64UrlEncode(new Uint8Array(sig))}`;
}

async function getPublicKeyB64FromJwk(env) {
  const jwk = JSON.parse(env.VAPID_PRIVATE_JWK);
  // VAPID public key is the uncompressed EC point: 0x04 || X || Y, b64url.
  const x = b64UrlDecode(jwk.x);
  const y = b64UrlDecode(jwk.y);
  const raw = new Uint8Array(65);
  raw[0] = 0x04;
  raw.set(x, 1);
  raw.set(y, 33);
  return b64UrlEncode(raw);
}

// ─── Utilities ─────────────────────────────────────────────────────────────

function randomId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

function b64UrlEncode(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64UrlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
