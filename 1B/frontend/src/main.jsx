import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { DocumentSessionProvider } from './context/DocumentSessionContext.jsx';
import './styles/app.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DocumentSessionProvider>
      <App />
    </DocumentSessionProvider>
  </React.StrictMode>,
);
