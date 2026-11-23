# Quickstart: PDF Document Chat

The current implementation covers setup, shared infrastructure, and User Story 1 (PDF
upload, processing, and viewing). Chat and summary checks are reserved for later phases.

## Prerequisites

- Node.js 22 LTS and npm
- A backend AI provider configured for the selected provider adapter
- A selectable-text PDF fixture within 20 MB and 200 pages
- A non-PDF or invalid PDF fixture for rejection tests

## Configuration and Startup

1. The backend defaults to port `3001`; copy `backend/.env.example` to `backend/.env` only
   if you need to override it. User Story 1 requires no AI provider credentials.
2. From the repository root, install the workspace dependencies:

   ```powershell
   npm install
   ```

3. Start the API and frontend in separate terminals:

   ```powershell
   npm --prefix backend run dev
   ```

   ```powershell
   npm --prefix frontend run dev
   ```

4. Open the Vite URL printed by the frontend command. The frontend development server
   proxies `/api` requests to the local Express server.

## User Story 1 Validation

1. Confirm `GET /api/health` returns `200`.
2. Upload a valid text-based PDF. Confirm the application shows a processing state,
   reaches ready, and displays the same local PDF beside the workspace.
3. Use the PDF page controls and confirm the displayed page changes.
4. Replace the PDF. Confirm the new PDF is the only active document.
5. Try a non-PDF, corrupt, password-protected, over-limit, and no-text PDF. Confirm each
   failure is explained and no failed document reaches ready state.
6. End the browser session and open a new one. Confirm no document is restored.
7. Repeat keyboard-only at 320 px, 768 px, and 1440 px widths; confirm the upload and
   viewer remain operable.

Question-answering, session chat history, and summary scenarios will be enabled after
User Stories 2 and 3 are implemented.

## Automated Validation

Run the implemented workspace scripts (exact root script names should be wired during
implementation) for:

- Frontend: Vitest + React Testing Library, including accessible component and reducer tests.
- Backend: Jest + Supertest, including PDF validation, resource lifecycle, JSON error, and
  event-stream contract tests.
- Quality gates: lint, format check, critical backend coverage thresholds (90% line and
  80% branch), and the complete test suite within 10 minutes.
- Performance: documented normal-load measurements for local API p95, PDF readiness, and
  AI stream first-event p95, with upload transfer and provider latency measured separately.

See [the OpenAPI contract](contracts/openapi.yaml) and [the data model](data-model.md)
for request shapes, status transitions, and error semantics.
