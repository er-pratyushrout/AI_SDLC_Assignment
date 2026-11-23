import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  deleteDocument: vi.fn(),
  getDocumentStatus: vi.fn(),
  normalizeApiError: vi.fn((error) => error),
  uploadDocument: vi.fn(),
}));

vi.mock('../services/documentsApi.js', () => api);
vi.mock('../components/PdfViewer.jsx', () => ({
  default: ({ file }) => <div data-testid="pdf-viewer">{file?.name ?? 'empty'}</div>,
}));

import App from '../App.jsx';
import { DocumentSessionProvider } from '../context/DocumentSessionContext.jsx';

function renderApp() {
  return render(
    <DocumentSessionProvider>
      <App />
    </DocumentSessionProvider>,
  );
}

function selectPdf(name) {
  const file = new File(['%PDF-1.7'], name, { type: 'application/pdf' });
  fireEvent.change(screen.getByLabelText(/choose a pdf/i), {
    target: { files: [file] },
  });
  return file;
}

describe('App document workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.deleteDocument.mockResolvedValue(204);
  });

  it('uploads a PDF, polls until ready, and renders the selected file', async () => {
    api.uploadDocument.mockResolvedValue({
      documentId: 'document-1',
      status: 'processing',
    });
    api.getDocumentStatus.mockResolvedValue({
      documentId: 'document-1',
      displayName: 'report.pdf',
      status: 'ready',
      pageCount: 1,
    });

    renderApp();
    selectPdf('report.pdf');

    expect(await screen.findByText('PDF ready to use.', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByTestId('pdf-viewer')).toHaveTextContent('report.pdf');
    expect(api.uploadDocument).toHaveBeenCalledOnce();
    expect(api.getDocumentStatus).toHaveBeenCalledWith(
      'document-1',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('clears the previous document and releases it when a replacement is selected', async () => {
    api.uploadDocument
      .mockResolvedValueOnce({ documentId: 'document-1', status: 'processing' })
      .mockResolvedValueOnce({ documentId: 'document-2', status: 'processing' });
    api.getDocumentStatus
      .mockResolvedValueOnce({
        documentId: 'document-1',
        displayName: 'first.pdf',
        status: 'ready',
        pageCount: 1,
      })
      .mockResolvedValueOnce({
        documentId: 'document-2',
        displayName: 'second.pdf',
        status: 'ready',
        pageCount: 1,
      });

    renderApp();
    selectPdf('first.pdf');
    await screen.findByText('PDF ready to use.', {}, { timeout: 3000 });
    selectPdf('second.pdf');

    await waitFor(() => {
      expect(screen.getByTestId('pdf-viewer')).toHaveTextContent('second.pdf');
      expect(api.deleteDocument).toHaveBeenCalledWith('document-1');
    });
  });
});
