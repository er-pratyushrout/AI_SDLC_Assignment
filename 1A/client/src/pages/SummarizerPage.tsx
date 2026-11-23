import { useReducer } from "react";
import { ErrorMessage } from "../components/ErrorMessage";
import { FileUpload } from "../components/FileUpload";
import { ProgressStatus } from "../components/ProgressStatus";
import { SummaryOptions } from "../components/SummaryOptions";
import { SummaryPanel } from "../components/SummaryPanel";
import { useDocumentUpload } from "../hooks/useDocumentUpload";
import { useSummary } from "../hooks/useSummary";
import { initialSessionState, sessionReducer } from "../state/session.reducer";

export function SummarizerPage() {
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState);
  const { upload } = useDocumentUpload(dispatch);
  const { generate, isGenerating } = useSummary(dispatch);

  function handleModeChange(summaryType: typeof state.summaryType) {
    dispatch({ type: "summary-type-changed", summaryType });
  }

  function handleGenerate() {
    if (state.document) {
      void generate(state.document.id, state.summaryType);
    }
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">AI-powered document insights</p>
        <h1>PDF Summarizer</h1>
        <p>Upload a PDF and turn its key ideas into a clear, structured summary.</p>
      </header>

      <FileUpload
        onFileSelected={upload}
        isUploading={state.uploadStatus === "uploading"}
        error={state.uploadError}
      />

      {state.document && (
        <>
          <section className="card document-details" aria-labelledby="document-heading">
            <h2 id="document-heading">Document information</h2>
            <dl>
              <div>
                <dt>File name</dt>
                <dd>{state.document.fileName}</dd>
              </div>
              <div>
                <dt>File size</dt>
                <dd>{(state.document.fileSizeBytes / 1_000_000).toFixed(2)} MB</dd>
              </div>
              <div>
                <dt>Pages</dt>
                <dd>{state.document.pageCount ?? "Not available"}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{state.document.processingStatus}</dd>
              </div>
            </dl>
          </section>

          <SummaryOptions
            selectedMode={state.summaryType}
            onModeChange={handleModeChange}
            onGenerate={handleGenerate}
            disabled={state.document.processingStatus !== "ready"}
            isGenerating={isGenerating}
          />

          <ProgressStatus
            stage={
              state.generationStatus === "processing"
                ? "summarizing"
                : state.generationStatus === "completed"
                  ? "completed"
                  : state.generationStatus === "failed"
                    ? "failed"
                    : "idle"
            }
          />
          <ErrorMessage message={state.summaryError} />
          <SummaryPanel
            content={state.summary?.content ?? null}
            isLoading={state.generationStatus === "processing"}
            error={null}
          />
        </>
      )}
    </main>
  );
}
