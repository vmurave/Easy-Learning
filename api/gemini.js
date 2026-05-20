// Vercel Edge function — proxies POST requests to Google Gemini using a
// server-side API key. Path: /api/gemini
//
// Why this exists:
//   The frontend reads the user's own Gemini key from localStorage when
//   available (the recommended path — see the ⚙ AI Settings modal). When
//   no user key is set, the frontend falls back to this proxy so anonymous
//   visitors can still try AI features without managing their own key.
//
// Configuration:
//   Set GEMINI_API_KEY as an environment variable in the Vercel dashboard
//   (Project Settings → Environment Variables). Without it, this function
//   returns HTTP 503 and the frontend silently degrades to non-AI mode.
//
// Cost / abuse note:
//   All anonymous-visitor AI requests draw from your single Google AI Studio
//   free quota (1,500 requests/day at time of writing). Monitor usage on
//   the AI Studio dashboard. To restrict abuse you can:
//     1. Lock the key to your Vercel domain via HTTP-Referer restriction
//        in Google AI Studio (won't help here since requests come from your
//        Vercel server, not the user's browser — but does prevent the key
//        being usable if it ever leaks).
//     2. Add IP-based rate limiting (see Vercel KV / Upstash for a free
//        store). Out of scope for this initial implementation.

export const config = {
  runtime: 'edge',
};

const GEMINI_BASE  = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-flash-latest';

export default async function handler(request) {
  const cors = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '86400',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== 'POST') {
    return jsonResp({ error: 'Method not allowed' }, 405, cors);
  }

  const apiKey = (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) || '';
  if (!apiKey) {
    // Not configured on this Vercel deployment — frontend treats this the
    // same as "no AI available" and falls through to non-AI behavior.
    return jsonResp({
      error: 'Proxy not configured. Set GEMINI_API_KEY in Vercel Project Settings → Environment Variables.',
    }, 503, cors);
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return jsonResp({ error: 'Invalid JSON body' }, 400, cors);
  }

  // The frontend currently uses a single model; allow override via query
  // string (?model=gemini-1.5-pro) for future flexibility.
  const url = new URL(request.url);
  const model = url.searchParams.get('model') || DEFAULT_MODEL;

  try {
    const upstream = await fetch(
      `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      }
    );
    // Preserve upstream status (e.g. 429 rate-limit propagates to frontend
    // so its retry logic in callGemini() kicks in).
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
        ...cors,
      },
    });
  } catch (e) {
    return jsonResp({ error: 'Upstream fetch failed', detail: String(e && e.message) }, 502, cors);
  }
}

function jsonResp(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
