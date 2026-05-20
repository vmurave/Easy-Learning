# Changelog

All notable changes to **Learning Easy** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

> Changes staged for the next release.

---

## [1.0.0] — 2026-05-14

### Added

- **Core flashcard app** — single-file HTML/CSS/JS application with no external dependencies
- **SM-2 spaced repetition** — automatic scheduling of card review intervals based on answer quality
- **Auto word generation** — curated B2-level English vocabulary with instant add-to-deck
- **EN→RU translation** — automatic Russian translation via MyMemory API on word add
- **Translation variant picker** — 2–5 Russian translation chips for the user to choose from
- **Example sentences** — fetched from Free Dictionary API and shown during word add with Russian translations
- **Manual translation fallback** — input shown when the API cannot find a valid translation
- **Sentence writing practice** — optional text area on the flashcard to write a sentence using the word
- **Sentence validation** — checks whether the typed sentence contains the target word
- **Word source filter** — toggle between "My words", "Random words", and "Both" for review sessions
- **Day streak tracker** — counts consecutive days of study
- **Learning statistics** — total words, due now, learned count, and streak displayed on the home screen
- **Gemini AI integration** (optional — requires free API key):
  - AI-generated context-aware example sentences at B2 level
  - Synonym-aware translation evaluation in the Know step
  - Grammar and word-usage sentence analysis with Russian-language feedback
- **⚙ AI Settings modal** — in-app UI to enter, test, and save the Gemini API key
- **AI status badge** — header badge showing "AI on / AI off" state
- **Responsive layout** — works on desktop and mobile
- **localStorage persistence** — words, streaks, settings, and API key saved locally in the browser

### Technical

- Zero npm runtime dependencies — `live-server` is a dev-only dependency
- `npm run dev` — hot-reload development server (port 8080)
- `npm run build` — copies `index.html` to `dist/`
- `npm run preview` — serves `dist/` for production preview
- Content Security Policy meta tag restricting `connect-src` to known APIs
- SM-2 ease factor clamped to minimum 1.3

---

## [0.1.0] — 2026-05-01

### Added

- Initial prototype — static flashcard with hardcoded words
- Basic "Know / Don't Know" button pair
- Levenshtein-based fuzzy translation checking

---

[Unreleased]: https://github.com/your-username/learning-easy/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/your-username/learning-easy/releases/tag/v1.0.0
[0.1.0]: https://github.com/your-username/learning-easy/releases/tag/v0.1.0
