import { FIXED_SCHEMA_FIELDS } from "@/lib/types/domain";

const PLACEHOLDER_PATTERN = /\{([a-z_]+)\}/g;

export function extractTemplatePlaceholders(template: string) {
  return [...template.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]);
}

export function validateTemplatePlaceholders(template: string) {
  const placeholders = extractTemplatePlaceholders(template);
  const invalid = placeholders.filter(
    (placeholder) => !FIXED_SCHEMA_FIELDS.includes(placeholder as (typeof FIXED_SCHEMA_FIELDS)[number]),
  );

  return {
    placeholders,
    invalid,
    valid: invalid.length === 0,
  };
}
