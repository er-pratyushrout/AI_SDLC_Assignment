---
description: "Implementation tasks for the AI PDF Summarizer"
---

# Tasks: AI PDF Summarizer

**Input**: Design documents from `specs/001-pdf-summarizer/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/openapi.yaml`,
and `quickstart.md`

**Tests**: Included because the specification and request require unit, API integration,
end-to-end, accessibility, and acceptance testing.

**Organization**: Tasks are grouped by approved user story, in priority order, so each story
can be implemented and verified as an incremental delivery.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Tasks can run in parallel after their stated phase prerequisites because they touch
  separate files and do not depend on one another.
- **[Story]**: Maps a task to the corresponding user story in `spec.md`.
- Every task names its implementation or test file path.
- Canonical field constraints are cited as `data-model.md` plus the exact `Entity.field`.

## Path Conventions

- Client: `client/src/`
- Server: `server/src/` and `server/tests/`
- Browser acceptance tests: `tests/e2e/` and `tests/acceptance/`
- API contract: `specs/001-pdf-summarizer/contracts/openapi.yaml`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the npm workspace and separate React/Vite and Express packages.

- [X] T001 Configure npm workspaces, root scripts, and lockfile in `package.json` and `package-lock.json`.
- [X] T002 [P] Scaffold the React/Vite TypeScript client entry points in `client/package.json`, `client/index.html`, `client/src/main.tsx`, and `client/src/app/App.tsx`.
- [X] T003 [P] Scaffold the TypeScript Express server package and app entry points in `server/package.json`, `server/tsconfig.json`, `server/src/app.ts`, and `server/src/server.ts`.
- [X] T004 [P] Configure repository formatting and lint rules in `.editorconfig`, `.prettierrc.json`, and `eslint.config.js`.
- [X] T005 Configure Vitest, jsdom, React Testing Library setup, and coverage defaults in `client/vite.config.ts` and `client/src/test/setup.ts`.
- [X] T006 Configure Jest and Supertest setup in `server/jest.config.ts` and `server/tests/setup/jest.setup.ts`.
- [X] T007 [P] Configure Playwright browser projects and test discovery in `playwright.config.ts`.
- [X] T008 Add CI jobs for workspace install, lint, typecheck, and test scripts in `.github/workflows/ci.yml`.

**Checkpoint**: Client, server, test runners, and workspace scripts initialize successfully.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish secure configuration, database access, anonymous session scope, common
error handling, and test database lifecycle before story implementation.

**⚠️ CRITICAL**: Complete this phase before starting any user story.

- [X] T009 Validate server environment variables and add a safe example configuration in `server/src/config/env.ts`, `.env.example`, and `.gitignore`.
- [X] T010 Configure the Mongoose connection, readiness handling, and GridFS bucket initialization in `server/src/config/database.ts`.
- [X] T011 Implement the BrowserSession Mongoose model and indexes in `server/src/models/browser-session.model.ts` using the canonical definitions in `data-model.md` for `BrowserSession.sessionId`, `BrowserSession.createdAt`, `BrowserSession.lastActivityAt`, `BrowserSession.expiresAt`, `BrowserSession.endedAt`, and `BrowserSession.state`.
- [X] T012 Write session-cookie and session-scope unit tests first in `server/tests/unit/session.middleware.test.ts`.
- [X] T013 Implement anonymous session creation, refresh, cookie settings, and request scoping in `server/src/services/session/session.service.ts` and `server/src/middleware/session.middleware.ts`; apply the canonical definitions in `data-model.md` for `BrowserSession.sessionId`, `BrowserSession.lastActivityAt`, `BrowserSession.expiresAt`, and `BrowserSession.state`.
- [X] T014 [P] Write sanitized-error and request-correlation unit tests first in `server/tests/unit/error-handler.test.ts`.
- [X] T015 Implement request IDs, structured redacted logging, typed application errors, and the final Express error handler in `server/src/middleware/request-id.middleware.ts`, `server/src/services/logging/logger.ts`, and `server/src/middleware/error-handler.middleware.ts`.
- [X] T016 [P] Implement the same-origin API transport with cookie credentials and stable JSON error decoding in `client/src/services/api-client.ts`.
- [X] T017 Configure isolated MongoDB/GridFS test setup and teardown in `server/tests/setup/test-database.ts`.

**Checkpoint**: Session scoping, database setup, error handling, and test infrastructure are ready.

---

