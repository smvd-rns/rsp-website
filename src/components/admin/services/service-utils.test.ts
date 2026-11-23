import { describe, expect, it } from "vitest";
import { matchesServiceUser } from "./service-utils";

describe("matchesServiceUser", () => {
  it("returns true when search query is empty", () => {
    const item = {
      users: { email: "test@example.com", name: "John Doe" },
      services: { name: "Audio Editing" },
    };
    expect(matchesServiceUser(item, "")).toBe(true);
  });

  it("matches against user email", () => {
    const item = {
      users: { email: "volunteer@example.com", name: "Jane" },
      services: { name: "Translation" },
    };
    expect(matchesServiceUser(item, "volunteer")).toBe(true);
    expect(matchesServiceUser(item, "other")).toBe(false);
  });

  it("matches against user name", () => {
    const item = {
      users: { email: "user@example.com", name: "Alice Wonderland" },
      services: { name: "Transcription" },
    };
    expect(matchesServiceUser(item, "alice")).toBe(true);
  });

  it("matches against service name", () => {
    const item = {
      users: { email: "user@example.com", name: "Bob" },
      services: { name: "Video Production" },
    };
    expect(matchesServiceUser(item, "video")).toBe(true);
  });

  it("matches against extraField if provided", () => {
    const item = {
      users: { email: "user@example.com", name: "Charlie" },
      services: { name: "Review" },
    };
    expect(matchesServiceUser(item, "manager", "Volunteer Manager")).toBe(true);
  });

  it("handles null or missing user/service gracefully", () => {
    const item = {
      users: null,
      services: null,
    };
    expect(matchesServiceUser(item, "anything")).toBe(false);
  });
});
