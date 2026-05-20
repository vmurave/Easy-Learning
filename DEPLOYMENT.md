# Deployment Guide

Learning Easy is a single-file static application — `index.html` contains everything. You can deploy it to any static hosting provider in minutes, with no server-side configuration needed.

---

## Table of Contents

- [Build the app](#build-the-app)
- [GitHub Pages](#github-pages)
- [Netlify](#netlify)
- [Vercel](#vercel)
- [Render](#render)
- [Any other static host](#any-other-static-host)
- [Custom domain](#custom-domain)
- [Security notes](#security-notes)

---

## Build the app

Before deploying, generate the production output:

```bash
npm run build
```

This creates `dist/index.html`. Deploy the contents of the `dist/` folder (or the root directory — they are equivalent for this project).

---

## GitHub Pages

**Cost:** Free  
**Custom domain:** Supported  
**Deploy time:** ~1 minute

### Option A — Deploy from the `main` branch root (simplest)

1. Push your repository to GitHub.
2. Go to **Settings → Pages** in your repository.
3. Under **Source**, select `Deploy from a branch`.
4. Choose branch `main` and folder `/ (root)`.
5. Click **Save**.
6. Your app is live at `https://your-username.github.io/learning-easy/`.

### Option B — Deploy with GitHub Actions (recommended for `dist/`)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - uses: actions/deploy-pages@v4
```

Then enable **GitHub Actions** as the source in **Settings → Pages**.

---

## Netlify

**Cost:** Free tier available  
**Custom domain:** Supported  
**Deploy time:** ~1 minute

### Option A — Drag and drop (no CLI needed)

1. Run `npm run build` locally.
2. Go to [app.netlify.com](https://app.netlify.com).
3. Drag the `dist/` folder onto the Netlify drop zone.
4. Done — Netlify gives you a live URL instantly.

### Option B — Connect your GitHub repository

1. Click **Add new site → Import an existing project**.
2. Authorise GitHub and select your repository.
3. Set build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Click **Deploy**.

Every push to `main` triggers a new deployment automatically.

---

## Vercel

**Cost:** Free tier available  
**Custom domain:** Supported  
**Deploy time:** ~1 minute

### Option A — Vercel CLI

```bash
npm install -g vercel
npm run build
vercel deploy dist
```

### Option B — Connect your GitHub repository

1. Go to [vercel.com/new](https://vercel.com/new).
2. Import your GitHub repository.
3. Set:
   - **Framework Preset:** Other
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Click **Deploy**.

---

## Render

**Cost:** Free tier available (static sites are permanently free)  
**Custom domain:** Supported  
**Deploy time:** ~2 minutes

1. Go to [render.com](https://render.com) and sign in.
2. Click **New → Static Site**.
3. Connect your GitHub repository.
4. Set:
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
5. Click **Create Static Site**.

---

## Any other static host

Because the app is a single HTML file, it works on any host that can serve static files:

| Host | Notes |
|------|-------|
| Amazon S3 + CloudFront | Upload `dist/index.html`, enable static website hosting |
| Firebase Hosting | `firebase deploy` after `npm run build` |
| Cloudflare Pages | Connect repo, set `dist` as output folder |
| Surge.sh | `npm install -g surge && surge dist/` |
| Azure Static Web Apps | Use the GitHub Actions workflow template |

---

## Custom domain

All platforms above support custom domains. General steps:
1. Add your domain in the platform's settings.
2. Create a `CNAME` DNS record pointing to the platform's URL, or follow the platform's specific DNS instructions.
3. HTTPS is provisioned automatically on all platforms listed above.

---

## Security notes

- **API key safety:** The Gemini API key is stored in the user's browser `localStorage`. It is never included in the HTML file and is not visible in your repository. Each user enters their own key through the in-app settings modal.
- **HTTPS:** Always serve the app over HTTPS in production. All platforms above enforce HTTPS by default.
- **CSP:** The app ships with a `Content-Security-Policy` meta tag that restricts `connect-src` to only the APIs the app uses. Do not remove or loosen it.

---

## Vercel AI proxy (multi-user mode)

When deployed to Vercel, the app uses a layered AI-access strategy so visitors don't need to bring their own Gemini key just to try the app:

1. **User-supplied key** (in-app ⚙ AI Settings modal) — recommended, gives the user their own full 1500/day Gemini free quota.
2. **`config.js` key** — local-dev convenience only; not committed.
3. **Server-side proxy at `/api/gemini`** — fallback for visitors who haven't set their own key. Uses the deployment's `GEMINI_API_KEY` env var.

The Edge function lives at `api/gemini.js`. Vercel auto-detects it on deploy. To enable the proxy fallback:

1. Open your Vercel project → **Settings → Environment Variables**.
2. Add a new variable:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** your Gemini key from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - **Environment:** Production (and Preview if you want preview deploys to work)
3. Click **Save**, then **Redeploy** (Deployments → ⋯ → Redeploy) so the env var is bound to a new build.

The function will return `503` if the env var is unset — the frontend treats that as "AI unavailable" and shows the corresponding status in the settings modal. So you can ship the code without the env var and add it later.

### Cost / abuse warning

Every anonymous request hits the same key and draws from the same 1500/day quota. To protect the key:
- In Google AI Studio, restrict the key to specific HTTP referers if it ever leaks (the key only travels server-to-server in the proxy path, so it's invisible to browser DevTools — but rotation hygiene still matters).
- Watch the AI Studio dashboard. If you start seeing abuse, the easiest mitigation is to remove the env var (proxy returns 503, and the app degrades gracefully) and rely on per-user keys only.
- Long-term: add IP-based rate limiting via Vercel KV or Upstash Redis. Out of scope for the initial implementation.
