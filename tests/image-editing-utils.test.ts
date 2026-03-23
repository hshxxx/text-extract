import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { splitCombinedCoinImage } from "@/lib/image-editing/split";
import { trimWhiteBorder } from "@/lib/image-editing/trim";
import { padTrimmedSourceToSafeMargins, validateTrimmedSource } from "@/lib/image-editing/validate";

async function createWhiteCanvasWithRect(options: {
  width: number;
  height: number;
  rectX: number;
  rectY: number;
  rectWidth: number;
  rectHeight: number;
  color?: string;
}) {
  const svg = `
    <svg width="${options.width}" height="${options.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white" />
      <rect x="${options.rectX}" y="${options.rectY}" width="${options.rectWidth}" height="${options.rectHeight}" fill="${options.color ?? "black"}" />
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

describe("image editing preprocess", () => {
  it("splits a combined image by the vertical midpoint", async () => {
    const svg = `
      <svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" x="0" y="0" fill="red" />
        <rect width="100" height="100" x="100" y="0" fill="blue" />
      </svg>
    `;
    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();

    const split = await splitCombinedCoinImage(buffer);
    const front = await sharp(split.frontBuffer).raw().toBuffer({ resolveWithObject: true });
    const back = await sharp(split.backBuffer).raw().toBuffer({ resolveWithObject: true });

    expect(split.halfWidth).toBe(100);
    expect(front.info.width).toBe(100);
    expect(back.info.width).toBe(100);
    expect(front.data[0]).toBeGreaterThan(front.data[2]);
    expect(back.data[2]).toBeGreaterThan(back.data[0]);
  });

  it("trims white borders and returns a centered bounding box", async () => {
    const buffer = await createWhiteCanvasWithRect({
      width: 200,
      height: 200,
      rectX: 40,
      rectY: 40,
      rectWidth: 120,
      rectHeight: 120,
    });

    const trimmed = await trimWhiteBorder(buffer);

    expect(trimmed.boundingBox.width).toBeGreaterThan(120);
    expect(trimmed.boundingBox.height).toBeGreaterThan(120);
    expect(validateTrimmedSource(trimmed)).toBeNull();
  });

  it("repairs subjects that are too close to the edge by adding white margins", async () => {
    const buffer = await createWhiteCanvasWithRect({
      width: 200,
      height: 200,
      rectX: 1,
      rectY: 20,
      rectWidth: 120,
      rectHeight: 120,
    });

    const trimmed = await trimWhiteBorder(buffer);
    expect(validateTrimmedSource(trimmed)).toBe("OBJECT_TOO_CLOSE_TO_EDGE");
    const repaired = await padTrimmedSourceToSafeMargins(trimmed);

    expect(
      repaired.canvasWidth > trimmed.canvasWidth || repaired.canvasHeight > trimmed.canvasHeight,
    ).toBe(true);
    expect(validateTrimmedSource(repaired)).toBeNull();
  });
});
