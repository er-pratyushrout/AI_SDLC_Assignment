const statusMessages = {
  idle: 'Choose a PDF to get started.',
  uploading: 'Uploading PDF…',
  processing: 'Processing PDF…',
  ready: 'PDF ready to use.',
  failed: 'The PDF could not be processed.',
};

export default function DocumentStatus({ status = 'idle', error = null }) {
  if (status === 'failed' || error) {
    return (
      <div className="status-message status-error" role="alert">
        <strong>{error?.message ?? statusMessages.failed}</strong>
        <span>Choose another PDF or try again.</span>
      </div>
    );
  }

  return (
    <p className="status-message" role="status" aria-live="polite">
      {statusMessages[status] ?? statusMessages.idle}
    </p>
  );
}
