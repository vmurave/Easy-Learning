// Vercel Edge function — proxies POST requests to Groq's OpenAI-compatible API
// using a server-side API key. Path: /api/groq
//
// Why this exists:
//   Groq's free tier gives ~14,400 requests/day (vs Gemini's 1,500).
//   The frontend calls this proxy automatically when Gemini returns 429/503,
//   so users get seamless AI features even when the Gemini quota is exhausted.
//
// Configuration:
//   Set GROQ_API_KEY as an environment variable in the Vercel dashboard
//   (Project Settings → Environment Variables).
//   Get a free key at: https://console.groq.com/keys
//   Without this var, the function returns HTTP 503 and the frontend stays
//   in Gemini-only mode.
//
// Model choice:
//   llama-3.1-8b-instant — fast, high free-tier limit, good for language tasks.
//   Can be overridden per-request via ?model= query string.

export const config = {
  runtime: 'edge',
};

const GROQ_ENDPOINT  = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL  = 'llama-3.1-8b-instant';

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age':       '86400',
};

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== 'POST') {
    return jsonResp({ error: 'Method not allowed' }, 405);
  }

  const apiKey = (typeof process !== 'undefined' && process.env && process.env.GROQ_API_KEY) || '';
  if (!apiKey) {
    return jsonResp({
      error: 'Proxy not configured. Set GROQ_API_KEY in Vercel Project Settings → Environment Variables.',
    }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return jsonResp({ error: 'Invalid JSON body' }, 400);
  }

  const url = new URL(request.url);
  const model = url.searchParams.get('model') || DEFAULT_MODEL;

  // Merge the requested model into the body (frontend may omit it).
  const upstream_body = { ...body, model };

  try {
    const upstream = await fetch(GROQ_ENDPOINT, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(upstream_body),
    });
    // Preserve upstream status so the frontend retry/fallback logic sees real errors.
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
        ...cors,
      },
    });
  } catch (e) {
    return jsonResp({ error: 'Upstream fetch failed', detail: String(e && e.message) }, 502);
  }
}

function jsonResp(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
