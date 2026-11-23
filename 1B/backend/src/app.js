import express from 'express';
import { ApiError } from './errors.js';
import { errorHandler } from './middleware/errorHandler.js';
import documentsRouter from './routes/documents.js';

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '128kb' }));

app.get('/api/health', (request, response) => {
  response.status(200).json({ status: 'ok' });
});
app.use('/api/documents', documentsRouter);
app.use((request, response, next) => {
  next(new ApiError(404, 'ROUTE_NOT_FOUND', 'The requested API route was not found.'));
});
app.use(errorHandler);

export default app;
