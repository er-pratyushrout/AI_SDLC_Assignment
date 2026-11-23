import express from "express";
import multer from "multer";
import { AppError, errorHandler } from "../../../server/src/middleware/error-handler.middleware";
import {
  MAX_PDF_SIZE_BYTES,
  validateAndExtractPdf,
} from "../../../server/src/services/pdf/pdf.service";

export function createPdfUploadRouter(): express.Router {
  const router = express.Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_PDF_SIZE_BYTES, files: 1 },
  });

  router.post("/api/documents/upload", upload.single("file"), async (req, res, next) => {
    if (!req.file) {
      next(new AppError(415, "UNSUPPORTED_FILE_TYPE", "Choose a valid PDF file to continue."));
      return;
    }

    await validateAndExtractPdf({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
    res.status(201).json({ message: "PDF uploaded" });
  });

  router.use(errorHandler);
  return router;
}
