#!/usr/bin/env node
// Generate a VAPID keypair for Web Push.
//
// Usage:  node scripts/generate-vapid-keys.js
//
// Outputs:
//   - PUSH_PUBLIC_KEY (paste into index.html — safe to commit)
//   - VAPID_PRIVATE_JWK (set as a Cloudflare Worker secret — NEVER commit)
//
// Uses only Node's built-in crypto — no npm dependencies.

'use strict';

const { generateKeyPairSync } = require('crypto');

// P-256 ECDSA — required by RFC 8292 (Voluntary Application Server Identification).
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });

// VAPID public key is the raw uncompressed EC point (65 bytes: 0x04 || X || Y),
// base64url-encoded. This goes into the frontend's pushManager.subscribe call.
const publicKeyDer = publicKey.export({ type: 'spki', format: 'der' });
const publicKeyRaw = publicKeyDer.subarray(publicKeyDer.length - 65);
const publicKeyB64 = base64url(publicKeyRaw);

// Worker needs the full JWK (kty, crv, x, y, d) to import as a signing key
// via crypto.subtle.importKey. We output the JWK as a single JSON string
// suitable for `wrangler secret put`.
const privateJwk = privateKey.export({ format: 'jwk' });
// Slim to only the fields the Worker needs.
const minimalJwk = {
  kty: privateJwk.kty,
  crv: privateJwk.crv,
  x:   privateJwk.x,
  y:   privateJwk.y,
  d:   privateJwk.d,
};

console.log('\nVAPID keypair generated.\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('PUSH_PUBLIC_KEY (frontend, safe to commit):');
console.log('═══════════════════════════════════════════════════════════════');
console.log(publicKeyB64);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('VAPID_PRIVATE_JWK (Worker secret — KEEP PRIVATE):');
console.log('═══════════════════════════════════════════════════════════════');
console.log(JSON.stringify(minimalJwk));

console.log('\n───────────────────────────────────────────────────────────────');
console.log('Next steps:');
console.log('  1. Paste the public key into index.html:');
console.log('       const PUSH_PUBLIC_KEY = "' + publicKeyB64 + '";');
console.log('');
console.log('  2. Set the private JWK as a Cloudflare Worker secret:');
console.log('       cd worker && npx wrangler secret put VAPID_PRIVATE_JWK');
console.log('     (paste the JWK JSON line when prompted)');
console.log('');
console.log('  3. Optionally set a contact subject for push services:');
console.log('       cd worker && npx wrangler secret put VAPID_SUBJECT');
console.log('     (e.g.  mailto:you@example.com)');
console.log('───────────────────────────────────────────────────────────────\n');

function base64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
