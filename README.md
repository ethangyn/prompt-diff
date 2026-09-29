# prompt-diff

A fast, private, client-side tool for seeing exactly how two prompts differ.

## How to use

1. Open `index.html` in a browser, or serve this folder with any static web server.
2. Edit Prompt A and Prompt B. Near-identical sample system prompts are filled in already.
3. Read the live diff. Side by side is the default; switch to inline for a single stream. Removed text is red and crossed out; added text is green.
4. Use the stats row to compare characters, words, and rough tokens (words × 1.3).

Everything runs in the browser. There is no build step, no upload, and no analytics.

## GitHub Pages

https://ethangyn.github.io/prompt-diff/

Publish the `main` branch from the repository root (`/`).

## Files

- `index.html` — page structure
- `styles.css` — responsive visual design
- `app.js` — sample prompts, client-side diffing, stats, and interactions
- `fonts/` — self-hosted Space Grotesk and DM Mono, under the SIL Open Font License
