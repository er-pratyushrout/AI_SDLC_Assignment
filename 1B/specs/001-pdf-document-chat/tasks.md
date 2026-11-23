# Tasks: PDF Document Chat MVP

**Input**: Design documents from `specs/001-pdf-document-chat/`

**MVP scope**: User Story 1 (upload/view/process one PDF) and User Story 2
(document-grounded chat and session-only history). User Story 3 (summary) is P2 and
intentionally excluded from this task list.

**Prerequisites**: `plan.md`, `spec.md`, `data-model.md`, `contracts/openapi.yaml`,
`research.md`, and `quickstart.md`

**Tests**: Included where required by the constitution for critical parsing, API, and
conversation behavior. Write the listed tests before implementing their story behavior.

## Phase 1: Setup

**Purpose**: Create the smallest project foundation for the MVP.

- [X] T001 Create the root npm workspace manifest and shared scripts in `package.json` for `frontend` and `backend`.
- [X] T002 [P] Initialize the React 18/Vite client with React-PDF 9.2.1, matching pdfjs-dist 4.8.69, Axios, Vitest, and React Testing Library in `frontend/package.json`, `frontend/index.html`, `frontend/src/main.jsx`, and `frontend/vite.config.js`.
- [X] T003 [P] Initialize the Node.js 22/Express server with pdf-parse 2.4.5, Multer, dotenv, and Jest/Supertest scripts in `backend/package.json`.
- [X] T004 [P] Configure ESLint, Prettier, ignored environment files, and server-only placeholder settings in `eslint.config.js`, `.prettierrc.json`, `.gitignore`, and `backend/.env.example`.
- [X] T005 Install workspace dependencies and generate `package-lock.json` from the root `package.json`, `frontend/package.json`, and `backend/package.json`.

## Phase 2: Foundational

**Purpose**: Establish shared runtime and state infrastructure required by both MVP stories.

- [X] T006 Create the Express app bootstrap, Node server entry point, environment validation, health endpoint, and JSON error middleware in `backend/src/app.js`, `backend/src/server.js`, `backend/src/config/env.js`, and `backend/src/middleware/errorHandler.js`.
- [X] T007 Create the initial in-memory document/chat session reducer and provider in `frontend/src/context/DocumentSessionContext.jsx`, with explicit actions for loading, ready, failure, replacement, and clearing session state.
- [X] T008 Create the shared Axios client and normalize the nested `{ error: { code, message, details } }` JSON error envelope in `frontend/src/services/documentsApi.js`.

**Checkpoint**: Frontend and backend start independently; shared state and error conventions are ready.

## Phase 3: User Story 1 - Upload and View a PDF (Priority: P1)

**Goal**: Select one supported text-based PDF, show it beside the workspace, and report processing or validation status.

**Independent Test**: Upload a valid text PDF and verify it becomes ready and visible. Try invalid, corrupt, password-protected, over-limit, and no-text PDFs and verify each is clearly rejected or marked failed without becoming ready.

### Tests for User Story 1

- [X] T009 [P] [US1] Create valid selectable-text and invalid PDF fixtures in `backend/tests/fixtures/` and add upload/status/delete API integration tests in `backend/tests/integration/documents.test.js`, asserting the standard nested JSON error envelope and field details for validation failures.
- [X] T010 [P] [US1] Add upload validation, loading, ready, and failure component tests in `frontend/src/tests/components/PdfUploader.test.jsx` and `frontend/src/tests/components/DocumentStatus.test.jsx`.
- [X] T011 [P] [US1] Add PDF viewer loading, render, and failure tests in `frontend/src/tests/components/PdfViewer.test.jsx`.

### Implementation for User Story 1

