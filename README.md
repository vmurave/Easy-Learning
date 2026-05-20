# Learning Easy — English Learning Flashcards

> A zero-dependency, browser-based English vocabulary app with spaced repetition and optional AI-powered feedback.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![HTML](https://img.shields.io/badge/stack-HTML%20%2F%20CSS%20%2F%20JS-orange.svg)
![AI](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-green.svg)

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Screenshots](#screenshots)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Running Locally](#running-locally)
- [Environment Variables](#environment-variables)
- [Building for Production](#building-for-production)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Usage Guide](#usage-guide)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## About

**Learning Easy** is a self-contained English vocabulary flashcard app that runs entirely in the browser — no backend, no database, no sign-up required. Words are stored in `localStorage` and reviewed using a Spaced Repetition System (SRS) based on the SM-2 algorithm.

An optional [Google Gemini](https://aistudio.google.com/app/apikey) API key unlocks AI features: smarter example sentences, synonym-aware translation checking, and natural-language grammar feedback in Russian.

---

## Features

- **Flashcard review** with SM-2 spaced repetition scheduling
- **Auto word generation** — pulls B2-level English vocabulary automatically
- **Translation variants** — shows 2–5 Russian translation chips fetched from MyMemory
- **Example sentences** with Russian translations shown while adding a word
- **Manual translation fallback** — type your own translation when the API can't help
- **Word source filter** — practice only your own words, random words, or both
- **Sentence writing** — write a sentence using the word and receive feedback
- **Day streak** tracker
- **AI features** (optional — requires free Gemini API key):
  - Context-aware example sentence generation
  - Synonym-aware translation evaluation
  - Grammar + word-usage sentence analysis with Russian feedback
- **Zero dependencies** — single `index.html` file, works offline after first load
- **Responsive design** — works on desktop and mobile

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | Vanilla HTML5, CSS3, JavaScript (ES2020) |
| Storage | `localStorage` |
| SRS Algorithm | SM-2 (simplified) |
| Translation API | [MyMemory](https://mymemory.translated.net/) (free, no key required) |
| Dictionary API | [Free Dictionary API](https://dictionaryapi.dev/) (free, no key required) |
| AI (optional) | [Google Gemini 2.0 Flash Lite](https://ai.google.dev/) (free tier: 1 500 req/day) |
| Dev server | [live-server](https://github.com/tapio/live-server) |
| Build | Node.js copy script (no bundler) |

---

## Screenshots

> _Add your screenshots here._

| Flashcard view | Add word — translation picker | AI Settings |
|:-:|:-:|:-:|
| _(screenshot)_ | _(screenshot)_ | _(screenshot)_ |

---

## Quick Start

```bash
git clone https://github.com/your-username/learning-easy.git
cd learning-easy
npm install
npm run dev
```

Then open **http://localhost:8080** in your browser.

No API key is required for basic usage. See [Environment Variables](#environment-variables) to enable AI features.

---

## Installation

### Prerequisites

| Tool | Minimum version |
|------|----------------|
| Node.js | 16 or later |
| npm | 8 or later |

Check your versions:

```bash
node -v
npm -v
```

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/your-username/learning-easy.git

# 2. Enter the project directory
cd learning-easy

# 3. Install dev dependencies (only the live-server package)
npm install
```

> **No framework, no bundler.** The only dependency is `live-server` used for hot-reload during development.

---

## Running Locally

```bash
# Start with hot-reload (recommended for development)
npm run dev

# Start a simple static server (no hot-reload)
npm start
```

The app opens automatically at **http://localhost:8080**.

---

## Environment Variables

This is a **client-side-only** application. The only configurable secret is the **Gemini API key**, which is provided by a local `config.js` file that is **never committed** (it's listed in [`.gitignore`](.gitignore)).

### Setup

```bash
# 1. Copy the template
cp config.example.js config.js     # or on Windows: copy config.example.js config.js

# 2. Open config.js and paste your key
#    window.GEMINI_API_KEY = 'AIza...your_key_here';

# 3. Reload the app — AI features activate automatically
```

Get a free key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).

### How it works

- `index.html` loads `config.js` via `<script src="config.js">`.
- The script sets `window.GEMINI_API_KEY` before the main app code runs.
- If `config.js` is missing or the key is empty, AI features are silently disabled and the app falls back to the Free Dictionary API and regex-based checks.

> **Security notes**
> - Never commit `config.js` — it contains a real secret.
> - Restrict the key in Google AI Studio to your deployment URL (HTTP-referrer rule) and set a per-key quota.
> - Rotate the key periodically.

See [`.env.example`](.env.example) for additional reference.

---

## Building for Production

```bash
npm run build
```

This copies `index.html` to the `dist/` folder:

```
dist/
└── index.html   ← deploy this file
```

Preview the production build locally:

```bash
npm run preview
```

---

## Deployment

The app is a single static HTML file — it can be deployed to any static hosting provider in seconds. See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step instructions for:

- **GitHub Pages** (free, one-click)
- **Netlify** (free, drag-and-drop or CLI)
- **Vercel** (free, CLI)
- **Render** (free tier)

---

## Project Structure

```
learning-easy/
├── index.html          # Complete application (HTML + CSS + JS)
├── config.example.js   # Template for the local Gemini API key
├── config.js           # Local key file — git-ignored, you create this
├── scripts/
│   └── build.js        # Build script — copies index.html + config.js → dist/
├── dist/               # Production build output (git-ignored)
├── package.json
├── .env.example        # Reference for in-app configuration
├── .gitignore
├── README.md
├── CONTRIBUTING.md
├── DEPLOYMENT.md
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
└── LICENSE
```

> All application logic lives in `index.html`. CSS is in a `<style>` block and JavaScript is in a `<script>` block at the bottom of the file.

---

## Usage Guide

### Adding a word

1. Type an English word in the input field and press **Add** (or Enter).
2. The app fetches 2–5 Russian translation variants and example sentences.
3. Click the correct translation chip to confirm.
4. If no translation is found automatically, type it manually and click **Confirm**.

### Reviewing flashcards

1. A word appears on the card.
2. _(Optional)_ Type your translation in the text field.
3. _(Optional)_ Write a sentence using the word.
4. Click **✓ Know** if you remember — the app checks your translation.
5. Click **✗ Don't Know** to see the answer and an example sentence.
6. The card's next review date is scheduled automatically using SM-2.

### AI features (optional)

1. Click **⚙** in the header to open AI Settings.
2. Paste your [free Gemini API key](https://aistudio.google.com/app/apikey).
3. Click **Test connection** to verify.
4. Click **Save** — the badge in the header turns **● AI on**.

With AI enabled:
- Example sentences are tailored to B2 level.
- **✓ Know** accepts synonyms and near-correct translations.
- After clicking Know, grammar feedback on your sentence is shown in Russian.

### Word source filter

Use the **My words / Random / Both** toggle to control which words appear in review sessions:
- **My words** — only words you added manually.
- **Random** — only auto-generated B2 words.
- **Both** — all words.

---

## Roadmap

- [ ] Dark mode
- [ ] Export / import word list (JSON)
- [ ] Audio pronunciation (Web Speech API)
- [ ] Multiple languages beyond English → Russian
- [ ] Progressive Web App (PWA) with offline caching
- [ ] Statistics page (retention graphs)
- [ ] Custom card decks

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for the code style, workflow, and how to open a pull request.

---

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.
