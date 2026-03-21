import { describe, expect, it } from "vitest";
import { parseModelJson } from "@/utils/jsonRepair";

describe("parseModelJson", () => {
  it("parses valid json", () => {
    expect(parseModelJson('{"theme_cn":"丝路"}')).toEqual({ theme_cn: "丝路" });
  });

  it("repairs invalid json", () => {
    expect(parseModelJson("{theme_cn:'丝路'}")).toEqual({ theme_cn: "丝路" });
  });
});
