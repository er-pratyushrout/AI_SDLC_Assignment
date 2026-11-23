import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PdfUploader from '../../components/PdfUploader.jsx';

describe('PdfUploader', () => {
  it('passes a selected PDF to the upload handler', () => {
    const onFileSelected = vi.fn();
    const file = new File(['%PDF-1.7'], 'report.pdf', { type: 'application/pdf' });

    render(<PdfUploader onFileSelected={onFileSelected} />);
    fireEvent.change(screen.getByLabelText(/choose a pdf/i), {
      target: { files: [file] },
    });

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it('rejects a non-PDF selection with an actionable message', () => {
    const onFileSelected = vi.fn();
    const file = new File(['not a pdf'], 'notes.txt', { type: 'text/plain' });

    render(<PdfUploader onFileSelected={onFileSelected} />);
    fireEvent.change(screen.getByLabelText(/choose a pdf/i), {
      target: { files: [file] },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/select a pdf file/i);
    expect(onFileSelected).not.toHaveBeenCalled();
  });

  it('rejects files larger than the supported upload limit', () => {
    const onFileSelected = vi.fn();
    const file = new File(['x'], 'large.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 20 * 1024 * 1024 + 1 });

    render(<PdfUploader onFileSelected={onFileSelected} />);
    fireEvent.change(screen.getByLabelText(/choose a pdf/i), {
      target: { files: [file] },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/20 mb/i);
    expect(onFileSelected).not.toHaveBeenCalled();
  });
});
