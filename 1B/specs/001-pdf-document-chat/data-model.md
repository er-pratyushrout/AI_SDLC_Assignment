# Data Model: PDF Document Chat

## Overview

The application has no database. Conversation and summary state live in browser memory;
extracted document text and safe processing metadata live in a bounded, expiring
in-memory backend record. The original PDF is held by the browser for display and is
transiently buffered by the API for validation and parsing only.

## Entities

### ActiveDocument

The one PDF currently available to the user's application session.

| Field | Owner | Description | Validation / lifecycle |
|---|---|---|---|
| `documentId` | Backend | Opaque random identifier returned after upload acceptance | Required for status, messages, summary, and delete; never logged |
| `displayName` | Browser and backend metadata | Sanitized basename shown to the user | Never treated as a path or trusted content |
| `byteLength` | Backend | Uploaded size | Greater than zero and at most 20 MB |
| `pageCount` | Backend | Parsed page count | 1 through 200 |
| `extractedText` | Backend memory only | Selectable text used for answering and summarizing | Non-empty; never returned or logged |
| `status` | Backend and browser | `processing`, `ready`, or `failed` | Only `ready` enables chat and summary |
| `failure` | Backend and browser | Safe error code/message for a failed parse | Present only for `failed`; no parser stack or source text |
| `createdAt` / `lastAccessedAt` | Backend | Volatile record timestamps | Used for expiry and operational cleanup |
| `file` | Browser only | Original `File` used by React-PDF | Replaced/cleared when a new PDF is selected or session ends |

State transitions:

```text
absent --valid upload accepted--> processing --parse succeeds with text--> ready
                                      |                                  |
                                      +--parse fails/no text/limits-----> failed
processing|ready|failed --replace/delete/expiry--> absent
```

An upload that fails synchronous boundary validation creates no record. Failed or expired
records cannot be used for generation. Replacing a file clears the old browser document,
chat, and summary immediately and releases the previous backend record on a best-effort
basis.

### ConversationMessage

An ordered message shown in the current browser session.

| Field | Owner | Description | Validation / lifecycle |
|---|---|---|---|
| `messageId` | Browser | Unique UI key; assistant completion ID may originate from the API | Unique within the current session |
| `role` | Browser and request context | `user` or `assistant` | Other roles are rejected at the public API boundary |
| `content` | Browser | Plain-text message content | User question is non-empty after trimming and no more than 4,000 characters |
| `createdAt` | Browser | Message creation time | ISO-8601 |
| `status` | Browser | `pending`, `complete`, or `failed` | Failed messages can be retried; previous messages remain |

The browser retains all visible messages until the application session ends. It sends at
most the latest 20 prior messages as context with each question. The backend does not save
conversation history; API validation also caps per-message content and total request size.

### DocumentSummary

The current user-requested summary of the active PDF.

| Field | Owner | Description | Validation / lifecycle |
|---|---|---|---|
| `summaryId` | Browser/API | Identifier for the completed summary | Created when generation completes |
| `content` | Browser | Plain-text overview of the active document | Updated incrementally while streaming |
| `createdAt` | Browser | Completion time | ISO-8601 |
| `status` | Browser | `pending`, `complete`, or `failed` | Retryable; cleared on replacement/session end |

## Relationships and Persistence

- One browser `DocumentSession` contains at most one `ActiveDocument`, zero or more
  `ConversationMessage` records, and zero or one current `DocumentSummary`.
- Messages and summaries are not stored by the backend.
- The backend document store is keyed by `documentId`, kept only in process memory, and
  bounded by file-size/page-count limits and an inactivity expiry. It is not shared
  durable or cloud storage. Server restart clears it.
- The implementation caps the store at 20 documents, expires inactive records after
  30 minutes, and runs two PDF parses concurrently with a queue of at most four pending
  uploads. Capacity failures are retryable and do not create a document record.
- The API returns only safe document metadata; extracted text and original PDF bytes are
  never part of API responses.

## Validation Rules

- Verify multipart file presence, byte length, PDF signature, parse success, page count,
  password protection, and non-empty selectable text.
- Ensure a new document is not marked `ready` until parsing and text validation succeed.
- Require a known, unexpired, `ready` document for question and summary requests.
- Reject blank questions and invalid history roles; bound request size and context history.
- Treat user text, PDF text, and AI output as untrusted. Render generated text without
  interpreting embedded HTML.
