import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getAuthorizedGoogleClients } from "@/lib/services/googleOAuth";
import {
  getQuantityTemplateById,
  normalizeQuantityTemplateTiers,
} from "@/lib/services/quantityTemplates";
import type {
  EditJobRecord,
  ExportBatchRecord,
  ExportHistoryDetail,
  ExportHistoryItem,
  ExportHistoryProductItem,
  ExportPreviewProduct,
  ExportPreviewRequest,
  ExportPreviewResponse,
  ExportPreviewRow,
  ExportProductRecord,
  ExportToGoogleSheetsResponse,
  ExportableProductItem,
  MarketingCopyResult,
  MarketingCopyTemplateRecord,
  MarketingCopyVersionRecord,
  QuantityTemplateRecord,
  QuantityTemplateTier,
} from "@/lib/types/domain";

const exportSelectionTierSchema = z.object({
  optionName: z.string().trim().min(1).optional(),
  optionValue: z.string().trim().min(1),
  variantSku: z.string().trim().min(1).optional(),
  price: z.coerce.number().nonnegative(),
  compareAtPrice: z.coerce.number().nonnegative(),
  inventoryQty: z.coerce.number().int().nonnegative(),
});

const exportSelectionSchema = z.object({
  marketingCopyVersionId: z.string().uuid(),
  quantityTemplateId: z.string().uuid(),
  variantOverrides: z.array(exportSelectionTierSchema).optional().default([]),
});

const exportPreviewSchema = z.object({
  selections: z.array(exportSelectionSchema).min(1),
});

const MATRIXIFY_HEADERS = [
  "Internal Product ID",
  "Handle",
  "Title",
  "Body HTML",
  "Vendor",
  "Type",
  "Tags",
  "Status",
  "Published",
  "Option1 Name",
  "Option1 Value",
  "Variant SKU",
  "Variant Price",
  "Variant Compare At Price",
  "Variant Inventory Tracker",
  "Variant Inventory Qty",
  "Image Src",
  "Image Alt Text",
] as const;

type ResolvedExportSelection = {
  version: MarketingCopyVersionRecord;
  template: MarketingCopyTemplateRecord | null;
  frontJob: EditJobRecord;
  backJob: EditJobRecord;
  quantityTemplate: QuantityTemplateRecord;
  tiers: QuantityTemplateTier[];
};

function getShanghaiDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function getDayRangeForShanghai(date = new Date()) {
  const dateString = getShanghaiDateString(date);
  const start = new Date(`${dateString}T00:00:00+08:00`);
  const end = new Date(`${dateString}T23:59:59.999+08:00`);
  return { dateString, start, end };
}

function slugifyTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 60);
}

function formatMoney(value: number) {
  return value.toFixed(2);
}

function getEffectiveMarketingCopy(version: MarketingCopyVersionRecord) {
  return (version.final_result_json ?? version.draft_result_json) as MarketingCopyResult;
}

