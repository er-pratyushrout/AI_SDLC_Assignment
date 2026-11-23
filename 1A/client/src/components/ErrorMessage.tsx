export interface ErrorMessageProps {
  message: string | null;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorMessage({ message, onRetry, retryLabel = "Try again" }: ErrorMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="error-message" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}