## Phase 3: User Story 1 - Upload and summarize a PDF (Priority: P1) 🎯 MVP

**Goal**: Accept a supported PDF, extract its text, generate a selected-mode summary, and give
stage-specific progress and actionable failure feedback.

**Independent Test**: Upload a readable text PDF at or below 20 MB, generate Brief, Standard,
and Detailed summaries, and verify key points/findings/conclusions. Verify over-limit,
unsupported, encrypted, corrupt, and text-free PDFs are rejected without a false success state.

### Tests for User Story 1

- [X] T018 [P] [US1] Write failing unit tests for the 20 MB boundary, PDF signature, encrypted/corrupt files, and empty extracted text in `server/tests/unit/pdf.service.test.ts`.
- [X] T019 [P] [US1] Write failing provider tests for each summary mode, invalid provider output, timeout, and sanitized provider failure in `server/tests/unit/openai-provider.test.ts`.
- [X] T020 [P] [US1] Write failing OpenAPI contract tests for `POST /api/documents/upload`, `POST /api/documents/{id}/summarize`, and `GET /api/documents/{id}/summary` in `server/tests/integration/pdf-summary.contract.test.ts`.
- [X] T021 [P] [US1] Write failing accessible upload-control tests for file selection, oversize feedback, pending state, and parse errors in `client/src/components/FileUpload.test.tsx`.
- [X] T022 [P] [US1] Write failing summary rendering tests for key points, findings, conclusions, and loading/error states in `client/src/components/SummaryPanel.test.tsx`.

### Implementation for User Story 1

- [X] T023 [P] [US1] Implement the Document Mongoose schema and indexes in `server/src/models/document.model.ts` using the canonical definitions in `data-model.md` for `Document._id`, `Document.sessionId`, `Document.fileName`, `Document.fileSizeBytes`, `Document.pageCount`, `Document.uploadedAt`, `Document.processingStatus`, `Document.extractedTextFileId`, `Document.generationStatus`, `Document.currentSummaryId`, `Document.lastErrorCode`, and `Document.expiresAt`.
- [X] T024 [P] [US1] Implement the Summary Mongoose schema and indexes in `server/src/models/summary.model.ts` using the canonical definitions in `data-model.md` for `Summary._id`, `Summary.sessionId`, `Summary.documentId`, `Summary.summaryType`, `Summary.status`, `Summary.content`, `Summary.content.keyPoints`, `Summary.content.findings`, `Summary.content.conclusions`, `Summary.createdAt`, `Summary.completedAt`, `Summary.errorCode`, and `Summary.expiresAt`.
- [X] T025 [US1] Implement extracted-text GridFS save, read, and delete operations in `server/src/services/pdf/extracted-text.store.ts`; apply the canonical definitions in `data-model.md` for `ExtractedTextFile.fileId`, `ExtractedTextFile.sessionId`, `ExtractedTextFile.documentId`, `ExtractedTextFile.expiresAt`, and `ExtractedTextFile.content`.
- [X] T026 [US1] Implement upload limits, PDF signature/type checks, pdf-parse extraction, page-count mapping, and temporary-file cleanup in `server/src/services/pdf/pdf.service.ts`; map accepted metadata using `data-model.md` definitions for `Document.fileName`, `Document.fileSizeBytes`, `Document.pageCount`, `Document.processingStatus`, `Document.extractedTextFileId`, and `Document.lastErrorCode`.
- [X] T027 [US1] Implement the OpenAI Responses API adapter, mode-specific prompts, output validation, timeout, and provider error translation in `server/src/services/summarization/openai.provider.ts`.
- [X] T028 [US1] Implement initial summary generation, processing-state updates, and validated completion in `server/src/services/summarization/summary.service.ts`; use `data-model.md` definitions for `Summary.sessionId`, `Summary.documentId`, `Summary.summaryType`, `Summary.status`, `Summary.content`, `Summary.content.keyPoints`, `Summary.content.findings`, `Summary.content.conclusions`, `Summary.completedAt`, `Summary.errorCode`, `Summary.expiresAt`, `Document.generationStatus`, and `Document.currentSummaryId`.
- [X] T029 [US1] Implement the upload controller and `POST /api/documents/upload` route in `server/src/controllers/document-upload.controller.ts` and `server/src/routes/documents.routes.ts`; persist only successfully parsed PDFs and return the status/body defined in `contracts/openapi.yaml`.
- [X] T030 [US1] Implement `POST /api/documents/{id}/summarize` and `GET /api/documents/{id}/summary` in `server/src/controllers/summary.controller.ts` and `server/src/routes/documents.routes.ts`, including `202`, `409`, `422`, `502`, and `503` contract responses.
- [X] T031 [US1] Implement typed upload, summarize, and summary-status calls in `client/src/services/document-api.ts` using the base transport in `client/src/services/api-client.ts`.
- [X] T032 [US1] Implement document and summary state transitions plus upload/status polling hooks in `client/src/state/session.reducer.ts`, `client/src/hooks/useDocumentUpload.ts`, and `client/src/hooks/useSummary.ts`.
- [X] T033 [US1] Implement the accessible `FileUpload`, initial `SummaryOptions`, `ProgressStatus`, and `ErrorMessage` components in `client/src/components/FileUpload.tsx`, `client/src/components/SummaryOptions.tsx`, `client/src/components/ProgressStatus.tsx`, and `client/src/components/ErrorMessage.tsx`.
- [X] T034 [US1] Implement the structured key-points/findings/conclusions result view in `client/src/components/SummaryPanel.tsx`.
- [X] T035 [US1] Wire upload, mode selection, progress, summary display, and recovery states into `client/src/pages/SummarizerPage.tsx`.
- [X] T036 [US1] Implement the upload-to-summary Playwright flow, including all three modes and invalid-file rejection, in `tests/e2e/upload-summary.spec.ts`.
- [X] T037 [US1] Verify acceptance criteria SC-001 and SC-003 plus NFR-004 and record the runnable test mapping in `tests/acceptance/us1-upload-summary.md`.

