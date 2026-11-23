# Implementation Plan: PDF Document Chat

**Branch**: `001-pdf-document-chat` (not created) | **Date**: 2026-11-23 |
**Spec**: [spec.md](spec.md)

**Input**: Feature specification from
`/specs/001-pdf-document-chat/spec.md`

## Summary

Build a single-screen React desktop web application with an Express API. The browser
renders the user's local PDF and owns session chat state. The API validates and extracts
PDF text, keeps only an expiring in-memory document record, retrieves relevant text for
questions, and calls a provider-neutral streaming AI adapter for answers and summaries.
No database, durable file storage, authentication, or multi-provider routing is introduced.

Uploads are accepted asynchronously so parsing does not block the request; the browser
polls document status until ready. Successful AI responses stream to the chat and summary
panels so users see progress and the first response can meet the constitution's streaming
latency target. The concrete AI provider is deliberately left configurable because neither
the feature request nor approved specification selected one.

## Technical Context

**Language/Version**: JavaScript (ES modules); Node.js 22 LTS; React 18

**Primary Dependencies**: Vite; React-PDF 9.2.1 with React 18 and matching PDF.js
4.8.69; Axios for JSON REST calls; Express; pdf-parse 2.4.5; Multer with in-memory upload
storage; dotenv; React Context with `useReducer`; one provider-neutral AI adapter. The
browser Fetch API is used only for streaming AI responses.

**Storage**: Browser memory for the selected `File`, chat, and summary; a bounded,
expiring in-memory backend store for extracted text and document metadata. No database,
filesystem persistence, cloud storage, or browser persistent storage.

**Testing**: Vitest and React Testing Library (frontend); Jest and Supertest (backend);
focused contract and integration tests. Mock the AI adapter in deterministic tests.

**Target Platform**: Current desktop browsers; Node.js 22 LTS server

**Project Type**: Web application (frontend plus backend)

**Performance Goals**: Meet SC-002: at least 95% of supported PDFs (up to 20 MB and
200 pages) ready within 10 seconds under normal operating conditions. Meet the
constitution's p95 target of 300 ms for local API operations and 1 second to first event
for streamed AI operations; measure server handling separately from upload transfer and
AI completion.

**Constraints**: Exactly one active PDF per browser session; 20 MB and 200-page limits;
selectable text only; no OCR or persistence. Validate file signature and parse result, not
only the browser-provided MIME type or extension. Never log document text, prompts,
responses, API keys, or session identifiers.

**Scale/Scope**: One user workspace and one active document per browser session; one
backend process with bounded volatile document state; one single-page frontend.

## Constitution Check

**Pre-design gate: PASS**

- **Architecture**: React and Express are kept in separate frontend/backend projects;
  UI, state, API, validation, PDF processing, document storage, and AI integration have
  distinct responsibilities.
- **REST and state**: Document operations use resource paths and appropriate HTTP
  methods/statuses. JSON is used for control operations; successful generation endpoints
  use a documented event stream. Chat and summary state remain browser-session scoped.
- **Accessibility and responsiveness**: The single-screen layout supports keyboard and
  assistive-technology use and reflows at 320 px, 768 px, and 1440 px.
- **Validation, security, and tests**: Upload boundaries enforce size, type, signature,
  page-count, and extractable-text checks. Errors use a stable shape and hide internals.
  Critical paths have success/failure tests, including mocked AI failure cases.
- **Secrets**: Provider credentials are read only by the backend from environment
  configuration; `.env` is ignored and `.env.example` contains placeholders only.
- **Measurable quality**: CI targets at least 90% line and 80% branch coverage on critical
  backend logic, zero skipped critical tests, a 10-minute full test-suite ceiling, no
  serious/critical automated accessibility violations, and the latency goals above.
- **Simplicity**: No database, vector service, authentication, routing framework, or
  abstraction for multiple AI providers is added. A small lexical retrieval step and
  bounded text chunks avoid sending an entire long document to every model request.

No constitution violations are identified. The AI provider is not named in the approved
specification; the plan defines a single adapter boundary and requires provider selection
and data-processing review before deployment, rather than silently selecting a vendor.

## Architecture and Key Decisions

1. **One frontend and one backend**: Keep React/Vite under `frontend/` and Node/Express
   under `backend/`. A single-screen app needs no client router.
