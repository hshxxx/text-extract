import { describe, expect, it } from "vitest";
import { renderTemplate } from "@/utils/templateRenderer";

describe("renderTemplate", () => {
  it("replaces placeholders with structured data", () => {
    expect(
      renderTemplate("主题：{theme_cn}", {
        theme_cn: "丝路",
        theme_en: "",
        coin_front_element: "",
        coin_front_text: "",
        coin_back_element: "",
        coin_back_text: "",
        style_requirements: "",
      }),
    ).toBe("主题：丝路");
  });
});