**Checkpoint**: US1 works independently and satisfies the upload, extraction, summary, progress,
and rejection scenarios.

---

## Phase 4: User Story 2 - Review documents during the session (Priority: P2)

**Goal**: List and inspect prior session documents and summaries, scope all access to the active
anonymous session, and remove data when a document or session ends.

**Independent Test**: Seed two session-owned documents and summaries, list and switch between
them, verify metadata and summary association, then verify an unrelated session sees neither.
End the owning session and verify its summaries, documents, and GridFS text are deleted.

### Tests for User Story 2

- [ ] T038 [P] [US2] Write failing contract/integration tests for `GET /api/documents`, `GET /api/documents/{id}`, and cross-session `404` behavior in `server/tests/integration/document-session.test.ts`.
- [ ] T039 [P] [US2] Write failing cleanup tests for document deletion, explicit session end, expired-session cleanup, and GridFS chunk removal in `server/tests/integration/session-cleanup.test.ts`.
- [ ] T040 [P] [US2] Write failing accessible list/detail tests for selecting documents and rendering their metadata/status in `client/src/components/DocumentList.test.tsx` and `client/src/components/DocumentDetails.test.tsx`.

### Implementation for User Story 2

- [ ] T041 [P] [US2] Implement session-scoped list and detail queries for `GET /api/documents` and `GET /api/documents/{id}` in `server/src/controllers/document-read.controller.ts` and register them in `server/src/routes/documents.routes.ts` using the query/index definitions in `data-model.md`.
- [ ] T042 [P] [US2] Implement `DocumentList` and `DocumentDetails` with filename, size, optional page count, status, and selection states in `client/src/components/DocumentList.tsx` and `client/src/components/DocumentDetails.tsx`.
- [ ] T043 [US2] Implement `DELETE /api/documents/{id}` with session ownership checks and related-content deletion in `server/src/controllers/document-delete.controller.ts` and `server/src/routes/documents.routes.ts`.
- [ ] T044 [US2] Implement idempotent session/document cleanup for summaries, documents, and GridFS content in `server/src/services/session/session-cleanup.service.ts`; apply the canonical definitions in `data-model.md` for `BrowserSession.sessionId`, `BrowserSession.endedAt`, `BrowserSession.expiresAt`, `BrowserSession.state`, `Document.sessionId`, `Document.expiresAt`, `Document.extractedTextFileId`, `Summary.sessionId`, `Summary.expiresAt`, `ExtractedTextFile.fileId`, `ExtractedTextFile.sessionId`, `ExtractedTextFile.documentId`, and `ExtractedTextFile.expiresAt`.
- [ ] T045 [US2] Implement `POST /api/session/end` to trigger cleanup and clear the session cookie in `server/src/controllers/session.controller.ts` and `server/src/routes/session.routes.ts`.
- [ ] T046 [US2] Implement the scheduled expired-session cleanup/retry worker and startup recovery for interrupted cleanup in `server/src/services/session/session-cleanup.worker.ts`.
- [ ] T047 [US2] Connect the document list, selected details, session restoration, and end-session request to `client/src/hooks/useDocuments.ts` and `client/src/pages/SummarizerPage.tsx`.
- [ ] T048 [US2] Implement Playwright tests for two-document session navigation, session isolation, explicit session end, and new-session emptiness in `tests/e2e/session-documents.spec.ts`; verify SC-006.