function splitParagraphs(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function convertDescriptionToBodyHtml(description: string, frontImageUrl: string, backImageUrl: string) {
  const headings = new Set(["Overview", "Front Design", "Back Design", "Why This Coin Stands Out"]);
  const lines = splitParagraphs(description);

  if (lines.length === 0) {
    return "<p></p>";
  }

  let currentHeading: string | null = null;
  let currentParagraphs: string[] = [];
  const sections: Array<{ heading: string | null; paragraphs: string[] }> = [];

  for (const line of lines) {
    if (headings.has(line)) {
      if (currentHeading || currentParagraphs.length > 0) {
        sections.push({ heading: currentHeading, paragraphs: currentParagraphs });
      }
      currentHeading = line;
      currentParagraphs = [];
      continue;
    }
    currentParagraphs.push(line);
  }

  if (currentHeading || currentParagraphs.length > 0) {
    sections.push({ heading: currentHeading, paragraphs: currentParagraphs });
  }

  const html: string[] = [];

  for (const section of sections) {
    if (section.heading) {
      html.push(`<h3>${escapeHtml(section.heading)}</h3>`);
    }
    section.paragraphs.forEach((paragraph) => {
      html.push(`<p>${escapeHtml(paragraph)}</p>`);
    });
    if (section.heading === "Front Design") {
      html.push(`<p><img src="${frontImageUrl}" alt="Front design image" /></p>`);
    }
    if (section.heading === "Back Design") {
      html.push(`<p><img src="${backImageUrl}" alt="Back design image" /></p>`);
    }
  }

  if (html.length === 0) {
    return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  }

  return html.join("");
}

function mergeTiers(
  template: QuantityTemplateRecord,
  overrides: z.infer<typeof exportSelectionTierSchema>[],
) {
  if (!overrides.length) {
    return template.tiers_json;
  }

  return normalizeQuantityTemplateTiers(overrides);
}

async function getExportedHandles(supabase: SupabaseClient, userId: string) {
  const { data: batches, error: batchError } = await supabase
    .from("export_batches")
    .select("id")
    .eq("user_id", userId);

  if (batchError) {
    throw new Error(`读取导出批次失败：${batchError.message}`);
  }

  const batchIds = (batches ?? []).map((item) => item.id);
  if (batchIds.length === 0) {
    return new Set<string>();
  }

  const { data: products, error: productError } = await supabase
    .from("export_products")
    .select("handle")
    .in("batch_id", batchIds);

  if (productError) {
    throw new Error(`读取导出商品失败：${productError.message}`);
  }

  return new Set((products ?? []).map((item) => String(item.handle).toLowerCase()));
}

function ensureUniqueHandle(baseHandle: string, usedHandles: Set<string>) {
  let handle = baseHandle || `challenge-coin-${randomUUID().slice(0, 8)}`;

  while (usedHandles.has(handle.toLowerCase())) {
    handle = `${baseHandle || "challenge-coin"}-${randomUUID().slice(0, 6).toLowerCase()}`;
  }

  usedHandles.add(handle.toLowerCase());
  return handle;
}

async function getTemplatesById(
  supabase: SupabaseClient,
  ids: string[],
) {
  if (ids.length === 0) {
    return new Map<string, MarketingCopyTemplateRecord>();
  }

  const { data, error } = await supabase
    .from("marketing_copy_templates")
    .select("*")
    .in("id", ids);

  if (error) {
    throw new Error(`读取文案模板失败：${error.message}`);
  }

  return new Map(
    ((data ?? []) as MarketingCopyTemplateRecord[]).map((item) => [item.id, item]),
  );
}

async function getEditJobsById(supabase: SupabaseClient, ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, EditJobRecord>();
  }

  const { data, error } = await supabase.from("edit_jobs").select("*").in("id", ids);
  if (error) {
    throw new Error(`读取图片编辑结果失败：${error.message}`);
  }

  return new Map(((data ?? []) as EditJobRecord[]).map((item) => [item.id, item]));
}

async function getConfirmedMarketingVersions(
  supabase: SupabaseClient,
  userId: string,
  ids?: string[],
  limit = 100,
) {
  let query = supabase
    .from("marketing_copy_versions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_confirmed", true)
    .order("updated_at", { ascending: false });

  if (ids && ids.length > 0) {
    query = query.in("id", ids);
  } else {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`读取可导出文案失败：${error.message}`);
  }

  return (data ?? []) as MarketingCopyVersionRecord[];
}

async function getMarketingVersionsByIds(
  supabase: SupabaseClient,
  userId: string,
  ids: string[],
) {
  if (ids.length === 0) {
    return [] as MarketingCopyVersionRecord[];
  }

  const { data, error } = await supabase
    .from("marketing_copy_versions")
    .select("*")
    .eq("user_id", userId)
    .in("id", ids);

  if (error) {
    throw new Error(`读取文案版本失败：${error.message}`);
  }

  return (data ?? []) as MarketingCopyVersionRecord[];
}

