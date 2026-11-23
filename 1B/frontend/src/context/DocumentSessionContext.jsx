import { createContext, useContext, useMemo, useReducer } from 'react';

const initialState = {
  file: null,
  document: null,
  status: 'idle',
  error: null,
  messages: [],
  summary: null,
};

function documentSessionReducer(state, action) {
  switch (action.type) {
    case 'document-replaced':
      return {
        ...initialState,
        file: action.file,
        status: 'uploading',
      };
    case 'document-accepted':
      return {
        ...state,
        document: action.document,
        status: action.document.status,
        error: action.document.error ?? null,
      };
    case 'document-status-updated':
      return {
        ...state,
        document: action.document,
        status: action.document.status,
        error: action.document.error ?? null,
      };
    case 'document-failed':
      return {
        ...state,
        status: 'failed',
        error: action.error,
      };
    case 'session-cleared':
      return initialState;
    default:
      return state;
  }
}

const DocumentSessionContext = createContext(null);

export function DocumentSessionProvider({ children }) {
  const [state, dispatch] = useReducer(documentSessionReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <DocumentSessionContext.Provider value={value}>{children}</DocumentSessionContext.Provider>
  );
}

export function useDocumentSession() {
  const context = useContext(DocumentSessionContext);
  if (!context) {
    throw new Error('useDocumentSession must be used within DocumentSessionProvider.');
  }
  return context;
}

export { documentSessionReducer, initialState };