**Checkpoint**: US2 works independently with seeded session data and never exposes another
session's documents.

---

## Phase 5: User Story 3 - Refine and use a summary (Priority: P3)

**Goal**: Regenerate a summary without losing the last success on failure, search the displayed
summary, copy it, and export it as plain text.

**Independent Test**: Seed a completed summary, regenerate it in a different mode, simulate a
provider failure and confirm the last success remains; then search, copy, and export the
displayed summary.

### Tests for User Story 3

- [ ] T049 [P] [US3] Write failing integration tests proving regeneration updates only on success and preserves the previous summary on failure in `server/tests/integration/summary-regeneration.test.ts`.
- [ ] T050 [P] [US3] Write failing search tests for case-insensitive matches, highlights, and no-match feedback in `client/src/components/SummarySearch.test.tsx`.
- [ ] T051 [P] [US3] Write failing copy/export tests for clipboard success/failure and `.txt` contents in `client/src/components/SummaryActions.test.tsx`.

### Implementation for User Story 3

- [ ] T052 [US3] Extend regeneration to retain the current successful summary until a replacement succeeds in `server/src/services/summarization/summary.service.ts`; use canonical definitions in `data-model.md` for `Summary.summaryType`, `Summary.status`, `Summary.content`, `Summary.completedAt`, `Summary.errorCode`, `Summary.expiresAt`, `Document.generationStatus`, `Document.currentSummaryId`, and `Document.lastErrorCode`.
- [ ] T053 [P] [US3] Add mode changes, regeneration action, and progress/failure handling in `client/src/components/SummaryOptions.tsx` and `client/src/hooks/useSummary.ts`.
- [ ] T054 [P] [US3] Implement local case-insensitive summary search, match identification, and no-match state in `client/src/components/SummarySearch.tsx`.
- [ ] T055 [P] [US3] Implement clipboard copy and plain-text `.txt` export with accessible success/failure feedback in `client/src/components/SummaryActions.tsx`.
- [ ] T056 [US3] Integrate regeneration, search, copy, and export into the selected-document summary page in `client/src/pages/SummarizerPage.tsx`.
- [ ] T057 [US3] Implement Playwright tests for successful/failed regeneration, search, clipboard fallback, and export in `tests/e2e/summary-actions.spec.ts`; verify SC-004.

**Checkpoint**: US3 works independently with a seeded completed summary and preserves the last
successful result if regeneration fails.

---

## Phase 6: Polish & Cross-Cutting Verification

**Purpose**: Verify accessibility, responsive behavior, measurable outcomes, security, and
deployment readiness across all completed stories.

- [ ] T058 [P] Add automated WCAG checks for labels, contrast, keyboard focus, and status announcements on primary screens in `tests/e2e/accessibility.spec.ts`.
- [ ] T059 [P] Verify 320 px and desktop layouts plus the supported Chrome, Edge, Firefox, and Safari projects in `tests/e2e/responsive.spec.ts`.
- [ ] T060 [P] Add an opt-in acceptance benchmark for SC-002 using the approved <=20-page PDF corpus and real provider configuration in `tests/acceptance/summary-latency.test.ts`.
- [ ] T061 Set critical-logic statement/branch and overall statement coverage thresholds in `client/vite.config.ts` and `server/jest.config.ts`, then verify them with the complete suite.
- [ ] T062 Add dependency vulnerability and secret scanning to the merge/release workflow in `.github/workflows/ci.yml`.
- [ ] T063 Document local setup, environment variables, self-managed MongoDB, same-origin deployment, provider approval, and session-cleanup caveats in `README.md` and `docs/deployment.md`; reconcile commands in `specs/001-pdf-summarizer/quickstart.md`.
- [ ] T064 Create an acceptance-criteria-to-test crosswalk for SC-001 through SC-006 and FR/NFR coverage in `tests/acceptance/criteria-map.md`.
- [ ] T065 Run the quickstart and full acceptance checklist; record results and any approved retention/provider release gates in `tests/acceptance/release-verification.md`.

