import type { StructuredData } from "@/lib/types/domain";

export function renderTemplate(template: string, data: StructuredData) {
  return template.replace(/\{([a-z_]+)\}/g, (_, key: keyof StructuredData) => data[key] ?? "");
}
