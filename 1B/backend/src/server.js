import app from './app.js';
import { getConfig } from './config/env.js';
import { closeDocumentStore } from './services/documentStore.js';

const { port } = getConfig();
const server = app.listen(port, () => {
  console.log(`PDF Document Chat API listening on port ${port}`);
});

function shutdown() {
  closeDocumentStore();
  server.close((error) => {
    if (error) {
      console.error('API shutdown failed', { errorName: error.name });
      process.exitCode = 1;
    }
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