function buildExportableProductItem(
  version: MarketingCopyVersionRecord,
  template: MarketingCopyTemplateRecord | null,
  frontJob: EditJobRecord | null,
  backJob: EditJobRecord | null,
) {
  if (!frontJob?.image_url || !backJob?.image_url) {
    return null;
  }

  const result = getEffectiveMarketingCopy(version);

  return {
    marketingCopyVersionId: version.id,
    sourceImageId: version.image_generation_result_id,
    imageGenerationResultId: version.image_generation_result_id,
    frontEditJobId: version.front_edit_job_id,
    backEditJobId: version.back_edit_job_id,
    templateName: template?.name ?? "未知模板",
    createdAt: version.created_at,
    titleEn: result.shopify.title.en.trim(),
    descriptionEn: result.shopify.description.en.trim(),
    frontImageUrl: frontJob.image_url,
    backImageUrl: backJob.image_url,
  } satisfies ExportableProductItem;
}

export async function listExportableProducts(
  supabase: SupabaseClient,
  userId: string,
  limit = 100,
) {
  const versions = await getConfirmedMarketingVersions(supabase, userId, undefined, limit);
  const templatesById = await getTemplatesById(
    supabase,
    [...new Set(versions.map((item) => item.marketing_copy_template_id))],
  );
  const jobsById = await getEditJobsById(
    supabase,
    [...new Set(versions.flatMap((item) => [item.front_edit_job_id, item.back_edit_job_id]))],
  );

  return versions
    .map((version) =>
      buildExportableProductItem(
        version,
        templatesById.get(version.marketing_copy_template_id) ?? null,
        jobsById.get(version.front_edit_job_id) ?? null,
        jobsById.get(version.back_edit_job_id) ?? null,
      ),
    )
    .filter((item): item is ExportableProductItem => Boolean(item));
}

async function resolveSelections(
  supabase: SupabaseClient,
  userId: string,
  input: ExportPreviewRequest,
) {
  const normalized = exportPreviewSchema.parse(input);
  const versions = await getConfirmedMarketingVersions(
    supabase,
    userId,
    normalized.selections.map((item) => item.marketingCopyVersionId),
  );
  const versionsById = new Map(versions.map((item) => [item.id, item]));
  const templatesById = await getTemplatesById(
    supabase,
    [...new Set(versions.map((item) => item.marketing_copy_template_id))],
  );
  const jobsById = await getEditJobsById(
    supabase,
    [...new Set(versions.flatMap((item) => [item.front_edit_job_id, item.back_edit_job_id]))],
  );

  const selections: ResolvedExportSelection[] = [];

  for (const selection of normalized.selections) {
    const version = versionsById.get(selection.marketingCopyVersionId);
    if (!version) {
      throw new Error("所选文案版本不存在或尚未 confirmed。");
    }

    const frontJob = jobsById.get(version.front_edit_job_id);
    const backJob = jobsById.get(version.back_edit_job_id);
    if (!frontJob?.image_url || !backJob?.image_url) {
      throw new Error("所选文案缺少 front/back 编辑成品图，无法导出。");
    }

    const quantityTemplate = await getQuantityTemplateById(supabase, userId, selection.quantityTemplateId);
    selections.push({
      version,
      template: templatesById.get(version.marketing_copy_template_id) ?? null,
      frontJob,
      backJob,
      quantityTemplate,
      tiers: mergeTiers(quantityTemplate, selection.variantOverrides ?? []),
    });
  }

  return selections;
}

async function buildBatchName(supabase: SupabaseClient, userId: string) {
  const { dateString, start, end } = getDayRangeForShanghai();
  const { count, error } = await supabase
    .from("export_batches")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  if (error) {
    throw new Error(`生成批次名称失败：${error.message}`);
  }

  const nextNumber = String((count ?? 0) + 1).padStart(3, "0");
  return `shopify-products-${dateString}-batch-${nextNumber}`;
}

