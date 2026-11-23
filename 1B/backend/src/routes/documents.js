import { Router } from 'express';
import {
  deleteDocument,
  getDocumentStatus,
  uploadDocument,
} from '../controllers/documentsController.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.post('/', upload.single('file'), uploadDocument);
router.get('/:documentId', getDocumentStatus);
router.delete('/:documentId', deleteDocument);

export default router;
