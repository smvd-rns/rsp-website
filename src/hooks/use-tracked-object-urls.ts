import { useCallback, useEffect, useRef } from "react";

export const useTrackedObjectURLs = () => {
  const objectUrlsRef = useRef<string[]>([]);

  const createTrackedObjectURL = useCallback((blobOrFile: Blob | File) => {
    const url = URL.createObjectURL(blobOrFile);
    objectUrlsRef.current.push(url);
    return url;
  }, []);

  const revokeAllTrackedUrls = useCallback(() => {
    objectUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        console.warn("Error revoking URL:", e);
      }
    });
    objectUrlsRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      revokeAllTrackedUrls();
    };
  }, [revokeAllTrackedUrls]);

  return {
    createTrackedObjectURL,
    revokeAllTrackedUrls,
    objectUrlsRef,
  };
};
