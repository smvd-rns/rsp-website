import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AUTH_REDIRECT_STORAGE_KEY,
  clearRedirectUrl,
  getAndClearRedirectUrl,
  getRedirectUrl,
  sanitizeRedirectUrl,
  setRedirectUrl,
} from "./auth-redirect";

describe("auth-redirect utility", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  describe("sanitizeRedirectUrl", () => {
    it("returns null for non-string or empty input", () => {
      expect(sanitizeRedirectUrl(null)).toBeNull();
      expect(sanitizeRedirectUrl(undefined)).toBeNull();
      expect(sanitizeRedirectUrl("")).toBeNull();
      expect(sanitizeRedirectUrl("   ")).toBeNull();
    });

    it("rejects absolute and protocol-relative external URLs", () => {
      expect(sanitizeRedirectUrl("https://malicious.com")).toBeNull();
      expect(sanitizeRedirectUrl("http://malicious.com")).toBeNull();
      expect(sanitizeRedirectUrl("//malicious.com")).toBeNull();
      expect(sanitizeRedirectUrl("/\\malicious.com")).toBeNull();
      expect(sanitizeRedirectUrl("javascript:alert(1)")).toBeNull();
    });

    it("rejects auth and unauthorized routes to prevent redirect loops", () => {
      expect(sanitizeRedirectUrl("/auth/login")).toBeNull();
      expect(sanitizeRedirectUrl("/auth/sign-up")).toBeNull();
      expect(sanitizeRedirectUrl("/unauthorized")).toBeNull();
    });

    it("accepts valid internal paths and query parameters", () => {
      expect(sanitizeRedirectUrl("/queries?id=q-10")).toBe("/queries?id=q-10");
      expect(sanitizeRedirectUrl("/content/categories")).toBe(
        "/content/categories",
      );
      expect(sanitizeRedirectUrl("/users")).toBe("/users");
    });
  });

  describe("setRedirectUrl & getRedirectUrl", () => {
    it("stores valid redirect URL in sessionStorage", () => {
      setRedirectUrl("/queries?id=q-10");
      expect(window.sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY)).toBe(
        "/queries?id=q-10",
      );
      expect(getRedirectUrl()).toBe("/queries?id=q-10");
    });

    it("does not store root '/' path or invalid URLs", () => {
      setRedirectUrl("/");
      expect(
        window.sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY),
      ).toBeNull();

      setRedirectUrl("https://evil.com");
      expect(
        window.sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY),
      ).toBeNull();
    });

    it("falls back to default fallback if not found", () => {
      expect(getRedirectUrl()).toBe("/");
      expect(getRedirectUrl("/dashboard")).toBe("/dashboard");
    });
  });

  describe("clearRedirectUrl & getAndClearRedirectUrl", () => {
    it("clears stored URL from sessionStorage", () => {
      setRedirectUrl("/queries?id=q-10");
      clearRedirectUrl();
      expect(
        window.sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY),
      ).toBeNull();
      expect(getRedirectUrl()).toBe("/");
    });

    it("getAndClearRedirectUrl retrieves and removes in one step", () => {
      setRedirectUrl("/queries?id=q-10");
      const target = getAndClearRedirectUrl();
      expect(target).toBe("/queries?id=q-10");
      expect(
        window.sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY),
      ).toBeNull();
    });
  });
});
