# Watermark App

Desktop app shell for the watermark workflow, built with Tauri 2, React, TypeScript, and Tailwind CSS 4.

## Scripts

- `npm run dev` starts the Vite frontend.
- `npm run tauri dev` launches the desktop app in development mode.
- `npm run lint` runs ESLint.
- `npm run test` runs the Vitest suite.
- `npm run build` builds the frontend bundle.
- `npm run build:desktop` compiles the Tauri desktop binary without bundling installers.

## Project Structure

- `src/app` app entry and providers.
- `src/components` reusable UI pieces.
- `src/styles` global Tailwind and theme tokens.
- `src/test` Vitest setup and UI tests.
- `src-tauri` native Tauri application code.

## Local Prerequisites

- Node.js and npm
- Rust toolchain
- Windows C++ build tools when developing on Windows

Official setup references:

- https://v2.tauri.app/start/create-project/
- https://v2.tauri.app/start/prerequisites/
- https://tailwindcss.com/docs/installation/using-vite
