import { afterEach, describe, expect, it, vi } from "vitest";
import { buildEditImagePrompt } from "@/lib/image-editing/styles";
import { generateEditedCoinImage } from "@/lib/services/image-edit-adapter/openai";

describe("openai image edit adapter", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("builds a constrained edit prompt for the selected style", () => {
    const prompt = buildEditImagePrompt("luxury_wood", "front");

    expect(prompt).toContain("Preserve the uploaded commemorative coin design");
    expect(prompt).toContain("Show only one coin in the frame");
    expect(prompt).toContain("front / obverse");
    expect(prompt).toContain("Do not keep the original plain white cutout background");
    expect(prompt).toContain("walnut tabletop");
  });

  it("posts multipart edits request and parses b64_json responses", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ b64_json: Buffer.from("edited-image").toString("base64") }],
      }),
    }) as typeof fetch;

    const result = await generateEditedCoinImage({
      image: Buffer.from("source-image"),
      side: "back",
      style: "premium_giftbox",
      modelConfig: {
        model: "gpt-image-1.5",
        base_url: "https://example-proxy.test/v1",
        apiKey: "test-key",
      },
    });

    expect(result.bytes.equals(Buffer.from("edited-image"))).toBe(true);
    expect(result.contentType).toBe("image/png");
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, init] = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://example-proxy.test/v1/images/edits");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");

    const form = init.body as FormData;
    expect(form.get("model")).toBe("gpt-image-1.5");
    expect(form.get("size")).toBe("1024x1024");
    expect(form.get("response_format")).toBe("b64_json");
    expect(typeof form.get("prompt")).toBe("string");
    expect(form.get("image[]")).toBeTruthy();
  });

  it("does not retry timed out image edit requests", async () => {
    global.fetch = vi.fn().mockRejectedValue(
      Object.assign(new Error("request timed out"), { name: "TimeoutError" }),
    ) as typeof fetch;

    await expect(
      generateEditedCoinImage({
        image: Buffer.from("source-image"),
        side: "front",
        style: "luxury_wood",
        modelConfig: {
          model: "gpt-image-1.5",
          base_url: "https://example-proxy.test/v1",
          apiKey: "test-key",
        },
      }),
    ).rejects.toMatchObject({
      message: "PHOTOROOM_TIMEOUT",
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
