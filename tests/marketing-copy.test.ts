import { describe, expect, it } from "vitest";
import {
  buildMarketingCopySystemPrompt,
  ensureShopifyDescription,
  normalizeMarketingCopyResult,
} from "@/lib/services/marketingCopy";
import { convertDescriptionToBodyHtml } from "@/lib/services/exportToSheets";

describe("marketing copy Shopify constraints", () => {
  it("adds concise Shopify description guidance and emoji guidance to the system prompt", () => {
    const prompt = buildMarketingCopySystemPrompt();

    expect(prompt).toContain("Keep the English section headings exactly unchanged");
    expect(prompt).toContain("Overview, Front Design, and Back Design must each be 1-2 short sentences");
    expect(prompt).toContain("Use a moderate amount of emoji in Shopify description body text");
    expect(prompt).toContain("Facebook copy should be concise, persuasive, and ad-ready.");
  });

  it("provides concise fallback Shopify descriptions with emoji while preserving headings", () => {
    const english = ensureShopifyDescription("", "en");
    const chinese = ensureShopifyDescription("", "cn");

    expect(english).toContain("Overview");
    expect(english).toContain("Front Design");
    expect(english).toContain("Back Design");
    expect(english).toContain("Why This Coin Stands Out");
    expect(english).toContain("✨");
    expect(english).toContain("🛡️");
    expect(english).toContain("🎖️");
    expect(english).toContain("🎁");
    expect(english).not.toContain("Describe the obverse composition");

    expect(chinese).toContain("概览");
    expect(chinese).toContain("正面设计");
    expect(chinese).toContain("背面设计");
    expect(chinese).toContain("这枚纪念币为何脱颖而出");
    expect(chinese).toContain("✨");
    expect(chinese).toContain("🛡️");
    expect(chinese).toContain("🎖️");
    expect(chinese).toContain("🎁");
    expect(chinese).not.toContain("说明纪念币正面的主要画面");
  });

  it("normalizes Shopify results to exactly four selling points and preserves Facebook output", () => {
    const result = normalizeMarketingCopyResult({
      shopify: {
        title: { en: "Title", cn: "标题" },
        subtitle: { en: "Subtitle", cn: "副标题" },
        selling_points: [{ en: "A", cn: "甲" }],
        description: { en: "", cn: "" },
      },
      facebook: {
        primary_text: { en: "Primary", cn: "主文案" },
        headline: { en: "Headline", cn: "标题" },
        description: { en: "Description", cn: "描述" },
        cta_suggestion: { en: "Shop now", cn: "立即购买" },
      },
    });

    expect(result.shopify.selling_points).toHaveLength(4);
    expect(result.shopify.description.en).toContain("Overview");
    expect(result.shopify.description.en).toContain("✨");
    expect(result.facebook.primary_text.en).toBe("Primary");
    expect(result.facebook.cta_suggestion.cn).toBe("立即购买");
  });

  it("compresses long Shopify overview, front, and back sections during normalization", () => {
    const result = normalizeMarketingCopyResult({
      shopify: {
        title: { en: "Title", cn: "标题" },
        subtitle: { en: "Subtitle", cn: "副标题" },
        selling_points: [],
        description: {
          en: [
            "Overview",
            "This commemorative coin is designed to celebrate a major milestone with rich symbolic storytelling, layered historical references, premium collectible appeal, and a memorable emotional message for supporters, families, and display collectors alike. It continues with extra explanation that should be trimmed away because it is too long for a concise product page. It even adds a third sentence that should never survive normalization.",
            "",
            "Front Design",
            "The front combines a central emblem, supporting laurels, engraved typography, raised texture, border detailing, and multiple symbolic accents that keep expanding far beyond a quick-read ecommerce description. Another sentence keeps talking and should be shortened. A third sentence should disappear.",
            "",
            "Back Design",
            "The back presents a second layer of symbolism, commemorative wording, relief depth, and framing elements in a way that becomes too descriptive for the intended Shopify layout. Another long sentence keeps the section bloated. A third sentence should disappear as well.",
            "",
            "Why This Coin Stands Out",
            "It is premium, meaningful, display-worthy, and built to feel like a lasting keepsake for gifting and collecting.",
          ].join("\n"),
          cn: [
            "概览",
            "这枚纪念币围绕主题展开了大量背景说明、情绪表达、收藏意义、礼赠场景和设计延伸内容，整体已经明显超过精炼商品页需要的篇幅，而且后面还补了很多解释，应该被压短。这一句也应该被截断。",
            "",
            "正面设计",
            "正面同时讲了很多构图层次、浮雕细节、刻字内容、边框元素和象征信息，内容过长，不适合现在想要的快读型 Shopify 页面。这一句也应该被压掉。",
            "",
            "背面设计",
            "背面又继续展开了大量补充说明、图像寓意、纹理层次和排版描述，已经超出了简洁商品文案应有的长度。这一句也应该被压掉。",
            "",
            "这枚纪念币为何脱颖而出",
            "它兼顾纪念价值、展示质感与礼赠属性，成品完成度高。",
          ].join("\n"),
        },
      },
      facebook: {
        primary_text: { en: "Primary", cn: "主文案" },
        headline: { en: "Headline", cn: "标题" },
        description: { en: "Description", cn: "描述" },
        cta_suggestion: { en: "Shop now", cn: "立即购买" },
      },
    });

    const overviewEn = result.shopify.description.en.split("\n\n")[0];
    const frontEn = result.shopify.description.en.split("\n\n")[1];
    const backEn = result.shopify.description.en.split("\n\n")[2];
    const overviewCn = result.shopify.description.cn.split("\n\n")[0];

    expect(overviewEn).toContain("Overview");
    expect(overviewEn).toContain("✨");
    expect(overviewEn).not.toContain("It even adds a third sentence");
    expect(overviewEn.length).toBeLessThan(180);

    expect(frontEn).toContain("Front Design");
    expect(frontEn).toContain("🛡️");
    expect(frontEn).not.toContain("A third sentence should disappear");
    expect(frontEn.length).toBeLessThan(180);

    expect(backEn).toContain("Back Design");
    expect(backEn).toContain("🎖️");
    expect(backEn).not.toContain("A third sentence should disappear as well");
    expect(backEn.length).toBeLessThan(180);

    expect(overviewCn).toContain("概览");
    expect(overviewCn).toContain("✨");
    expect(overviewCn).not.toContain("这一句也应该被截断");
    expect(overviewCn.length).toBeLessThan(90);
  });
});

describe("Shopify description export compatibility", () => {
  it("keeps fixed English headings parseable for HTML export", () => {
    const description = [
      "Overview",
      "A polished commemorative coin that feels gift-ready and display-worthy. ✨",
      "",
      "Front Design",
      "The front centers the emblem and engraved message in a crisp layout. 🛡️",
      "",
      "Back Design",
      "The back adds supporting symbols that complete the story. 🎖️",
      "",
      "Why This Coin Stands Out",
      "Built for meaningful gifting and proud display with a premium finish. 🎁",
    ].join("\n");

    const html = convertDescriptionToBodyHtml(
      description,
      "https://example.com/front.png",
      "https://example.com/back.png",
    );

    expect(html).toContain("<h3>Overview</h3>");
    expect(html).toContain("<h3>Front Design</h3>");
    expect(html).toContain("<h3>Back Design</h3>");
    expect(html).toContain("<h3>Why This Coin Stands Out</h3>");
    expect(html).toContain('src="https://example.com/front.png"');
    expect(html).toContain('src="https://example.com/back.png"');
    expect(html).toContain("gift-ready and display-worthy");
  });
});
