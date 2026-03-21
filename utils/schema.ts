import { z } from "zod";
import { EMPTY_STRUCTURED_DATA } from "@/utils/constants";
import { FIXED_SCHEMA_FIELDS, type StructuredData } from "@/lib/types/domain";

const schemaShape = FIXED_SCHEMA_FIELDS.reduce(
  (acc, field) => {
    acc[field] = z.string().optional().default("");
    return acc;
  },
  {} as Record<(typeof FIXED_SCHEMA_FIELDS)[number], z.ZodDefault<z.ZodOptional<z.ZodString>>>,
);

export const structuredDataSchema = z.object(schemaShape);

export function normalizeStructuredData(value: unknown): StructuredData {
  const parsed = structuredDataSchema.parse(value);

  return FIXED_SCHEMA_FIELDS.reduce((acc, field) => {
    const candidate = parsed[field];
    acc[field] = typeof candidate === "string" ? candidate : "";
    return acc;
  }, { ...EMPTY_STRUCTURED_DATA });
}