**Checkpoint**: All requested stories, measurable criteria, accessibility checks, security
checks, and deployment documentation have been verified.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 - Setup**: T001 first; T002, T003, and T004 can run in parallel after T001. T005
  depends on T002; T006 depends on T003; T007 can run after T001. T008 depends on all test,
  lint, and typecheck scripts being available.
- **Phase 2 - Foundational**: Depends on Phase 1. Complete session scoping, database setup,
  error handling, and test-database setup before any story.
- **Phase 3 - US1 (P1)**: Depends on Phase 2. Delivers the MVP upload-and-summary flow.
- **Phase 4 - US2 (P2)**: Depends on Phase 2 and the US1 Document/summary persistence model.
  Its tests use seeded documents so list/session behavior can be verified independently.
- **Phase 5 - US3 (P3)**: Depends on US1 summary generation and the document-selection contract
  from US2; its tests use seeded summaries.
- **Phase 6 - Polish**: Depends on the stories selected for release; all P1-P3 stories are
  required for the complete feature.

### User Story Dependency Graph

```text
Phase 1 Setup -> Phase 2 Foundation -> US1 (P1) -> US2 (P2) -> US3 (P3) -> Polish
```

Stories are implemented in priority order for incremental delivery. Once shared setup and
foundations are complete, independent tasks within a story can run in parallel as marked.

### Parallel Opportunities

- **Setup**: T002, T003, and T004 after T001; T005 and T006 after their respective scaffolds;
  T007 can proceed independently after T001.
- **Foundational**: T014 and T016 can run while database/session implementation tasks proceed
  because they touch separate test/client files.
- **US1 tests**: T018-T022 are separate parser, provider, API contract, upload UI, and summary UI
  test files.
- **US1 models**: T023 and T024 are separate Mongoose model files; parser and provider
  implementation T026/T027 are separate services after foundation.
- **US2 tests**: T038-T040 cover API listing, cleanup, and client document views in separate
  files. T041 and T042 can proceed in parallel after US1 models are available.
- **US3 tests**: T049-T051 cover backend regeneration, search, and copy/export independently.
  T053-T055 can proceed in parallel after their APIs/types are stable.
- **Polish**: T058-T060 are independent acceptance suites; T062-T063 can proceed in parallel
  once the final architecture is stable.

## Parallel Examples

### User Story 1

```text
First, author tests in parallel: T018, T019, T020, T021, T022.
Then implement model files T023 and T024 in parallel.
After GridFS setup, implement PDF parsing T026 and provider T027 in parallel.
Complete dependent orchestration/routes/client wiring in T025, T028-T035, then run T036-T037.
```

### User Story 2

```text
Author T038, T039, and T040 in parallel.
After US1 models exist, implement read routes T041 and client list/detail components T042 in parallel.
Implement cleanup T044 before session-end route T045 and worker T046; finish with T047-T048.
```

### User Story 3

```text
Author T049, T050, and T051 in parallel.
After tests are in place, update backend regeneration T052 and build client tasks T053-T055 in parallel.
Integrate with T056 and verify the journey with T057.
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup and Phase 2 foundations.
2. Complete Phase 3 US1 tasks T018-T037.
3. Stop and validate upload boundaries, extraction, all summary modes, safe errors, and SC-001/
   SC-003 before proceeding.
4. Demo the P1 flow only after the session-retention and provider-approval gates are understood.

### Incremental Delivery

1. Setup + foundation -> reusable project, database, session, and error infrastructure.
2. US1 -> upload and summarize PDFs; validate independently as the MVP.
3. US2 -> review and isolate session documents; validate cleanup and SC-006.
4. US3 -> regenerate, search, copy, and export; validate SC-004.
5. Polish -> complete responsive/accessibility, latency, coverage, security, and deployment checks.

## Notes

- `[P]` means the task touches files independent of incomplete work in its phase.
- `[US1]`, `[US2]`, and `[US3]` map to priorities and scenarios in `spec.md`.
- Data-model citations identify canonical constraints; implementers must consult the cited field
  definitions instead of copying a second, potentially divergent constraint.
- Tests are written before their story implementation and must demonstrate the expected failure
  before implementation begins.
- The cleanup and external provider privacy gates in `plan.md` must be explicitly reviewed
  before release; do not treat MongoDB TTL as immediate deletion or provider-side retention as
  browser-session-only.
