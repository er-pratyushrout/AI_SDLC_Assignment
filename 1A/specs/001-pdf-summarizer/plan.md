# Implementation Plan: AI PDF Summarizer

**Branch**: `main` (feature: `001-pdf-summarizer`) | **Date**: 2026-11-23 | **Spec**:
[spec.md](./spec.md)

**Input**: Approved feature specification and requested React/Vite, Express, MongoDB/Mongoose,
pdf-parse, and testing stack.

## Summary

Build a same-origin React/Vite application and Express REST service for session-scoped PDF
upload, text extraction, AI summaries, and summary actions. Use Mongoose for document/session
metadata and summaries, GridFS for extracted text that may exceed MongoDB's BSON document size
limit, pdf-parse for text extraction, and the OpenAI Responses API behind a server-only provider
module. A browser-session identifier scopes every record; ending a session triggers deletion of
its content, with an expiry cleanup worker as a recovery path.

## Technical Context

**Language/Version**: TypeScript 5.x; Node.js 26 LTS for the server and supported build tools.

**Primary Dependencies**: React, Vite, Express 5, Mongoose, MongoDB Node driver GridFS,
pdf-parse v2, OpenAI Node SDK (Responses API), Vitest, React Testing Library, Jest, Supertest,
Playwright.

**Storage**: Self-managed MongoDB; Mongoose collections for sessions, documents, and summaries;
GridFS for extracted text; temporary upload files are removed after extraction. No cloud
document-storage integration.

**Testing**: Vitest + React Testing Library for the client; Jest + Supertest for the server;
mongodb-memory-server for isolated API integration tests; Playwright for browser flows and
mobile viewport coverage; axe-based accessibility checks.

**Target Platform**: Current desktop and mobile browsers in the latest two major versions of
Chrome, Edge, Firefox, and Safari; same-origin web deployment; Node.js 26 LTS server.

**Project Type**: Web application with separate client and server packages.

**Performance Goals**: Meet spec NFR-004 and NFR-005: file validation feedback within 2 seconds,
and 95% of the agreed supported-PDF test set (up to 20 pages) summarized within 60 seconds on a
stable connection. Show stage-specific progress for longer work.

**Constraints**: PDF limit is inclusive at 20 MB; text-based PDFs only; no OCR, account,
sharing, collaboration, translation, notification, or cloud-storage feature. Do not log PDF
text, summaries, credentials, or raw provider errors. Keep application records scoped to the
current session and delete them at session end.

**Scale/Scope**: Initial individual-user release; no multi-user collaboration or horizontal
job-queue requirement. One active summary generation per document; additional concurrent
generation requests receive a conflict response.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Constitution requirement | Plan decision | Gate |
|---|---|---|
| React frontend and Node.js/Express backend | React + Vite client; Express 5 server | PASS |
| Modular separation of concerns | Client components/hooks/services and server routes/controllers/services/models | PASS |
| REST semantics and explicit status codes | Contract in `contracts/openapi.yaml` documents methods, response codes, and error shape | PASS |
| Reusable, accessible, responsive UI | Shared React components; keyboard, labels, focus, WCAG 2.1 AA and 320 px viewport checks | PASS |
| Boundary validation and safe errors | Validate file size, PDF signature, parse result, request fields, and session ownership; central error mapper | PASS |
| No secret exposure | Provider credential remains server-side; environment configuration; redacted structured logs | PASS |
| Critical logic tested at measurable coverage | 90% statement and branch coverage for critical logic; 80% statement coverage overall | PASS |
| No cloud storage integration | Self-managed MongoDB only; no object-storage provider | PASS |
| Session-only document/summary retention | Explicit session-end deletion plus an expiry cleanup worker; TTL is not the primary deletion mechanism | PASS WITH RELEASE CHECK |

