import type { SummaryContent } from "../services/document-api";
import { ErrorMessage } from "./ErrorMessage";

export interface SummaryPanelProps {
  content: SummaryContent | null;
  isLoading: boolean;
  error?: string | null;
}

const sections: Array<{ key: keyof SummaryContent; label: string }> = [
  { key: "keyPoints", label: "Key points" },
  { key: "findings", label: "Important findings" },
  { key: "conclusions", label: "Conclusions" },
];

export function SummaryPanel({ content, isLoading, error = null }: SummaryPanelProps) {
  return (
    <section className="card summary-panel" aria-labelledby="summary-heading">
      <h2 id="summary-heading">Summary</h2>
      {isLoading && (
        <p role="status" aria-live="polite">
          Generating your summary…
        </p>
      )}
      <ErrorMessage message={error} />
      {content &&
        sections.map(({ key, label }) => (
          <section key={key} aria-labelledby={`summary-${key}`}>
            <h3 id={`summary-${key}`}>{label}</h3>
            {content[key].length > 0 ? (
              <ul>
                {content[key].map((item, index) => (
                  <li key={`${key}-${index}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>Not identified in the source document.</p>
            )}
          </section>
        ))}
      {!content && !isLoading && !error && <p>Your generated summary will appear here.</p>}
    </section>
  );
}
