import { describe, expect, it } from "vitest";
import { normalizeStructuredData } from "@/utils/schema";

describe("normalizeStructuredData", () => {
  it("fills missing fields with empty strings", () => {
    const value = normalizeStructuredData({
      theme_cn: "丝路",
      theme_en: "Silk Road",
    });

    expect(value.coin_front_element).toBe("");
    expect(value.theme_cn).toBe("丝路");
  });
});
