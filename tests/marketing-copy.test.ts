import { describe, expect, it } from "vitest";
import {
  generateMarketingCopyWithEmojiRetry,
  getMarketingCopyEmojiCoverageIssues,
  normalizeMarketingCopyResult,
} from "@/lib/services/marketingCopy";

function createValidMarketingCopy() {
  return {
    shopify: {
      title: {
        en: "Veterans Tribute Challenge Coin",
        cn: "退伍军人纪念挑战币",
      },
      subtitle: {
        en: "Honor every story with pride 🎖️",
        cn: "让每一份荣誉都被看见 🎖️",
      },
      selling_points: [
        {
          en: "✨ Rich relief details for a premium display piece",
          cn: "✨ 浮雕层次丰富，陈列更有质感",
        },
        {
          en: "🦅 Front artwork captures service and national pride",
          cn: "🦅 正面图案凝聚服役精神与荣耀",
        },
        {
          en: "🎁 Meaningful keepsake for veterans and families",
          cn: "🎁 适合作为军人与家属的纪念礼物",
        },
        {
          en: "🏅 Collectible finish with lasting commemorative value",
          cn: "🏅 收藏级质感，纪念意义持久",
        },
      ],
      description: {
        en: [
          "Overview",
          "Celebrate courage and remembrance with a premium tribute coin ✨",
          "",
          "Front Design",
          "The obverse pairs heroic symbols with crisp relief engraving 🎖️",
          "",
          "Back Design",
          "The reverse completes the story with ceremonial detail 🦅",
          "",
          "Why This Coin Stands Out",
          "It balances emotional meaning, display quality, and gifting appeal 🎁",
        ].join("\n"),
        cn: [
          "概览",
          "这是一枚兼具纪念意义与收藏质感的纪念币 ✨",
          "",
          "正面设计",
          "正面通过浮雕与主题元素传达服役荣誉 🎖️",
          "",
          "背面设计",
          "背面细节完整呼应主题，强化纪念氛围 🦅",
          "",
          "这枚纪念币为何脱颖而出",
          "它兼具礼赠价值、陈列效果与情感表达 🎁",
        ].join("\n"),
      },
    },
    facebook: {
      primary_text: {
        en: "Honor, pride, and remembrance in one collectible tribute coin 🎖️✨",
        cn: "把致敬、荣耀与纪念浓缩进这一枚收藏纪念币 🎖️✨",
      },
      headline: {
        en: "A Lasting Tribute 🎁",
        cn: "一份长久珍藏的致敬 🎁",
      },
      description: {
        en: "Meaningful display piece for veterans and families 🦅",
        cn: "适合军人与家属珍藏陈列的纪念之作 🦅",
      },
      cta_suggestion: {
        en: "Shop the tribute now ✨",
        cn: "立即收藏这份致敬 ✨",
      },
    },
  };
}

describe("marketing copy helpers", () => {
  it("normalizes selling points, preserves emoji, and keeps Shopify description sections", () => {
    const normalized = normalizeMarketingCopyResult({
      shopify: {
        title: { en: "Tribute coin", cn: "纪念币" },
        subtitle: { en: "Honor with pride 🎖️", cn: "荣耀致敬 🎖️" },
        selling_points: [
          { en: "✨ Premium finish", cn: "✨ 质感出众" },
          { en: "🎁 Gift-ready keepsake", cn: "🎁 送礼合适" },
        ],
        description: {
          en: "✨ Premium tribute coin for collectors",
          cn: "✨ 适合收藏与纪念的高品质纪念币",
        },
      },
      facebook: {
        primary_text: { en: "Tribute copy 🎖️✨", cn: "致敬文案 🎖️✨" },
        headline: { en: "Honor 🎁", cn: "致敬 🎁" },
        description: { en: "Keepsake 🦅", cn: "纪念之作 🦅" },
        cta_suggestion: { en: "Shop now ✨", cn: "立即查看 ✨" },
      },
    });

    expect(normalized.shopify.selling_points).toHaveLength(4);
    expect(normalized.shopify.selling_points[0].en).toContain("✨");
    expect(normalized.shopify.description.en).toContain("Overview");
    expect(normalized.shopify.description.en).toContain("✨ Premium tribute coin for collectors");
    expect(normalized.shopify.description.cn).toContain("概览");
    expect(normalized.shopify.description.cn).toContain("✨ 适合收藏与纪念的高品质纪念币");
  });

  it("reports emoji coverage gaps and passes compliant copy", () => {
    const invalid = normalizeMarketingCopyResult({
      shopify: {
        title: { en: "Tribute coin", cn: "纪念币" },
        subtitle: { en: "Honor with pride", cn: "荣耀致敬" },
        selling_points: [{ en: "Premium finish", cn: "质感出众" }],
        description: { en: "Overview\nPlain copy", cn: "概览\n普通文案" },
      },
      facebook: {
        primary_text: { en: "Tribute coin", cn: "致敬纪念币" },
        headline: { en: "Honor", cn: "致敬" },
        description: { en: "Keepsake", cn: "纪念之作" },
        cta_suggestion: { en: "Shop now", cn: "立即查看" },
      },
    });

    const issues = getMarketingCopyEmojiCoverageIssues(invalid);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((issue) => issue.field === "shopify.subtitle" && issue.language === "en")).toBe(true);
    expect(issues.some((issue) => issue.field === "facebook.primary_text" && issue.language === "cn")).toBe(true);

    expect(getMarketingCopyEmojiCoverageIssues(normalizeMarketingCopyResult(createValidMarketingCopy()))).toEqual([]);
  });

  it("retries once when the first generated draft misses emoji coverage", async () => {
    let calls = 0;

    const result = await generateMarketingCopyWithEmojiRetry(async ({ attempt, emojiRetryInstruction }) => {
      calls += 1;

      if (attempt === 0) {
        expect(emojiRetryInstruction).toBeNull();

        return JSON.stringify({
          shopify: {
            title: { en: "Tribute coin", cn: "纪念币" },
            subtitle: { en: "Honor with pride", cn: "荣耀致敬" },
            selling_points: [{ en: "Premium finish", cn: "质感出众" }],
            description: { en: "Overview\nPlain copy", cn: "概览\n普通文案" },
          },
          facebook: {
            primary_text: { en: "Tribute coin", cn: "致敬纪念币" },
            headline: { en: "Honor", cn: "致敬" },
            description: { en: "Keepsake", cn: "纪念之作" },
            cta_suggestion: { en: "Shop now", cn: "立即查看" },
          },
        });
      }

      expect(emojiRetryInstruction).toContain("shopify.subtitle.en");
      expect(emojiRetryInstruction).toContain("facebook.primary_text.en");

      return JSON.stringify(createValidMarketingCopy());
    });

    expect(calls).toBe(2);
    expect(result.facebook.primary_text.en).toContain("🎖️");
    expect(result.shopify.selling_points[0].cn).toContain("✨");
  });
});
