export const AUTH_REDIRECT_STORAGE_KEY = "rsp_admin_redirect_to";

/**
 * Validates that a redirect path is a safe relative internal route.
 * Prevents open-redirect attacks (e.g., //evil.com, http://evil.com, or /\evil.com).
 */
export const sanitizeRedirectUrl = (
  url: string | null | undefined,
): string | null => {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // Must start with '/' and not protocol-relative '//' or '/\'
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\")
  ) {
    return null;
  }

  // Must not redirect back to auth pages or unauthorized page
  if (trimmed.startsWith("/auth") || trimmed.startsWith("/unauthorized")) {
    return null;
  }

  return trimmed;
};

/**
 * Stores the target redirect URL in sessionStorage.
 */
export const setRedirectUrl = (url: string | null | undefined): void => {
  if (typeof window === "undefined") return;
  const safeUrl = sanitizeRedirectUrl(url);
  if (!safeUrl || safeUrl === "/") return;

  try {
    window.sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, safeUrl);
  } catch (error) {
    console.error("Failed to save redirect URL to sessionStorage", error);
  }
};

/**
 * Retrieves the stored redirect URL from sessionStorage.
 * Falls back to fallbackUrl (defaulting to "/").
 */
export const getRedirectUrl = (fallbackUrl = "/"): string => {
  if (typeof window === "undefined") return fallbackUrl;

  try {
    const stored = window.sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY);
    const safeUrl = sanitizeRedirectUrl(stored);
    return safeUrl || fallbackUrl;
  } catch (error) {
    console.error("Failed to read redirect URL from sessionStorage", error);
    return fallbackUrl;
  }
};

/**
 * Clears the stored redirect URL from sessionStorage.
 */
export const clearRedirectUrl = (): void => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear redirect URL from sessionStorage", error);
  }
};

/**
 * Retrieves the stored redirect URL and clears it in a single operation.
 */
export const getAndClearRedirectUrl = (fallbackUrl = "/"): string => {
  const target = getRedirectUrl(fallbackUrl);
  clearRedirectUrl();
  return target;
};