function buildPreviewFromSelections(
  selections: ResolvedExportSelection[],
  batchName: string,
  usedHandles: Set<string>,
) {
  const products: ExportPreviewProduct[] = [];
  const rows: ExportPreviewRow[] = [];

  for (const selection of selections) {
    const result = getEffectiveMarketingCopy(selection.version);
    const titleEn = result.shopify.title.en.trim() || "Challenge Coin";
    const handle = ensureUniqueHandle(slugifyTitle(titleEn), usedHandles);
    const bodyHtml = convertDescriptionToBodyHtml(
      result.shopify.description.en,
      selection.frontJob.image_url!,
      selection.backJob.image_url!,
    );
    const exportProductId = randomUUID();

    products.push({
      marketingCopyVersionId: selection.version.id,
      quantityTemplateId: selection.quantityTemplate.id,
      titleEn,
      handle,
      frontImageUrl: selection.frontJob.image_url!,
      backImageUrl: selection.backJob.image_url!,
      bodyHtml,
      tiers: selection.tiers,
    });

    selection.tiers.forEach((tier, index) => {
      rows.push({
        internalProductId: exportProductId,
        handle,
        title: titleEn,
        bodyHtml,
        vendor: "Iconfylab",
        type: "",
        tags: "",
        status: "active",
        published: "TRUE",
        option1Name: tier.optionName,
        option1Value: tier.optionValue,
        variantSku: tier.variantSku,
        variantPrice: formatMoney(tier.price),
        variantCompareAtPrice: formatMoney(tier.compareAtPrice),
        variantInventoryTracker: "shopify",
        variantInventoryQty: String(tier.inventoryQty),
        imageSrc: index === 0 ? `${selection.frontJob.image_url};${selection.backJob.image_url}` : "",
        imageAltText: titleEn,
      });
    });
  }

  return { batchName, products, rows };
}

export async function buildExportPreview(
  supabase: SupabaseClient,
  userId: string,
  input: ExportPreviewRequest,
): Promise<ExportPreviewResponse> {
  const [selections, exportedHandles, batchName] = await Promise.all([
    resolveSelections(supabase, userId, input),
    getExportedHandles(supabase, userId),
    buildBatchName(supabase, userId),
  ]);

  return buildPreviewFromSelections(selections, batchName, exportedHandles);
}

function previewRowToSheetValues(row: ExportPreviewRow) {
  return [
    row.internalProductId,
    row.handle,
    row.title,
    row.bodyHtml,
    row.vendor,
    row.type,
    row.tags,
    row.status,
    row.published,
    row.option1Name,
    row.option1Value,
    row.variantSku,
    row.variantPrice,
    row.variantCompareAtPrice,
    row.variantInventoryTracker,
    row.variantInventoryQty,
    row.imageSrc,
    row.imageAltText,
  ];
}