- [X] T012 [P] [US1] Implement PDF signature/size/page/text extraction and parser cleanup in `backend/src/services/pdfService.js`, enforcing the canonical `ActiveDocument.byteLength`, `ActiveDocument.pageCount`, and `ActiveDocument.extractedText` rules in `specs/001-pdf-document-chat/data-model.md`.
- [X] T013 [P] [US1] Implement bounded volatile record creation, readiness transitions, lookup, deletion, and expiry in `backend/src/services/documentStore.js`, following `ActiveDocument.documentId`, `ActiveDocument.displayName`, `ActiveDocument.status`, `ActiveDocument.failure`, `ActiveDocument.createdAt`, and `ActiveDocument.lastAccessedAt` in `specs/001-pdf-document-chat/data-model.md`.
- [X] T014 [P] [US1] Configure route-scoped single-file Multer memory upload with the 20 MB limit, one-file/zero-extra-field limits, two concurrent PDF parses, and at most four queued uploads in `backend/src/middleware/upload.js` and `backend/src/services/processingQueue.js`.
- [X] T015 [US1] Implement asynchronous upload acceptance, document status polling, and document deletion handlers in `backend/src/controllers/documentsController.js` and `backend/src/routes/documents.js` according to `specs/001-pdf-document-chat/contracts/openapi.yaml`.
- [X] T016 [P] [US1] Implement browser upload, status polling, and delete calls with cancellation and normalized errors in `frontend/src/services/documentsApi.js`.
- [X] T017 [P] [US1] Implement accessible file selection and processing-state presentation in `frontend/src/components/PdfUploader.jsx` and `frontend/src/components/DocumentStatus.jsx`.
- [X] T018 [P] [US1] Implement local PDF rendering and the matching React-PDF 9.2.1/PDF.js worker configuration in `frontend/src/components/PdfViewer.jsx`.
- [X] T019 [US1] Wire upload, polling, file replacement, session clearing, and the responsive PDF/workspace layout in `frontend/src/App.jsx` and `frontend/src/context/DocumentSessionContext.jsx`, observing the browser-only lifecycle of `ActiveDocument.file` in `specs/001-pdf-document-chat/data-model.md`.

**Checkpoint**: User Story 1 works without AI: valid documents display and reach ready; failures are actionable and never appear ready.

## Phase 4: User Story 2 - Ask Questions About the PDF (Priority: P1)

**Goal**: Ask document-grounded questions, stream answers into chat, preserve visible history in the current browser session, and allow retry after failures.

**Independent Test**: With a ready PDF, ask an answerable and an unanswerable question. Verify a relevant answer or an explicit “not in the document” response, prior messages remain visible, and a simulated provider failure is recoverable. Verify a new browser session does not restore the old document or chat.

**Dependency**: Requires User Story 1 to provide a ready active document.

### Tests for User Story 2

- [ ] T020 [P] [US2] Add unit tests for lexical retrieval, bounded history, grounded answers, and unanswerable questions in `backend/tests/unit/questionService.test.js` using a fake AI provider.
- [ ] T021 [P] [US2] Add API integration tests for question validation, JSON pre-stream error envelopes, SSE delta/completion/error payloads, missing/not-ready documents, and provider failures in `backend/tests/integration/documentMessages.test.js`.
- [ ] T022 [P] [US2] Add chat composer, streamed message, retry, empty-input, and session-history tests in `frontend/src/tests/components/ChatPanel.test.jsx` and `frontend/src/tests/unit/documentSessionReducer.test.js`.

### Implementation for User Story 2

