import multer from 'multer';
import { MAX_PDF_BYTES } from '../services/pdfService.js';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PDF_BYTES,
    files: 1,
    fields: 0,
    parts: 1,
  },
});