MongoDB's TTL monitor is asynchronous and can delete records more than 60 seconds after
expiration under load. It cannot alone guarantee immediate physical deletion, and it does not
cascade deletion to GridFS chunks. The implementation MUST delete session records and GridFS
content explicitly when a session ends, and the cleanup worker MUST remove expired records and
their GridFS files. Data MUST become inaccessible to a new session immediately. Verify this
lifecycle and obtain privacy approval before release; do not describe TTL as immediate erasure.

## Architecture and Key Decisions

1. **Same-origin web application**: Vite serves the client in development and builds static
   assets for deployment. Express serves the built client and `/api` routes from one origin,
   keeping the session cookie same-site and avoiding broad CORS configuration.
2. **Anonymous browser session, not an account**: The server issues a random, opaque,
   HttpOnly, SameSite session cookie. Every document and summary query is scoped by that
   session identifier. There is no user profile, sign-in, or cross-session recovery.
3. **MongoDB with Mongoose**: Store session-scoped metadata and summary states in Mongoose
   models. Store extracted text in GridFS because an extracted text string can exceed MongoDB's
   16 MiB BSON document limit. Delete the temporary uploaded PDF after extraction; the
   approved spec asks for document information and regeneration, not an original-file viewer.
4. **Session cleanup**: `POST /api/session/end` performs explicit deletion of summaries,
   documents, extracted-text GridFS files, and the session record. A periodic cleanup worker
   retries expired sessions after abnormal client termination. TTL is a safety mechanism only,
   not a deletion guarantee.
5. **Synchronous upload validation, asynchronous summary generation**: Validate and parse the
   PDF before returning `201 Created`, so unsupported files receive an immediate actionable
   error. Summary generation returns `202 Accepted`; the client polls the summary status while
   preserving any last successful result.
6. **AI provider boundary**: Use one OpenAI implementation for the initial plan behind a small
   `SummarizationProvider` interface. Keep prompts, model selection, credentials, timeouts, and
   provider error translation on the server. Do not implement a second provider until required.
   Provider data-processing terms remain a release approval gate.
7. **PDF viewer excluded from the initial UI**: The approved specification requires document
   information, not an in-app PDF reader. `DocumentDetails` provides that information; adding
   the requested `PDFViewer` would require a specification change and additional file-retention
   behavior.
8. **Simple client state**: Use a typed reducer/context for the active session document list and
   selection. Keep network calls in a small API service and status/polling behavior in hooks;
   do not introduce a global state framework or job-queue service.

## API Overview

The full contract is [contracts/openapi.yaml](./contracts/openapi.yaml).

| Method and path | Purpose | Success |
|---|---|---|
| `POST /api/documents/upload` | Validate a PDF, extract text, create its session-scoped document | `201` |
| `POST /api/documents/{id}/summarize` | Start generation for `brief`, `standard`, or `detailed` mode | `202` |
| `GET /api/documents` | List documents in the current session | `200` |
| `GET /api/documents/{id}` | Return document information and processing state | `200` |
| `GET /api/documents/{id}/summary` | Return generation state and latest successful summary | `200` |
| `DELETE /api/documents/{id}` | Delete one document and its related content in the current session | `204` |
| `POST /api/session/end` | Delete all session content and end the anonymous session | `204` |

All errors use `{ "error": { "code": "...", "message": "...", "requestId": "..." } }`.
Messages are user-safe and do not include stack traces, secrets, extracted text, or provider
response bodies. IDs not belonging to the current session return `404`.

### Error Handling

- `400`: missing file, malformed request, or invalid summary mode.
- `404`: document absent or outside the current session.
- `409`: a summary generation is already active for the document.
- `413`: upload exceeds 20 MB.
- `415`: unsupported media type or non-PDF content.
- `422`: corrupt, encrypted/password-protected, empty, or text-free PDF.
- `502`: AI provider failure, invalid provider output, or provider timeout.
- `503`: MongoDB unavailable.
- `500`: unexpected error with a generic user message and correlated server-side request ID.

