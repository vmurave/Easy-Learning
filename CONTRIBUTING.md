# Contributing to Learning Easy

Thank you for your interest in improving Learning Easy! Contributions of all kinds are welcome — bug reports, feature requests, documentation fixes, and code improvements.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Submitting Code Changes](#submitting-code-changes)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Commit Message Format](#commit-message-format)
- [Pull Request Checklist](#pull-request-checklist)

---

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold these standards. Please report unacceptable behaviour to the project maintainers.

---

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/your-username/learning-easy.git
   cd learning-easy
   ```
3. **Install** dev dependencies:
   ```bash
   npm install
   ```
4. **Start** the dev server:
   ```bash
   npm run dev
   ```
5. Open **http://localhost:8080** in your browser.

---

## How to Contribute

### Reporting Bugs

Before opening an issue, please:
- Search [existing issues](https://github.com/your-username/learning-easy/issues) to avoid duplicates.
- Check the browser console (`F12`) for error messages.

When filing a bug report, include:
- Browser name and version
- Steps to reproduce the issue
- What you expected to happen
- What actually happened
- Console error output (if any)

### Suggesting Features

Open an issue with the label `enhancement` and describe:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives you considered

### Submitting Code Changes

For anything beyond a trivial fix, please **open an issue first** to discuss the change before spending time on a pull request.

---

## Development Workflow

```bash
# 1. Create a feature branch from main
git checkout -b feat/my-new-feature

# 2. Make your changes to index.html
# (all logic lives in a single file)

# 3. Test your changes in the browser
npm run dev

# 4. Build and preview
npm run build
npm run preview

# 5. Commit your changes (see commit format below)
git add .
git commit -m "feat: add dark mode toggle"

# 6. Push your branch
git push origin feat/my-new-feature

# 7. Open a Pull Request on GitHub
```

---

## Code Style

The project is intentionally simple — a single `index.html` with embedded `<style>` and `<script>` blocks.

Please follow these conventions:
- **JavaScript**: ES2020+, `const`/`let` only (no `var`), `async/await` for async code
- **Functions**: Add a JSDoc comment to every new function
- **CSS**: Keep selectors flat; prefer class names over IDs in stylesheets
- **Accessibility**: Every interactive element must be keyboard-focusable with a visible focus indicator; all images need `alt` attributes
- **Security**: Never hard-code API keys; always validate and sanitise user input before inserting into the DOM
- **No third-party libraries**: The zero-dependency policy is a feature — avoid adding npm packages to the production bundle

---

## Commit Message Format

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>

[optional body]
[optional footer]
```

Common types:

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting (no logic change) |
| `refactor` | Code change that is neither a fix nor a feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Build process, dependency updates |

Examples:
```
feat: add PWA offline support
fix: correct SRS interval calculation for new words
docs: add deployment guide for Render
```

---

## Pull Request Checklist

Before opening a PR, please confirm:

- [ ] The app opens without console errors (`F12 → Console`)
- [ ] The change works on both desktop and mobile viewport sizes
- [ ] Keyboard navigation still works for all interactive elements
- [ ] No real API keys or secrets are included in the diff
- [ ] `npm run build` completes without errors
- [ ] The PR description explains **what** changed and **why**

---

Thank you for contributing! 🙏
