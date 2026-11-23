import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import app from '../../src/app.js';
import { closeDocumentStore, resetDocumentStore } from '../../src/services/documentStore.js';

const fixture = (name) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));

async function waitForStatus(documentId, status) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await request(app).get(`/api/documents/${documentId}`);
    if (response.body.status === status) return response;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Document ${documentId} did not reach ${status}`);
}

describe('document API', () => {
  beforeAll(async () => {
    await resetDocumentStore();
  });

  afterAll(async () => {
    await resetDocumentStore();
    closeDocumentStore();
  });

  it('accepts a valid PDF, reaches ready, and returns safe metadata', async () => {
    const bytes = await readFile(fixture('valid-selectable-text.pdf'));
    const upload = await request(app)
      .post('/api/documents')
      .attach('file', bytes, { filename: 'report.pdf', contentType: 'application/pdf' });

    expect(upload.status).toBe(202);
    expect(upload.body).toMatchObject({
      displayName: 'report.pdf',
      status: 'processing',
    });

    const ready = await waitForStatus(upload.body.documentId, 'ready');
    expect(ready.status).toBe(200);
    expect(ready.body).toMatchObject({
      documentId: upload.body.documentId,
      displayName: 'report.pdf',
      status: 'ready',
      pageCount: 1,
    });
    expect(ready.body).not.toHaveProperty('extractedText');
  });

  it('returns a nested field-validation error when the file is missing', async () => {
    const response = await request(app).post('/api/documents').send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: 'FILE_REQUIRED',
      message: expect.any(String),
      details: [{ field: 'file', message: expect.any(String) }],
    });
  });

  it('rejects a non-PDF signature with 415', async () => {
    const bytes = await readFile(fixture('not-a-pdf.txt'));
    const response = await request(app)
      .post('/api/documents')
      .attach('file', bytes, { filename: 'document.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(415);
    expect(response.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    expect(response.body.error.details).toEqual([]);
  });

  it('rejects an oversized upload with 413', async () => {
    const response = await request(app)
      .post('/api/documents')
      .attach('file', Buffer.alloc(20 * 1024 * 1024 + 1, 0x41), {
        filename: 'large.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('marks a corrupt PDF as failed instead of ready', async () => {
    const bytes = await readFile(fixture('corrupt.pdf'));
    const upload = await request(app)
      .post('/api/documents')
      .attach('file', bytes, { filename: 'corrupt.pdf', contentType: 'application/pdf' });

    expect(upload.status).toBe(202);
    const failed = await waitForStatus(upload.body.documentId, 'failed');
    expect(failed.body.error).toMatchObject({
      code: expect.any(String),
      message: expect.any(String),
      details: [],
    });
    expect(failed.body).not.toHaveProperty('extractedText');
  });

  it('marks a password-protected PDF as failed with a clear recovery message', async () => {
    const bytes = await readFile(fixture('password-protected.pdf'));
    const upload = await request(app)
      .post('/api/documents')
      .attach('file', bytes, { filename: 'locked.pdf', contentType: 'application/pdf' });

    expect(upload.status).toBe(202);
    const failed = await waitForStatus(upload.body.documentId, 'failed');
    expect(failed.body.error).toMatchObject({
      code: 'PDF_PASSWORD_PROTECTED',
      message: expect.stringMatching(/password-protected/i),
    });
  });

  it('marks a PDF with no selectable text as failed', async () => {
    const bytes = await readFile(fixture('no-text.pdf'));
    const upload = await request(app)
      .post('/api/documents')
      .attach('file', bytes, { filename: 'no-text.pdf', contentType: 'application/pdf' });

    expect(upload.status).toBe(202);
    const failed = await waitForStatus(upload.body.documentId, 'failed');
    expect(failed.body.error).toMatchObject({
      code: 'PDF_NO_TEXT',
      message: expect.stringMatching(/scanned pdfs are not supported/i),
    });
  });

  it('marks a PDF over the 200-page limit as failed', async () => {
    const bytes = await readFile(fixture('over-page-limit.pdf'));
    const upload = await request(app)
      .post('/api/documents')
      .attach('file', bytes, { filename: 'too-many-pages.pdf', contentType: 'application/pdf' });

    expect(upload.status).toBe(202);
    const failed = await waitForStatus(upload.body.documentId, 'failed');
    expect(failed.body.error).toMatchObject({
      code: 'PDF_PAGE_LIMIT',
      message: expect.stringMatching(/200-page limit/i),
    });
  });

  it('deletes an accepted document', async () => {
    const bytes = await readFile(fixture('valid-selectable-text.pdf'));
    const upload = await request(app)
      .post('/api/documents')
      .attach('file', bytes, { filename: 'delete-me.pdf', contentType: 'application/pdf' });

    expect(upload.status).toBe(202);
    const deletion = await request(app).delete(`/api/documents/${upload.body.documentId}`);
    expect(deletion.status).toBe(204);

    const status = await request(app).get(`/api/documents/${upload.body.documentId}`);
    expect(status.status).toBe(404);
    expect(status.body.error.code).toBe('DOCUMENT_NOT_FOUND');
  });
});
