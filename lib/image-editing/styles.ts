import type { EditSide, EditStyleKey } from "@/lib/types/domain";

export type EditImageStyleConfig = {
  scenePrompt: string;
};

export const EDIT_STYLE_KEYS: EditStyleKey[] = [
  "luxury_wood",
  "premium_giftbox",
  "dark_luxury_stage",
  "soft_studio_light",
  "elegant_pedestal",
  "premium_velvet",
];

const STYLE_CONFIGS: Record<EditStyleKey, EditImageStyleConfig> = {
  luxury_wood: {
    scenePrompt:
      "Place the coin on a premium dark walnut tabletop with visible natural wood grain, a refined collector-display setting, warm directional studio lighting, a soft but noticeable shadow under the coin, subtle reflected highlights around the metal edge, and a rich luxury product-photography atmosphere. The wooden surface and surrounding tabletop context must be clearly visible rather than plain white.",
  },
  premium_giftbox: {
    scenePrompt:
      "Present the coin in an elegant premium gift-box scene with the coin resting inside or just above a refined presentation insert, visible box material details, tasteful packaging edges, soft luxury ecommerce lighting, gentle depth, and a polished collector-gift presentation. The result should clearly read as a premium boxed display scene, not an empty white studio background.",
  },
  dark_luxury_stage: {
    scenePrompt:
      "Present the coin on a dark luxury showcase stage with a visibly distinct stage base, cinematic premium spotlighting, rich contrast, soft environmental falloff, elegant shadow separation, and a dramatic high-end collectible display mood. The background should be dark, atmospheric, and clearly designed, not flat or blank.",
  },
  soft_studio_light: {
    scenePrompt:
      "Create a clean premium studio ecommerce scene with a soft warm-neutral backdrop, gentle gradient depth, a visible surface plane, realistic contact shadow, polished commercial lighting, and a minimal but clearly non-white product-photography environment. The background should remain elegant and restrained, but it must still be visibly different from the original plain white source.",
  },
  elegant_pedestal: {
    scenePrompt:
      "Display the coin on an elegant premium pedestal with a clearly visible base, refined museum-style presentation, soft spotlighting, subtle ambient depth, tasteful luxury shadows, and a curated collectible showcase look. The pedestal and surrounding environment should be clearly visible and should create a strong premium display context.",
  },
  premium_velvet: {
    scenePrompt:
      "Display the coin on a premium velvet collector surface with rich visible fabric texture, subtle folds, luxury showcase styling, warm premium lighting, clear contact shadow, and a high-end collector presentation atmosphere. The velvet surface and surrounding scene must be clearly visible, luxurious, and textured rather than plain or empty.",
  },
};

export function getRandomEditStyle() {
  const index = Math.floor(Math.random() * EDIT_STYLE_KEYS.length);
  return EDIT_STYLE_KEYS[index];
}

export function getStyleConfig(style: EditStyleKey) {
  return STYLE_CONFIGS[style];
}

export function buildEditImagePrompt(style: EditStyleKey, side: EditSide) {
  const config = getStyleConfig(style);
  const sideLabel = side === "front" ? "front / obverse" : "back / reverse";

  return `Edit the uploaded commemorative challenge coin image into a premium ecommerce-ready product shot.

This uploaded image is the ${sideLabel} side of a single commemorative coin.

Hard constraints:
- Preserve the uploaded commemorative coin design, shape, engraved text, relief details, and metal material.
- Do not change the coin artwork itself.
- Replace only the surrounding scene and background presentation.
- Keep the entire coin fully visible, centered, and not cropped.
- Show only one coin in the frame.
- Keep the result realistic, collectible, and suitable for premium product display.
- Do not add extra coins, hands, people, labels, packaging text, logos, or unrelated objects.
- Do not turn the coin into a different object, medal, badge, or illustration style.
- The new scene and background must be clearly visible and intentionally designed.
- Do not keep the original plain white cutout background.
- Add a believable display surface or environment that matches the selected style.
- Keep the coin as the primary subject, but make the surrounding background visibly richer than a blank studio cutout.

Scene direction:
${config.scenePrompt}`;
}
