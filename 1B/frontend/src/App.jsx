import { useEffect, useRef } from 'react';
import DocumentStatus from './components/DocumentStatus.jsx';
import PdfUploader from './components/PdfUploader.jsx';
import PdfViewer from './components/PdfViewer.jsx';
import {
  deleteDocument,
  getDocumentStatus,
  normalizeApiError,
  uploadDocument,
} from './services/documentsApi.js';
import { useDocumentSession } from './context/DocumentSessionContext.jsx';

function waitForNextPoll(signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }
    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, 500);
    const abort = () => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    };
    signal.addEventListener('abort', abort, { once: true });
  });
}

export default function App() {
  const { state, dispatch } = useDocumentSession();
  const activeRequest = useRef(null);

  useEffect(
    () => () => {
      activeRequest.current?.abort();
    },
    [],
  );

  async function handleFileSelected(file) {
    const previousDocumentId = state.document?.documentId;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    dispatch({ type: 'document-replaced', file });

    if (previousDocumentId) {
      deleteDocument(previousDocumentId).catch((error) => {
        console.warn('Could not release the previous document', {
          errorCode: normalizeApiError(error).code,
        });
      });
    }

    try {
      let document = await uploadDocument(file, { signal: controller.signal });
      if (controller.signal.aborted) return;
      dispatch({ type: 'document-accepted', document });

      while (document.status === 'processing') {
        await waitForNextPoll(controller.signal);
        document = await getDocumentStatus(document.documentId, { signal: controller.signal });
        if (controller.signal.aborted) return;
        dispatch({ type: 'document-status-updated', document });
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      dispatch({ type: 'document-failed', error: normalizeApiError(error) });
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">DOCUMENT WORKSPACE</p>
          <h1>PDF Document Chat</h1>
          <p className="header-description">Upload a text-based PDF to prepare it for questions.</p>
        </div>
        <PdfUploader onFileSelected={handleFileSelected} />
      </header>

      <DocumentStatus status={state.status} error={state.error} />

      <div className="workspace">
        <section className="workspace-panel document-panel" aria-labelledby="document-heading">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">YOUR FILE</p>
              <h2 id="document-heading">{state.file?.name ?? 'Document preview'}</h2>
            </div>
            {state.document?.status === 'ready' && <span className="ready-badge">Ready</span>}
          </div>
          <PdfViewer file={state.file} />
        </section>

        <section className="workspace-panel chat-placeholder" aria-labelledby="chat-heading">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">WORKSPACE</p>
              <h2 id="chat-heading">Chat about your PDF</h2>
            </div>
          </div>
          <div className="empty-chat" role="status" aria-live="polite">
            {state.status === 'ready'
              ? 'Your document is ready. Chat will be available in the next implementation phase.'
              : 'Upload and process a PDF before starting a conversation.'}
          </div>
        </section>
      </div>
    </main>
  );
}