export async function exportProductsToGoogleSheets(
  supabase: SupabaseClient,
  userId: string,
  input: ExportPreviewRequest,
): Promise<ExportToGoogleSheetsResponse> {
  const preview = await buildExportPreview(supabase, userId, input);
  const { sheets, drive } = await getAuthorizedGoogleClients(supabase, userId);

  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: preview.batchName },
      sheets: [{ properties: { title: "Products" } }],
    },
  });

  const sheetId = spreadsheet.data.spreadsheetId;
  if (!sheetId) {
    throw new Error("Google Sheets 创建失败，未返回 sheet_id。");
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: "Products!A1",
    valueInputOption: "RAW",
    requestBody: {
      values: [Array.from(MATRIXIFY_HEADERS), ...preview.rows.map(previewRowToSheetValues)],
    },
  });

  await drive.permissions.create({
    fileId: sheetId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit?usp=sharing`;
  const { data: batch, error: batchError } = await supabase
    .from("export_batches")
    .insert({
      user_id: userId,
      sheet_id: sheetId,
      sheet_url: sheetUrl,
      batch_name: preview.batchName,
      product_count: preview.products.length,
    })
    .select("*")
    .single();

  if (batchError || !batch) {
    throw new Error(batchError?.message ?? "保存导出批次失败。");
  }

  const selectionMap = new Map(
    exportPreviewSchema.parse(input).selections.map((item) => [item.marketingCopyVersionId, item]),
  );
  const resolvedSelections = await resolveSelections(supabase, userId, input);
  const resolvedByVersionId = new Map(resolvedSelections.map((item) => [item.version.id, item]));

  const exportProducts = preview.products.map((product) => {
    const selection = selectionMap.get(product.marketingCopyVersionId);
    const resolved = resolvedByVersionId.get(product.marketingCopyVersionId);
    const matchingRow = preview.rows.find((row) => row.handle === product.handle);

    if (!selection || !resolved || !matchingRow) {
      throw new Error("导出产品数据不完整。");
    }

    return {
      batch_id: batch.id,
      export_product_id: matchingRow.internalProductId,
      handle: product.handle,
      image_generation_result_id: resolved.version.image_generation_result_id,
      front_edit_job_id: resolved.version.front_edit_job_id,
      back_edit_job_id: resolved.version.back_edit_job_id,
      marketing_copy_version_id: resolved.version.id,
      quantity_template_id: resolved.quantityTemplate.id,
      variant_overrides_json: selection.variantOverrides?.length ? selection.variantOverrides : null,
    };
  });

  const { error: productError } = await supabase.from("export_products").insert(exportProducts);
  if (productError) {
    throw new Error(`保存导出商品失败：${productError.message}`);
  }

  return {
    batchId: batch.id,
    batchName: preview.batchName,
    sheetId,
    sheetUrl,
    exportedProductCount: preview.products.length,
  };
}

export async function listExportHistory(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("export_batches")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`获取导出历史失败：${error.message}`);
  }

  return ((data ?? []) as ExportBatchRecord[]).map((item) => ({
    batchId: item.id,
    batchName: item.batch_name,
    sheetUrl: item.sheet_url,
    productCount: item.product_count,
    createdAt: item.created_at,
  } satisfies ExportHistoryItem));
}

export async function getExportHistoryDetail(
  supabase: SupabaseClient,
  userId: string,
  batchId: string,
): Promise<ExportHistoryDetail> {
  const { data: batch, error: batchError } = await supabase
    .from("export_batches")
    .select("*")
    .eq("id", batchId)
    .eq("user_id", userId)
    .single();

  if (batchError || !batch) {
    throw new Error("导出批次不存在。");
  }

  const { data: products, error: productError } = await supabase
    .from("export_products")
    .select("*")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });

  if (productError) {
    throw new Error(`读取导出商品失败：${productError.message}`);
  }

  const productItems = (products ?? []) as ExportProductRecord[];
  const versions = await getMarketingVersionsByIds(
    supabase,
    userId,
    [...new Set(productItems.map((item) => item.marketing_copy_version_id))],
  );
  const versionsById = new Map(versions.map((item) => [item.id, item]));
  const jobsById = await getEditJobsById(
    supabase,
    [...new Set(productItems.flatMap((item) => [item.front_edit_job_id, item.back_edit_job_id]))],
  );
  const templateIds = [...new Set(productItems.map((item) => item.quantity_template_id))];
  const { data: templateRows, error: templateError } = await supabase
    .from("quantity_templates")
    .select("*")
    .in("id", templateIds);

  if (templateError) {
    throw new Error(`读取数量模板失败：${templateError.message}`);
  }

  const templatesById = new Map(
    ((templateRows ?? []) as QuantityTemplateRecord[]).map((item) => [item.id, item]),
  );

  const historyProducts = productItems.map((item) => {
    const version = versionsById.get(item.marketing_copy_version_id);
    const result = version ? getEffectiveMarketingCopy(version) : null;
    const quantityTemplate = templatesById.get(item.quantity_template_id);

    return {
      exportProductId: item.export_product_id,
      handle: item.handle,
      marketingCopyVersionId: item.marketing_copy_version_id,
      quantityTemplateName: quantityTemplate?.name ?? "未知模板",
      titleEn: result?.shopify.title.en ?? "Unknown Product",
      frontImageUrl: jobsById.get(item.front_edit_job_id)?.image_url ?? null,
      backImageUrl: jobsById.get(item.back_edit_job_id)?.image_url ?? null,
      variantOverrides: item.variant_overrides_json ?? null,
    } satisfies ExportHistoryProductItem;
  });

  return {
    batch: batch as ExportBatchRecord,
    products: historyProducts,
  };
}
