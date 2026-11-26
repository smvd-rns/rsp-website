import { describe, expect, it } from "vitest";
import {
  DEFAULT_CALENDAR_URL,
  getCalendarViewerUrls,
} from "./calendar-utils";

describe("calendar-utils", () => {
  it("handles default calendar url when input is null or empty", () => {
    const urls = getCalendarViewerUrls(null);
    expect(urls.fileId).toBe("12wZ7WHHnlEy1u8uLw_Z5Kn6flrCVJ12P");
    expect(urls.embedUrl).toBe(
      "https://drive.google.com/file/d/12wZ7WHHnlEy1u8uLw_Z5Kn6flrCVJ12P/preview",
    );
    expect(urls.downloadUrl).toBe(
      "https://drive.google.com/uc?export=download&id=12wZ7WHHnlEy1u8uLw_Z5Kn6flrCVJ12P",
    );
    expect(urls.viewUrl).toBe(
      "https://drive.google.com/file/d/12wZ7WHHnlEy1u8uLw_Z5Kn6flrCVJ12P/view",
    );
  });

  it("handles Google Docs links correctly", () => {
    const docUrl =
      "https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit";
    const urls = getCalendarViewerUrls(docUrl);
    expect(urls.fileId).toBe("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms");
    expect(urls.embedUrl).toBe(
      "https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview",
    );
    expect(urls.downloadUrl).toBe(
      "https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export?format=pdf",
    );
  });

  it("handles Google Sheets links correctly", () => {
    const sheetUrl =
      "https://docs.google.com/spreadsheets/d/1VchYKVozgSynPoGXKsR0vJWKRUcSeVg4vDPJCvaoaBo/edit#gid=0";
    const urls = getCalendarViewerUrls(sheetUrl);
    expect(urls.fileId).toBe("1VchYKVozgSynPoGXKsR0vJWKRUcSeVg4vDPJCvaoaBo");
    expect(urls.embedUrl).toBe(
      "https://docs.google.com/spreadsheets/d/1VchYKVozgSynPoGXKsR0vJWKRUcSeVg4vDPJCvaoaBo/preview",
    );
    expect(urls.downloadUrl).toBe(
      "https://docs.google.com/spreadsheets/d/1VchYKVozgSynPoGXKsR0vJWKRUcSeVg4vDPJCvaoaBo/export?format=xlsx",
    );
  });

  it("handles general drive file with ?id= query param", () => {
    const url = "https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz";
    const urls = getCalendarViewerUrls(url);
    expect(urls.fileId).toBe("1AbCdEfGhIjKlMnOpQrStUvWxYz");
    expect(urls.embedUrl).toBe(
      "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/preview",
    );
    expect(urls.downloadUrl).toBe(
      "https://drive.google.com/uc?export=download&id=1AbCdEfGhIjKlMnOpQrStUvWxYz",
    );
  });
});