Central middleware maps known validation and provider errors to stable codes, logs structured
diagnostic fields only, and allows unexpected errors to reach the final error handler. Temporary
upload files and partially written GridFS files are removed on all failed paths.

## Frontend Components

- `FileUpload`: accessible file picker/drop zone, 20 MB validation, and upload feedback.
- `DocumentList`: current-session documents, selected item, and processing state.
- `DocumentDetails`: filename, size, page count when available, and status. Replaces `PDFViewer`
  for the approved initial scope.
- `SummaryOptions`: Brief, Standard, Detailed selection and regenerate action.
- `SummaryPanel`: structured key points, findings, and conclusions; preserves the previous
  successful result while a replacement is generated.
- `SummarySearch`: case-insensitive search within the displayed summary and no-match feedback.
- `SummaryActions`: copy and `.txt` export, with success/failure feedback.
- `ProgressStatus`: accessible stage/status announcement for upload, extraction, and generation.
- `ErrorMessage`: actionable, sanitized validation and service errors.

Reusable controls use labels, visible focus, semantic headings, and live status announcements.
Layouts are verified at 320 px and desktop widths; status is never conveyed by color alone.

## Project Structure

### Documentation (this feature)

```text
specs/001-pdf-summarizer/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── openapi.yaml
```

### Source Code (repository root)

```text
client/
├── index.html
├── vite.config.ts
└── src/
    ├── app/
    ├── components/
    ├── hooks/
    ├── pages/
    ├── services/
    ├── state/
    └── styles/
server/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── services/
│       ├── pdf/
│       ├── session/
│       └── summarization/
└── tests/
    ├── integration/
    └── unit/
tests/
└── e2e/
```

**Structure Decision**: Use the requested client/server separation with an npm workspace at the
repository root. Keep PDF extraction, session lifecycle, and AI provider concerns in distinct
server services; keep UI state and API transport out of presentation components. No separate
shared package is warranted for the initial feature.

## Test Strategy

- **Client unit/component tests**: Vitest + React Testing Library; query controls as users do
  (by label/role), and cover upload validation, all mode choices, progress/error states,
  summaries, search, clipboard failure, and export.
- **Server unit tests**: Jest for PDF validation/extraction mapping, mode-to-prompt behavior,
  provider result validation, session scoping, state transitions, and error mapping. Mock the
  external AI client.
- **API integration tests**: Jest + Supertest against an isolated MongoDB test instance.
  Cover multipart limits, malformed/empty/encrypted PDFs, response status/body contracts,
  session isolation, document deletion, session cleanup including GridFS chunks, AI failure,
  and preserving the previous summary.
- **Browser integration tests**: Playwright for upload-to-summary, regeneration, search, copy,
  export, and recovery after service failure at desktop and mobile viewport sizes. Run automated
  accessibility checks on each primary screen.
- **Quality gates**: critical logic >=90% statement and branch coverage; overall >=80%
  statement coverage; lint, format check, TypeScript check, tests, dependency audit, and secret
  scan pass before merge.

## Post-Design Constitution Check

The design retains the approved React/Express stack, separates presentation, transport,
application services, and persistence, and documents REST status/error contracts. The
accessibility, responsive, validation, secret-handling, and measurable test gates are represented
in the component and test plans. Self-managed MongoDB avoids cloud-storage integration.

The session-data gate remains a release check: explicit session-end deletion is the primary
path, with an expiry cleanup worker for lost close requests. MongoDB TTL is asynchronous and is
not represented as immediate erasure. Provider data-processing terms must also be approved
before real documents are sent to the AI service.

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| GridFS for extracted text | A 20 MB PDF can produce text larger than MongoDB's 16 MiB per-document limit | A plain string field cannot reliably store the supported input range |
| Session cleanup worker | Browser termination can prevent the explicit session-end request; GridFS chunks need coordinated deletion | TTL only removes eligible MongoDB documents asynchronously and does not cascade GridFS cleanup |
