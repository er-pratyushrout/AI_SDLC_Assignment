# Quickstart: AI PDF Summarizer

This guide describes the planned local setup and acceptance checks. Commands correspond to
scripts to be added to the npm workspace during implementation.

## Prerequisites

- Node.js 26 LTS and npm.
- A self-managed local MongoDB instance; no cloud document-storage service is used.
- An OpenAI API key approved for the application's document-processing policy.
- A text-based, non-password-protected PDF for the happy-path checks.

## Configure and run

1. Install workspace dependencies:

   ```powershell
   npm install
   ```

2. Create the local server environment file and set `MONGODB_URI`, `OPENAI_API_KEY`, and
   `OPENAI_MODEL`. Keep `.env` out of version control; never put the provider key in client
   variables or `VITE_*` settings.

   ```powershell
   Copy-Item .env.example .env
   ```

3. Start the client and API in development:

   ```powershell
   npm run dev
   ```

4. Open the Vite development URL shown in the terminal. The Vite server proxies `/api` to
   Express so browser requests use the session cookie.

## Validation scenarios

Run automated checks:

```powershell
npm test
npm run test:integration
npm run test:e2e
npm run typecheck
npm run lint
```

Expected results: unit/component tests, isolated MongoDB API tests, browser tests, type checking,
and linting all pass. Coverage meets the constitution's critical-logic and overall thresholds.

Manually verify the core workflow:

1. Upload a readable, text-based PDF at or below 20 MB. The app identifies the upload and
   extraction stages, then adds a document with filename, size, page count when available, and
   ready status.
2. Generate a Brief, Standard, and Detailed summary in turn. Each request shows progress; the
   completed result exposes key points, findings, and conclusions.
3. Start regeneration, then simulate provider failure. The app reports an actionable error and
   keeps the last successful summary visible.
4. Search a phrase that exists and one that does not. Confirm matching text and a no-match
   message respectively.
5. Copy the summary and export it as a `.txt` file. Confirm clear feedback if clipboard access
   is denied.
6. Upload an invalid, password-protected, empty, and oversized file. Confirm the correct
   user-safe rejection and that no false successful document appears.
7. Upload two PDFs, switch between them, then end the session. Confirm records are unavailable
   in a new session and that session cleanup removes summaries and GridFS text.
8. Repeat keyboard-only at a 320 px viewport and desktop width. Confirm focus visibility,
   labels, announced status, no keyboard trap, and no horizontal scrolling.

## API contract checks

Use the request and response schemas in [contracts/openapi.yaml](./contracts/openapi.yaml).
The contract's session cookie is issued by the server; do not manually reuse a document ID
across sessions. Error responses use the documented `error.code`, `error.message`, and
`error.requestId` fields.

## Release checks

- Verify provider data-processing terms before sending real user documents.
- Verify explicit session cleanup and the expired-session cleanup worker, including GridFS
  chunks. MongoDB TTL behavior alone is not evidence of immediate erasure.
- Run all CI quality gates and ensure no secret is present in source, logs, test fixtures, or
  client build output.
