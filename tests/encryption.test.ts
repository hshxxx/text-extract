import { beforeEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/utils/encryption";

describe("encryption", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = "test-key";
  });

  it("encrypts and decrypts values", () => {
    const encrypted = encryptSecret("super-secret");
    expect(encrypted).not.toBe("super-secret");
    expect(decryptSecret(encrypted)).toBe("super-secret");
  });

  it("throws on malformed payload", () => {
    expect(() => decryptSecret("bad")).toThrow();
  });
});