2. **Local PDF viewing, server-side extraction**: React-PDF 9.2.1 receives the selected
   browser `File`; `pdf-parse` 2.4.5 receives the same file buffer for text and metadata.
   The parser is disposed after use; the original PDF is not written to disk or retained.
3. **Asynchronous, volatile document lifecycle**: `POST /api/documents` validates the
   upload and returns a document ID with `processing` status. Parsing runs in the
   background; `GET /api/documents/{documentId}` reports `processing`, `ready`, or
   `failed`. The backend stores extracted text only in a size-bounded, expiring in-memory
   record. `DELETE` removes it immediately when possible; expiry is a cleanup fallback.
   The browser never restores the document ID or chat in a later session.
4. **React-PDF compatibility**: Use React-PDF 9.x because the current 11.x line requires
    React 19; pin the PDF.js worker dependency to the version required by the selected
    React-PDF release and configure it in the module rendering the PDF.
5. **Context plus reducer**: A single React Context/reducer owns upload state, the local
   `File`, chat messages, summary, and pending/error status. This avoids an additional
   state package for one screen. No chat or document data is written to localStorage or
   sessionStorage.
6. **Bounded document grounding**: Normalize extracted text into bounded overlapping
   chunks. For questions, rank chunks with simple lexical relevance and provide the
   highest-scoring passages plus a bounded recent conversation history to the AI adapter.
   For summaries, summarize chunks in batches and combine their summaries. Do not add a
   vector database or expose page citations; if no relevant content is found, the assistant
   must state that the answer is not in the document.
7. **Streaming generation**: Chat and summary POST requests return `text/event-stream`.
   The browser uses Fetch to consume incremental results; Axios remains the client for
   upload, status polling, and deletion. This small exception to Axios-only calls avoids
   buffering AI output and supports the constitution's first-event target.
8. **Provider boundary**: A backend `AiProvider` interface accepts bounded document
   context and yields output chunks. One provider implementation is selected through
   backend configuration; there is no provider fallback or key in frontend code. Tests use
   a deterministic fake provider.
9. **Safe rendering and errors**: Render assistant content as text, not untrusted HTML.
   Return JSON errors before a stream starts and a typed `error` event if generation fails
   after streaming begins. Preserve prior messages and mark the in-progress message as
   failed/retryable.

### Endpoint Overview

| Method | Path | Purpose | Success |
|---|---|---|---|
| `GET` | `/api/health` | Liveness check | `200` JSON |
| `POST` | `/api/documents` | Validate and accept one PDF for processing | `202` JSON |
| `GET` | `/api/documents/{documentId}` | Poll readiness and retrieve safe metadata | `200` JSON |
| `DELETE` | `/api/documents/{documentId}` | Release volatile extracted document data | `204` |
| `POST` | `/api/documents/{documentId}/messages` | Ask a question with recent conversation context | `200` event stream |
| `POST` | `/api/documents/{documentId}/summaries` | Generate a document summary | `200` event stream |

Full request/response definitions and error events are in
[contracts/openapi.yaml](contracts/openapi.yaml).

### Frontend Components

- **`App` / `DocumentSessionProvider`**: Own the single-page layout and reducer-backed
  session state; clear document-specific chat and summary when a replacement is selected.
- **`PdfUploader` / `DocumentStatus`**: Accessible file selection, upload progress,
  readiness state, and actionable validation errors.
- **`PdfViewer`**: Render the local `File` with React-PDF and an accessible loading/error
  state; configure the matching PDF.js worker in the module that renders the PDF.
- **`ChatPanel`**: Compose `MessageList` and `QuestionComposer`; disable empty submissions,
  announce streamed content and errors, and provide retry for failed requests.
- **`SummaryPanel`**: Request and display the streamed summary, with independent loading
  and retry state.
- **`ErrorNotice`**: Present recoverable errors with text and a clear next action.

Use semantic headings/regions, visible labels, keyboard-operable controls, focus management,
and live status announcements. Use a two-column desktop layout that stacks at narrow
widths without dropping either workspace.

## Error Handling and Validation

- Validate the multipart field, 20 MB size, file signature, PDF parse result, 200-page
  ceiling, and non-empty selectable text. Multer accepts one file part, no extra fields,
  and up to 20 MB. The backend runs at most two PDF parses concurrently and queues at
  most four more uploads; additional work receives `503` with a retryable error. The
  volatile document store holds at most 20 records and expires inactive records after
  30 minutes. Memory storage holds queued upload buffers until parsing begins.
  Do not trust filename or MIME alone.
