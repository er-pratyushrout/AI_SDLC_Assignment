export type ProgressStage = "idle" | "summarizing" | "completed" | "failed";

export interface ProgressStatusProps {
  stage: ProgressStage;
}

const stageMessages: Record<ProgressStage, string> = {
  idle: "Your PDF is ready to summarize.",
  summarizing: "Generating your summary…",
  completed: "Summary generation complete.",
  failed: "Summary generation failed.",
};

export function ProgressStatus({ stage }: ProgressStatusProps) {
  return (
    <p className="progress-status" role="status" aria-live="polite">
      {stageMessages[stage]}
    </p>
  );
}
