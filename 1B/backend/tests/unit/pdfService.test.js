import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from '@jest/globals';
import { extractPdf, hasPdfSignature } from '../../src/services/pdfService.js';

const fixture = (name) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));

describe('pdfService', () => {
  it('extracts selectable text from a valid PDF', async () => {
    const result = await extractPdf(await readFile(fixture('valid-selectable-text.pdf')));

    expect(result.pageCount).toBe(1);
    expect(result.extractedText).toMatch(/Project Cypress/);
  });

  it('rejects a PDF without selectable text', async () => {
    await expect(extractPdf(await readFile(fixture('no-text.pdf')))).rejects.toMatchObject({
      code: 'PDF_NO_TEXT',
    });
  });

  it('recognizes password protection without leaking parser internals', async () => {
    await expect(
      extractPdf(await readFile(fixture('password-protected.pdf'))),
    ).rejects.toMatchObject({
      code: 'PDF_PASSWORD_PROTECTED',
      message: expect.stringMatching(/password-protected/i),
    });
  });

  it('enforces the supported page ceiling', async () => {
    await expect(extractPdf(await readFile(fixture('over-page-limit.pdf')))).rejects.toMatchObject({
      code: 'PDF_PAGE_LIMIT',
    });
  });

  it('checks the PDF signature rather than a filename or content type', () => {
    expect(hasPdfSignature(Buffer.from('%PDF-1.7'))).toBe(true);
    expect(hasPdfSignature(Buffer.from('not a PDF'))).toBe(false);
  });
});
