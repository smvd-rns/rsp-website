import { jwtVerify } from "jose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateM2MToken } from "./jwt";

describe("jwt", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should throw if JWT environment variables are missing", async () => {
    delete process.env.JWT_SECRET;
    await expect(generateM2MToken()).rejects.toThrow(
      "Missing JWT configuration environment variables.",
    );
  });

  it("should generate a valid signed JWT with default and custom audience", async () => {
    process.env.JWT_SECRET = "super-secret-key-that-is-at-least-32-chars-long";
    process.env.JWT_ISSUER = "rsp-admin";
    process.env.JWT_AUDIENCE = "rsp-services";

    const token = await generateM2MToken();
    expect(typeof token).toBe("string");

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      issuer: "rsp-admin",
      audience: "rsp-services",
    });
    expect(payload.iss).toBe("rsp-admin");
    expect(payload.aud).toBe("rsp-services");

    const customToken = await generateM2MToken("custom-audience");
    const { payload: customPayload } = await jwtVerify(customToken, secret, {
      issuer: "rsp-admin",
      audience: "custom-audience",
    });
    expect(customPayload.aud).toBe("custom-audience");
  });
});
