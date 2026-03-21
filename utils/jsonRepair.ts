import { jsonrepair } from "jsonrepair";

export function parseModelJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(jsonrepair(raw));
  }
}
