import { useCallback, useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function PdfViewer({ file }) {
  const [pageCount, setPageCount] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState(null);

  useEffect(() => {
    setPageCount(null);
    setPageNumber(1);
    setError(null);
  }, [file]);

  const handleLoadSuccess = useCallback(({ numPages }) => {
    setPageCount(numPages);
    setPageNumber(1);
    setError(null);
  }, []);

  const handleLoadError = useCallback(() => {
    setError('We could not display this PDF. Choose another file or try again.');
  }, []);

  if (!file) {
    return (
      <div className="pdf-empty">
        <p>Your PDF will appear here after you select it.</p>
      </div>
    );
  }

  return (
    <div className="pdf-viewer">
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : (
        <>
          {!pageCount && (
            <p className="status-message" role="status">
              Loading PDF…
            </p>
          )}
          <div className="pdf-page">
            <Document
              file={file}
              onLoadSuccess={handleLoadSuccess}
              onLoadError={handleLoadError}
              loading={null}
              error={null}
            >
              {pageCount && <Page pageNumber={pageNumber} />}
            </Document>
          </div>
          {pageCount > 0 && (
            <nav className="pdf-controls" aria-label="PDF pages">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
                disabled={pageNumber <= 1}
              >
                Previous page
              </button>
              <span aria-live="polite">
                Page {pageNumber} of {pageCount}
              </span>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setPageNumber((current) => Math.min(pageCount, current + 1))}
                disabled={pageNumber >= pageCount}
              >
                Next page
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
