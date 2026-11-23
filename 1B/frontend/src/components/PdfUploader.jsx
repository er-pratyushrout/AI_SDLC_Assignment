import { useState } from 'react';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export default function PdfUploader({ onFileSelected, disabled = false }) {
  const [error, setError] = useState(null);

  function handleChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    setError(null);
    if (!file) return;

    if (file.size === 0) {
      setError('The selected file is empty. Choose a PDF with content.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('The PDF exceeds the 20 MB limit. Choose a smaller file.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Select a PDF file. The file contents will also be checked before processing.');
      return;
    }

    onFileSelected(file);
  }

  return (
    <div className="upload-control">
      <label className="button button-primary" htmlFor="pdf-file">
        Choose a PDF
      </label>
      <input
        id="pdf-file"
        className="visually-hidden"
        type="file"
        accept=".pdf,application/pdf"
        disabled={disabled}
        onChange={handleChange}
        aria-describedby={error ? 'upload-error' : undefined}
      />
      {error && (
        <p id="upload-error" className="error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
