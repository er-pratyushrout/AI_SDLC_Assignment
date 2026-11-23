import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-pdf', () => ({
  Document: ({ children, onLoadError, onLoadSuccess }) => (
    <div>
      <button onClick={() => onLoadSuccess({ numPages: 2 })}>load mock PDF</button>
      <button onClick={() => onLoadError(new Error('render failed'))}>fail mock PDF</button>
      {children}
    </div>
  ),
  Page: ({ pageNumber }) => <div>Page {pageNumber}</div>,
  pdfjs: { GlobalWorkerOptions: {} },
}));

import PdfViewer from '../../components/PdfViewer.jsx';

describe('PdfViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state then renders the first page', () => {
    const file = new File(['%PDF-1.7'], 'report.pdf', { type: 'application/pdf' });
    render(<PdfViewer file={file} />);

    expect(screen.getByRole('status')).toHaveTextContent(/loading pdf/i);
    fireEvent.click(screen.getByRole('button', { name: /load mock pdf/i }));
    expect(screen.getByText('Page 1')).toBeInTheDocument();
  });

  it('reports a render failure accessibly', () => {
    const file = new File(['%PDF-1.7'], 'report.pdf', { type: 'application/pdf' });
    render(<PdfViewer file={file} />);
    fireEvent.click(screen.getByRole('button', { name: /fail mock pdf/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/could not display/i);
  });
});
