import { describe, expect, it } from "vitest";
import { buildImageGenerationPrompt } from "@/lib/services/imageGeneration";
import { DEFAULT_TEMPLATE_CONTENT } from "@/utils/constants";
import { renderTemplate } from "@/utils/templateRenderer";

describe("image generation prompt wrapper", () => {
  it("wraps source prompt with coin-specific image constraints", () => {
    const sourcePrompt = `请基于以下结构化信息，生成一段适合纪念币设计的标准 Prompt：

主题（中文）：美国退伍老兵日
主题（英文）：Day of the Veterans`;

    const wrapped = buildImageGenerationPrompt(sourcePrompt);

    expect(wrapped).toContain("Create a high-quality commemorative challenge coin design image.");
    expect(wrapped).toContain("Render both the obverse and reverse of the same coin in one image.");
    expect(wrapped).toContain("Show the two coin faces side by side, with equal visual weight, centered composition, and enough outer margin so both full coin rims are completely visible.");
    expect(wrapped).toContain("Design density requirements:");
    expect(wrapped).toContain("Avoid large empty blank areas on either coin face.");
    expect(wrapped).toContain("Do not generate a poster, page, slide, instruction card, or typography layout.");
    expect(wrapped).toContain("Any wording provided in the design should appear only as engraved inscription on the coin surface.");
    expect(wrapped).toContain(sourcePrompt);
  });
});

describe("default template content", () => {
  it("renders a direct visual coin description instead of a meta prompt instruction", () => {
    const rendered = renderTemplate(DEFAULT_TEMPLATE_CONTENT, {
      theme_cn: "美国退伍老兵日",
      theme_en: "Day of the Veterans",
      coin_front_element: "军人剪影、美国国旗、秃鹰",
      coin_front_text: "Honoring Those Who Served",
      coin_back_element: "折叠国旗（三角旗）",
      coin_back_text: "Thank You for Your Service",
      style_requirements: "庄重、纪念性、爱国主题",
    });

    expect(rendered).toContain('Design a commemorative challenge coin for "Day of the Veterans" (美国退伍老兵日).');
    expect(rendered).toContain("Show both the obverse and reverse of the same coin in one image.");
    expect(rendered).toContain("Inscription engraved on the coin: Honoring Those Who Served");
    expect(rendered).not.toContain("生成一段适合纪念币设计的标准 Prompt");
    expect(rendered).not.toContain("主题（中文）：");
  });
});
