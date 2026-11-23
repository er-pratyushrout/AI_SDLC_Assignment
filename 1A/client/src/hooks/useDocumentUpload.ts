import { useCallback } from "react";
import { ApiError } from "../services/api-client";
import { uploadDocument } from "../services/document-api";
import type { SessionAction } from "../state/session.reducer";

export function useDocumentUpload(dispatch: React.Dispatch<SessionAction>) {
  const upload = useCallback(
    async (file: File): Promise<void> => {
      dispatch({ type: "upload-started" });
      try {
        const document = await uploadDocument(file);
        dispatch({ type: "upload-succeeded", document });
      } catch (error) {
        dispatch({
          type: "upload-failed",
          message:
            error instanceof ApiError
              ? error.message
              : "The PDF could not be uploaded. Check your connection and try again.",
        });
      }
    },
    [dispatch],
  );

  return { upload };
}
