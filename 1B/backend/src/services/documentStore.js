import { randomUUID } from 'node:crypto';
import { ApiError } from '../errors.js';

const MAX_DOCUMENTS = 20;
const INACTIVITY_TTL_MS = 30 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;

export class DocumentStore {
  #documents = new Map();
  #clock;
  #timer;

  constructor({ maxDocuments = MAX_DOCUMENTS, ttlMs = INACTIVITY_TTL_MS, clock = Date.now } = {}) {
    this.maxDocuments = maxDocuments;
    this.ttlMs = ttlMs;
    this.#clock = clock;
    this.#timer = setInterval(() => this.#removeExpired(), CLEANUP_INTERVAL_MS);
    this.#timer.unref?.();
  }

  create({ displayName, byteLength }) {
    this.#removeExpired();

    if (this.#documents.size >= this.maxDocuments) {
      throw new ApiError(
        503,
        'DOCUMENT_CAPACITY_REACHED',
        'The document workspace is temporarily full. Try again shortly.',
      );
    }

    const now = this.#clock();
    const document = {
      documentId: randomUUID(),
      displayName,
      byteLength,
      status: 'processing',
      pageCount: undefined,
      extractedText: undefined,
      failure: undefined,
      createdAt: now,
      lastAccessedAt: now,
    };
    this.#documents.set(document.documentId, document);
    return this.#toStatus(document);
  }

  markReady(documentId, { pageCount, extractedText }) {
    const document = this.#documents.get(documentId);
    if (!document) return false;

    document.status = 'ready';
    document.pageCount = pageCount;
    document.extractedText = extractedText;
    document.failure = undefined;
    document.lastAccessedAt = this.#clock();
    return true;
  }

  markFailed(documentId, failure) {
    const document = this.#documents.get(documentId);
    if (!document) return false;

    document.status = 'failed';
    document.extractedText = undefined;
    document.failure = {
      code: failure.code,
      message: failure.message,
      details: failure.details ?? [],
    };
    document.lastAccessedAt = this.#clock();
    return true;
  }

  getStatus(documentId) {
    this.#removeExpired();
    const document = this.#documents.get(documentId);
    if (!document) return null;

    document.lastAccessedAt = this.#clock();
    return this.#toStatus(document);
  }

  delete(documentId) {
    this.#removeExpired();
    return this.#documents.delete(documentId);
  }

  reset() {
    this.#documents.clear();
  }

  close() {
    clearInterval(this.#timer);
  }

  #removeExpired() {
    const now = this.#clock();
    for (const [documentId, document] of this.#documents) {
      if (now - document.lastAccessedAt >= this.ttlMs) {
        this.#documents.delete(documentId);
      }
    }
  }

  #toStatus(document) {
    const status = {
      documentId: document.documentId,
      displayName: document.displayName,
      status: document.status,
    };

    if (document.status === 'ready') {
      status.pageCount = document.pageCount;
      status.extractedCharacterCount = document.extractedText.length;
    }
    if (document.status === 'failed') status.error = { ...document.failure };
    return status;
  }
}

const documentStore = new DocumentStore();

export default documentStore;

export function resetDocumentStore() {
  documentStore.reset();
}

export function closeDocumentStore() {
  documentStore.close();
}
