import { useState } from "react";

const MAX_FILE_SIZE_BYTES = 20_000_000;

export interface FileUploadProps {
  onFileSelected: (file: File) => void | Promise<void>;
  isUploading?: boolean;
  error?: string | null;
}

export function FileUpload({ onFileSelected, isUploading = false, error = null }: FileUploadProps) {
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    setValidationError(null);
    if (!file) {
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setValidationError("This file is larger than 20 MB. Choose a smaller PDF.");
      return;
    }
    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      setValidationError("Choose a PDF file to continue.");
      return;
    }

    void onFileSelected(file);
  }

  return (
    <section className="card upload-card" aria-labelledby="upload-heading">
      <h2 id="upload-heading">Upload a PDF</h2>
      <p>Choose a readable, text-based PDF up to 20 MB.</p>
      <label className="file-picker" htmlFor="pdf-file">
        Choose a PDF
      </label>
      <input
        id="pdf-file"
        name="file"
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleChange}
        disabled={isUploading}
      />
      {isUploading && (
        <p role="status" aria-live="polite">
          Uploading and extracting text…
        </p>
      )}
      {(validationError || error) && (
        <p className="error-message" role="alert">
          {validationError ?? error}
        </p>
      )}
    </section>
  );
}
