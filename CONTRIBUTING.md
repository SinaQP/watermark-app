# Contributing Guide

Thanks for your interest in contributing to Watermark App.

## Development setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run frontend dev server:
   ```bash
   npm run dev
   ```
3. Run desktop app:
   ```bash
   npm run tauri dev
   ```

## Quality checks

Before opening a PR, run:

```bash
npm run lint
npm run test
npm run build
```

## Code style

- TypeScript + React functional components.
- Keep reusable business logic in `src/lib`.
- Keep UI components focused and composable.
- Use clear naming over abbreviations.
- Prefer small, intentional changes.

## Commit messages

Use concise, descriptive commit messages, e.g.:

- `docs: rewrite README with architecture and setup details`
- `refactor: simplify session hint format copy`
- `chore: add contributing and license files`

## Pull requests

A good PR should include:

- What changed
- Why it changed
- How it was tested
- Any known limitations
