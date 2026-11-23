import type { SummaryMode } from "../services/document-api";

export interface SummaryOptionsProps {
  selectedMode: SummaryMode;
  onModeChange: (mode: SummaryMode) => void;
  onGenerate: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
}

const modes: Array<{ value: SummaryMode; label: string }> = [
  { value: "brief", label: "Brief" },
  { value: "standard", label: "Standard" },
  { value: "detailed", label: "Detailed" },
];

export function SummaryOptions({
  selectedMode,
  onModeChange,
  onGenerate,
  disabled = false,
  isGenerating = false,
}: SummaryOptionsProps) {
  return (
    <section className="card" aria-labelledby="summary-options-heading">
      <h2 id="summary-options-heading">Summary detail</h2>
      <fieldset disabled={disabled || isGenerating}>
        <legend>Choose a summary mode</legend>
        <div className="mode-options">
          {modes.map((mode) => (
            <label key={mode.value}>
              <input
                type="radio"
                name="summary-mode"
                value={mode.value}
                checked={selectedMode === mode.value}
                onChange={() => onModeChange(mode.value)}
              />
              {mode.label}
            </label>
          ))}
        </div>
      </fieldset>
      <button
        className="primary-button"
        type="button"
        onClick={onGenerate}
        disabled={disabled || isGenerating}
      >
        {isGenerating ? "Generating summary…" : "Generate summary"}
      </button>
    </section>
  );
}
