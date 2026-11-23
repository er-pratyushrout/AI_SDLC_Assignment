# Data Model: AI PDF Summarizer

Data is scoped to an anonymous browser session. No model contains a user account or a
cross-session document lookup. All public document queries MUST include the current
`sessionId`; unknown and other-session IDs return the same `404` response.

## Browser Session

**Purpose**: Scope the anonymous user's documents and summaries and provide a cleanup boundary.

| Field | Type | Rules |
|---|---|---|
| `sessionId` | UUID/random opaque string | Server-generated; never accepted from a document body; stored in a secure, HttpOnly, SameSite cookie |
| `createdAt` | Date | Set once by the server |
| `lastActivityAt` | Date | Updated on valid session activity |
| `expiresAt` | Date | Set by the session lifecycle policy and indexed for cleanup |
| `endedAt` | Date or null | Set when explicit session cleanup starts |
| `state` | Enum | `active`, `ending`, or `ended` |

Session state transitions: `active -> ending -> ended`. New requests for an ended session
cannot read its records.

## Document

**Purpose**: Represent one accepted PDF during the active browser session.

| Field | Type | Rules |
|---|---|---|
| `_id` | ObjectId | Server-generated |
| `sessionId` | UUID/string | Required; indexed with `_id` for session-scoped lookup |
| `fileName` | String | Required; display-only name, normalized, at most 255 characters, and never used as a path |
| `fileSizeBytes` | Integer | Required; greater than zero and at or below 20,000,000 bytes (20 MB) |
| `pageCount` | Integer or null | Positive when the parser can determine it |
| `uploadedAt` | Date | Server-generated |
| `processingStatus` | Enum | `ready` or `failed`; only accepted, parsed PDFs are persisted as documents |
| `extractedTextFileId` | ObjectId | Required when ready; references extracted text in the GridFS bucket |
| `generationStatus` | Enum | `idle`, `processing`, `completed`, or `failed` |
| `currentSummaryId` | ObjectId or null | Points only to the most recent successful summary |
| `lastErrorCode` | String or null | Safe, stable error code; no raw parser/provider message |
| `expiresAt` | Date | Session expiry used by cleanup |

Indexes:

- `{ sessionId: 1, uploadedAt: -1 }` for current-session listing.
- `{ sessionId: 1, _id: 1 }` for ownership-scoped document lookup.
- `{ expiresAt: 1 }` for cleanup scans.

The uploaded PDF is held in a temporary file only while validating and parsing. That file is
removed after extraction. The extracted text is stored in GridFS to avoid the 16 MiB BSON
document limit; GridFS file metadata includes `sessionId`, `documentId`, and `expiresAt`.

## Summary

**Purpose**: Represent a generation attempt and its result without destroying a prior successful
summary when regeneration fails.

| Field | Type | Rules |
|---|---|---|
| `_id` | ObjectId | Server-generated |
| `sessionId` | UUID/string | Required; must match the owning document |
| `documentId` | ObjectId | Required; references one Document |
| `summaryType` | Enum | `brief`, `standard`, or `detailed` |
| `status` | Enum | `processing`, `completed`, or `failed` |
| `content` | Object or null | Present only after successful output validation; contains `keyPoints`, `findings`, and `conclusions` |
| `content.keyPoints` | Array of strings | Required on completed output; may be empty only when unsupported by the source |
| `content.findings` | Array of strings | Required on completed output; may be empty only when unsupported by the source |
| `content.conclusions` | Array of strings | Required on completed output; may be empty only when unsupported by the source |
| `createdAt` | Date | Server-generated |
| `completedAt` | Date or null | Set on success or failure |
| `errorCode` | String or null | Safe, stable code; no provider response text |
| `expiresAt` | Date | Same session expiry as the owning document |

Indexes:

- `{ sessionId: 1, documentId: 1, createdAt: -1 }` for session-scoped summary lookup.
- `{ expiresAt: 1 }` for cleanup scans.

Only a completed Summary may become `Document.currentSummaryId`. A failed attempt leaves the
previous current summary unchanged. At most one attempt per document may be in `processing`.

## ExtractedTextFile (GridFS)

The `extractedText` content is stored as a GridFS file, not as a String in the Document
collection.

| Field | Type | Rules |
|---|---|---|
| `fileId` | ObjectId | GridFS file identifier; referenced by `Document.extractedTextFileId` |
| `sessionId` | UUID/string | Required GridFS metadata; matches the owning BrowserSession |
| `documentId` | ObjectId | Required GridFS metadata; matches the owning Document |
| `expiresAt` | Date | Required GridFS metadata; matches the owning session expiry |
| `content` | UTF-8 text stream | Extracted text only; never raw PDF bytes |

GridFS file content is removed with `GridFSBucket.delete()` during explicit session cleanup.
The cleanup worker MUST remove expired GridFS files before removing their owning session
metadata; MongoDB TTL deletion does not cascade to GridFS chunks.

## Validation and Lifecycle

1. Validate request size and media type while receiving the temporary upload.
2. Confirm PDF content and parse it; reject encrypted, corrupt, empty, or text-free PDFs.
3. Persist extracted text and document metadata only after successful parsing.
4. Create a Summary attempt in `processing` state; call the AI provider with extracted text.
5. Validate the response shape and required summary sections. On success, mark the attempt
   completed and update `currentSummaryId`. On failure, mark the attempt failed and preserve
   the prior pointer.
6. On document deletion or session end, remove GridFS text and associated summaries/documents.
   The expiry worker retries incomplete cleanup. All cross-collection cleanup operations are
   idempotent.

## Privacy and Cleanup Caveat

Immediate cleanup is performed when the session-end request reaches the server. If the browser
or machine terminates without delivering it, the cleanup worker removes expired data
eventually. MongoDB TTL indexes are not an immediate-erasure guarantee and are not used as the
only cleanup mechanism. The browser session's expiration policy and acceptable cleanup window
must be approved before release.
