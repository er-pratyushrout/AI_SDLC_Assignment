import { afterEach, describe, expect, it } from '@jest/globals';
import { ApiError } from '../../src/errors.js';
import { DocumentStore } from '../../src/services/documentStore.js';

describe('DocumentStore', () => {
  let now = 1000;
  let store;

  afterEach(() => {
    store?.close();
    store?.reset();
  });

  it('stores readiness metadata without exposing extracted text', () => {
    store = new DocumentStore({ clock: () => now });
    const created = store.create({ displayName: 'report.pdf', byteLength: 42 });
    expect(created.status).toBe('processing');

    store.markReady(created.documentId, {
      pageCount: 1,
      extractedText: 'Private document text',
    });
    const ready = store.getStatus(created.documentId);

    expect(ready).toMatchObject({
      documentId: created.documentId,
      displayName: 'report.pdf',
      status: 'ready',
      pageCount: 1,
      extractedCharacterCount: 21,
    });
    expect(ready).not.toHaveProperty('extractedText');
  });

  it('expires inactive records and rejects creation at capacity', () => {
    store = new DocumentStore({ maxDocuments: 1, ttlMs: 100, clock: () => now });
    const first = store.create({ displayName: 'first.pdf', byteLength: 42 });

    expect(() => store.create({ displayName: 'second.pdf', byteLength: 42 })).toThrow(ApiError);
    now += 100;
    expect(store.getStatus(first.documentId)).toBeNull();
    expect(store.create({ displayName: 'second.pdf', byteLength: 42 }).status).toBe('processing');
  });

  it('does not recreate a deleted record when processing finishes', () => {
    store = new DocumentStore({ clock: () => now });
    const created = store.create({ displayName: 'report.pdf', byteLength: 42 });

    expect(store.delete(created.documentId)).toBe(true);
    expect(store.markReady(created.documentId, { pageCount: 1, extractedText: 'text' })).toBe(
      false,
    );
    expect(store.getStatus(created.documentId)).toBeNull();
  });
});