- [ ] T023 [US2] Select the production AI provider and record its streaming API and server-side environment configuration in `specs/001-pdf-document-chat/research.md` and `backend/.env.example`; do not commit real credentials.
- [ ] T024 [P] [US2] Implement bounded text chunking and lexical relevance ranking in `backend/src/services/retrievalService.js`, returning only relevant document passages and no page citations.
- [ ] T025 [P] [US2] Implement the selected provider's server-only streaming adapter and deterministic test fake in `backend/src/services/aiProvider.js`, using the configuration recorded in `backend/.env.example`.
- [ ] T026 [US2] Implement question validation and document-grounded response orchestration in `backend/src/services/questionService.js`, applying the canonical `ConversationMessage.role` and `ConversationMessage.content` rules in `specs/001-pdf-document-chat/data-model.md`.
- [ ] T027 [US2] Implement the messages endpoint with JSON pre-stream errors and typed SSE `delta`, `complete`, and `error` events in `backend/src/controllers/documentsController.js` and `backend/src/routes/documents.js`, following `specs/001-pdf-document-chat/contracts/openapi.yaml`.
- [ ] T028 [P] [US2] Implement a cancellable Fetch-based SSE reader for chat requests in `frontend/src/services/streamingApi.js`.
- [ ] T029 [P] [US2] Implement the accessible chat panel, ordered message list, and non-empty question composer in `frontend/src/components/ChatPanel.jsx`, `frontend/src/components/MessageList.jsx`, and `frontend/src/components/QuestionComposer.jsx`.
- [ ] T030 [US2] Extend the session reducer to retain ordered messages in browser memory and manage pending, complete, failed, and retry transitions, following `ConversationMessage.messageId`, `ConversationMessage.createdAt`, and `ConversationMessage.status` in `specs/001-pdf-document-chat/data-model.md`.
- [ ] T031 [US2] Connect chat components to the ready document, send bounded recent context, stream answers, and clear document-specific messages on replacement in `frontend/src/App.jsx` and `frontend/src/context/DocumentSessionContext.jsx`.

**Checkpoint**: User Stories 1 and 2 work together; chat is session-only and answers stay grounded in the active document.

## Phase 5: MVP Verification

**Purpose**: Verify MVP accessibility, quality gates, and acceptance scenarios only.

- [ ] T032 [P] Add axe-core to `frontend/package.json` and automated serious/critical accessibility checks for upload and chat workflows in `frontend/src/tests/accessibility.test.jsx`.
- [ ] T033 Run the User Story 1 and 2 scenarios from `specs/001-pdf-document-chat/quickstart.md`, verify keyboard use and 320 px/768 px/1440 px layouts, and record MVP results in that file.
- [ ] T034 Run frontend/backend lint, formatting, unit, integration, coverage, and normal-load checks from the scripts in `package.json`; confirm critical backend coverage is at least 90% line and 80% branch and the suite completes within 10 minutes, then record results in `specs/001-pdf-document-chat/quickstart.md`.

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 first; T002-T004 can then proceed in parallel; T005 follows all three.
- **Foundational (Phase 2)**: Starts after setup; T006-T008 can proceed in parallel.
- **User Story 1 (Phase 3)**: Starts after foundational work; write T009-T011 before implementation. PDF service, store, upload middleware, and independent UI components can proceed in parallel after tests.
- **User Story 2 (Phase 4)**: Starts after User Story 1 is ready; write T020-T022 before implementation. Provider selection T023 blocks the production adapter T025; retrieval, frontend stream handling, and chat UI can proceed in parallel.
- **MVP Verification (Phase 5)**: Starts after both P1 stories are integrated.

### Parallel Opportunities

- After T001, run T002, T003, and T004 in parallel.
- After setup, run T006, T007, and T008 in parallel.
- In User Story 1, run tests T009-T011 together; after tests exist, T012-T014 and T016-T018 are parallelizable.
- In User Story 2, run tests T020-T022 together; after provider selection, T024, T025, T028, and T029 can proceed in parallel.
- Run T032 in parallel with final manual acceptance review T033.

## MVP Strategy

1. Complete setup and foundational tasks.
2. Deliver User Story 1 and independently verify upload, extraction, PDF display, and invalid-file recovery.
3. Deliver User Story 2 on top of the ready-document flow and independently verify grounded chat and session-only history.
4. Complete MVP quality/accessibility checks. Stop here for the MVP.
5. Defer User Story 3 (document summary), including its API, UI, and tests, to a later task-generation pass.
