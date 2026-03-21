import { describe, expect, it } from "vitest";
import { extractTemplatePlaceholders, validateTemplatePlaceholders } from "@/utils/templateValidation";

describe("template validation", () => {
  it("extracts placeholders", () => {
    expect(extractTemplatePlaceholders("主题：{theme_cn}\n英文：{theme_en}")).toEqual([
      "theme_cn",
      "theme_en",
    ]);
  });

  it("rejects unknown placeholders", () => {
    const result = validateTemplatePlaceholders("主题：{theme_cn}\n未知：{foo}");
    expect(result.valid).toBe(false);
    expect(result.invalid).toEqual(["foo"]);
  });
});