- Return `400` for malformed/missing fields, `413` for size excess, `415` for a non-PDF,
  and `422` for a synchronous signature/preflight failure. Parser-discovered corruption,
  encryption, no-text, and page-limit failures become a `failed` document status with a
  safe reason. Return `404` for an unknown or expired document and `409` when a document
  is not ready.
- Use `{ "error": { "code": "...", "message": "...", "details": [] } }` for JSON errors.
  Do not include stack traces, extracted text, provider response bodies, or secrets.
- After generation headers are sent, use an `error` SSE event with the same safe error
  fields; close the stream and leave previous conversation state intact.
- Treat provider timeouts, unavailable services, and malformed provider output as
  retryable `503`/`502` failures before streaming or typed stream errors afterward.
- Replace/delete clears frontend state immediately and issues a best-effort `DELETE`.
  Expiry bounds abandoned backend records; a missing/expired document prompts re-upload.
- Never execute instructions found in PDF text. Treat PDF content and user questions as
  untrusted model input and constrain output to document-grounded answers.

## Testing Strategy

- **Frontend unit/component**: reducer state transitions; upload/readiness/error views;
  PDF viewer loading/error; empty-input validation; streamed chat/summary rendering;
  retry behavior; replacement clearing; responsive and keyboard/accessibility checks.
- **Backend unit**: file boundary validation; PDF parsing cases (valid, corrupt, encrypted,
  empty, no text, too many pages); document-store expiry/deletion; chunking/retrieval;
  question grounding and summary aggregation using the fake provider; error mapping.
- **API integration/contract**: statuses and schemas for every endpoint; missing/invalid
  uploads; processing-to-ready/failed polling; not-ready/expired document; stream success,
  stream error, provider timeout, and delete. Verify no endpoint leaks extracted text.
- **End-to-end acceptance**: upload a selectable-text fixture, view it beside chat, ask
  an answerable and unanswerable question, generate a summary, replace the PDF, then open
  a new browser session and verify no previous document or chat is restored.
- **Quality gates**: Cover critical backend logic at >=90% line and >=80% branch; no
  skipped critical tests; lint/format checks pass; all tests finish within 10 minutes.
  Automated accessibility reports zero serious/critical violations. Manually check
  keyboard operation and 320 px, 768 px, and 1440 px layouts.
- **Performance**: Under a documented normal-load profile, measure upload acceptance and
  lightweight local API handling separately from file transfer and parsing; verify
  readiness against SC-002; measure p95 first event for chat and summary with the selected
  provider. A provider that misses the streaming target requires a documented,
  time-bounded exception rather than a silent target change.

## Project Structure

### Documentation (this feature)

```text
specs/001-pdf-document-chat/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
├── checklists/
│   └── requirements.md
└── spec.md
```

### Source Code (repository root)

```text
package.json
package-lock.json
.gitignore
frontend/
├── package.json
├── index.html
├── vite.config.js
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── components/
    │   ├── PdfUploader.jsx
    │   ├── PdfViewer.jsx
    │   ├── DocumentStatus.jsx
    │   ├── ChatPanel.jsx
    │   ├── MessageList.jsx
    │   ├── QuestionComposer.jsx
    │   ├── SummaryPanel.jsx
    │   └── ErrorNotice.jsx
    ├── context/
    │   └── DocumentSessionContext.jsx
    ├── services/
    │   └── documentsApi.js
    ├── styles/
    │   └── app.css
    └── tests/
        ├── components/
        └── unit/
backend/
├── package.json
├── .env.example
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   │   └── env.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── upload.js
│   ├── routes/
│   │   └── documents.js
│   ├── controllers/
│   │   └── documentsController.js
│   └── services/
│       ├── pdfService.js
│       ├── documentStore.js
│       ├── retrievalService.js
│       ├── questionService.js
│       ├── summaryService.js
│       └── aiProvider.js
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/
eslint.config.js
.prettierrc.json
```

**Structure Decision**: Use two runtime projects, `frontend/` and `backend/`, plus a
root npm workspace for shared scripts and lockfile. The feature is one web application;
separating the browser bundle from the secret-bearing API prevents provider credentials
from entering client code. No separate shared package is needed at this scope.

## Complexity Tracking

No constitution violations or additional architectural projects are proposed.
