"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ListControls } from "@/components/list-controls";
import type {
  ExportPreviewResponse,
  ExportProductSelection,
  ExportToGoogleSheetsResponse,
  ExportableProductItem,
  GoogleAuthStatusResponse,
  QuantityTemplateRecord,
  QuantityTemplateTier,
} from "@/lib/types/domain";
import { normalizeSearchQuery, paginateItems } from "@/utils/pagination";

type SelectionState = {
  quantityTemplateId: string;
  tiers: QuantityTemplateTier[];
};

function cloneTiers(tiers: QuantityTemplateTier[]) {
  return tiers.map((item) => ({ ...item }));
}

function sanitizeError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function ExportToSheetsClient() {
  const searchParams = useSearchParams();
  const [googleStatus, setGoogleStatus] = useState<GoogleAuthStatusResponse>({
    connected: false,
    googleEmail: null,
  });
  const [products, setProducts] = useState<ExportableProductItem[]>([]);
  const [templates, setTemplates] = useState<QuantityTemplateRecord[]>([]);
  const [selectedMap, setSelectedMap] = useState<Record<string, SelectionState>>({});
  const [preview, setPreview] = useState<ExportPreviewResponse | null>(null);
  const [exportResult, setExportResult] = useState<ExportToGoogleSheetsResponse | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  const defaultTemplate = useMemo(
    () => templates.find((item) => item.user_id && item.is_default) ?? templates.find((item) => item.is_seeded) ?? templates[0],
    [templates],
  );

  useEffect(() => {
    const googleFlag = searchParams.get("google");
    const googleError = searchParams.get("google_error");

    if (googleFlag === "connected") {
      setMessage("Google 账号已连接，现在可以导出到你的 Drive。");
    }

    if (googleError) {
      setBootstrapError(`Google 授权失败：${googleError}`);
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const [statusResponse, productsResponse, templatesResponse] = await Promise.all([
          fetch("/api/google/auth/status"),
          fetch("/api/export/products"),
          fetch("/api/quantity-templates"),
        ]);

        const statusData = (await statusResponse.json()) as GoogleAuthStatusResponse & { error?: string };
        const productsData = (await productsResponse.json()) as { items?: ExportableProductItem[]; error?: string };
        const templatesData = (await templatesResponse.json()) as { items?: QuantityTemplateRecord[]; error?: string };

        if (!statusResponse.ok) throw new Error(statusData.error ?? "获取 Google 授权状态失败。");
        if (!productsResponse.ok) throw new Error(productsData.error ?? "获取导出候选失败。");
        if (!templatesResponse.ok) throw new Error(templatesData.error ?? "获取数量模板失败。");

        if (!active) return;

        setGoogleStatus({
          connected: statusData.connected,
          googleEmail: statusData.googleEmail,
        });
        setProducts(productsData.items ?? []);
        setTemplates(templatesData.items ?? []);
        setBootstrapError(null);
      } catch (loadError) {
        if (!active) return;
        setBootstrapError(sanitizeError(loadError, "初始化导出页面失败。"));
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeSearchQuery(query);
    return products.filter((item) => {
      const selected = Boolean(selectedMap[item.marketingCopyVersionId]);
      if (filter === "selected" && !selected) return false;
      if (filter === "unselected" && selected) return false;
      if (!normalizedQuery) return true;
      return [
        item.titleEn,
        item.descriptionEn,
        item.templateName,
        item.marketingCopyVersionId,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [filter, products, query, selectedMap]);

  const pagedProducts = useMemo(
    () => paginateItems(filteredProducts, page, pageSize),
    [filteredProducts, page, pageSize],
  );

  useEffect(() => {
    setPage(pagedProducts.currentPage);
  }, [pagedProducts.currentPage]);

  const selectedProducts = useMemo(
    () => products.filter((item) => selectedMap[item.marketingCopyVersionId]),
    [products, selectedMap],
  );

  function toggleSelection(product: ExportableProductItem) {
    setPreview(null);
    setExportResult(null);
    setError(null);
    setSelectedMap((current) => {
      const next = { ...current };
      if (next[product.marketingCopyVersionId]) {
        delete next[product.marketingCopyVersionId];
        return next;
      }
      next[product.marketingCopyVersionId] = {
        quantityTemplateId: defaultTemplate?.id ?? "",
        tiers: cloneTiers(defaultTemplate?.tiers_json ?? []),
      };
      return next;
    });
  }

  function changeTemplate(productId: string, templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setPreview(null);
    setExportResult(null);
    setSelectedMap((current) => ({
      ...current,
      [productId]: {
        quantityTemplateId: templateId,
        tiers: cloneTiers(template.tiers_json),
      },
    }));
  }

  function updateTier(
    productId: string,
    index: number,
    field: keyof QuantityTemplateTier,
    value: string,
  ) {
    setPreview(null);
    setExportResult(null);
    setSelectedMap((current) => {
      const currentSelection = current[productId];
      if (!currentSelection) return current;
      const nextTiers = cloneTiers(currentSelection.tiers);
      if (field === "optionValue") {
        nextTiers[index].optionValue = value;
      } else {
        nextTiers[index][field] = Number(value) as never;
      }
      return {
        ...current,
        [productId]: {
          ...currentSelection,
          tiers: nextTiers,
        },
      };
    });
  }

  function buildSelections(): ExportProductSelection[] {
    return selectedProducts.map((item) => ({
      marketingCopyVersionId: item.marketingCopyVersionId,
      quantityTemplateId: selectedMap[item.marketingCopyVersionId].quantityTemplateId,
      variantOverrides: selectedMap[item.marketingCopyVersionId].tiers,
    }));
  }

  async function refreshGoogleStatus() {
    const response = await fetch("/api/google/auth/status");
    const data = (await response.json()) as GoogleAuthStatusResponse & { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "刷新 Google 授权状态失败。");
    }

    setGoogleStatus({
      connected: data.connected,
      googleEmail: data.googleEmail,
    });
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="hero">
          <h1>Export To Google Sheets</h1>
          <p>把 confirmed 的 Shopify 英文文案和 front/back 成品图导出成 Matrixify `Products` sheet。</p>
        </div>
        <div className="split-header">
          <div className="stack" style={{ gap: 6 }}>
            <strong>Google 授权状态</strong>
            <span className="helper">
              {googleStatus.connected
                ? `已连接：${googleStatus.googleEmail ?? "Google 账号"}`
                : "未连接 Google Drive，无法执行导出。"}
            </span>
          </div>
          <div className="button-row">
            <Link href="/settings/quantity-templates" className="ghost-button">
              管理数量模板
            </Link>
            {googleStatus.connected ? (
              <button
                type="button"
                className="ghost-button"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    setMessage(null);
                    const response = await fetch("/api/google/auth/disconnect", { method: "POST" });
                    const data = (await response.json()) as { error?: string };
                    if (!response.ok) {
                      setError(data.error ?? "断开 Google 授权失败。");
                      return;
                    }
                    setMessage("Google 授权已断开。");
                    setGoogleStatus({ connected: false, googleEmail: null });
                  })
                }
              >
                Disconnect Google
              </button>
            ) : (
              <a href="/api/google/auth/start" className="primary-button">
                Connect Google
              </a>
            )}
          </div>
        </div>
        {message ? <p className="helper">{message}</p> : null}
        {bootstrapError ? <p className="error-text">{bootstrapError}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <div className="grid-2">
        <section className="panel">
          <div className="split-header">
            <h2>可导出商品</h2>
            <span className="helper">仅显示 confirmed marketing copy</span>
          </div>
          <ListControls
            searchValue={query}
            onSearchChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            searchPlaceholder="按标题、描述、模板或版本 ID 搜索"
            filterValue={filter}
            filterOptions={[
              { value: "all", label: "全部" },
              { value: "selected", label: "已选择" },
              { value: "unselected", label: "未选择" },
            ]}
            onFilterChange={(value) => {
              setFilter(value);
              setPage(1);
            }}
            pageSize={pageSize}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
            currentPage={pagedProducts.currentPage}
            totalPages={pagedProducts.totalPages}
            totalItems={pagedProducts.totalItems}
            onPrevPage={() => setPage((current) => current - 1)}
            onNextPage={() => setPage((current) => current + 1)}
          />
          {pagedProducts.items.length === 0 ? <div className="empty-state">没有可导出的 confirmed 文案。</div> : null}
          <div className="stack">
            {pagedProducts.items.map((item) => {
              const checked = Boolean(selectedMap[item.marketingCopyVersionId]);
              return (
                <article key={item.marketingCopyVersionId} className="list-card">
                  <header>
                    <label className="toggle-row" style={{ gap: 12 }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleSelection(item)} />
                      <strong>{item.titleEn || "Untitled Product"}</strong>
                    </label>
                    <span className="helper">{item.templateName}</span>
                  </header>
                  <p className="helper">{item.descriptionEn.slice(0, 140) || "暂无英文描述。"}</p>
                  <div className="grid-2">
                    <img src={item.frontImageUrl} alt="Front preview" style={{ width: "100%", borderRadius: 16, border: "1px solid var(--line)" }} />
                    <img src={item.backImageUrl} alt="Back preview" style={{ width: "100%", borderRadius: 16, border: "1px solid var(--line)" }} />
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="split-header">
            <h2>导出配置</h2>
            <span className="helper">已选 {selectedProducts.length} 个商品</span>
          </div>
          {selectedProducts.length === 0 ? <div className="empty-state">先从左侧勾选需要导出的商品。</div> : null}
          <div className="stack">
            {selectedProducts.map((product) => {
              const selection = selectedMap[product.marketingCopyVersionId];
              return (
                <article key={product.marketingCopyVersionId} className="list-card">
                  <header>
                    <div>
                      <strong>{product.titleEn}</strong>
                      <div className="subtle">{product.marketingCopyVersionId}</div>
                    </div>
                  </header>
                  <div className="field">
                    <label>Quantity Template</label>
                    <select
                      value={selection.quantityTemplateId}
                      onChange={(event) => changeTemplate(product.marketingCopyVersionId, event.target.value)}
                    >
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                          {template.is_seeded ? "（系统）" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th align="left">Quantity</th>
                          <th align="left">Price</th>
                          <th align="left">Compare At</th>
                          <th align="left">Inventory</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selection.tiers.map((tier, index) => (
                          <tr key={`${product.marketingCopyVersionId}-${tier.optionValue}`}>
                            <td style={{ padding: "8px 0" }}>
                              <input
                                value={tier.optionValue}
                                onChange={(event) =>
                                  updateTier(product.marketingCopyVersionId, index, "optionValue", event.target.value)
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                value={tier.price}
                                onChange={(event) =>
                                  updateTier(product.marketingCopyVersionId, index, "price", event.target.value)
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                value={tier.compareAtPrice}
                                onChange={(event) =>
                                  updateTier(
                                    product.marketingCopyVersionId,
                                    index,
                                    "compareAtPrice",
                                    event.target.value,
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={tier.inventoryQty}
                                onChange={(event) =>
                                  updateTier(product.marketingCopyVersionId, index, "inventoryQty", event.target.value)
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="button-row">
            <button
              type="button"
              className="ghost-button"
              disabled={isPending || selectedProducts.length === 0}
              onClick={() =>
                startTransition(async () => {
                  try {
                    setError(null);
                    setExportResult(null);
                    const response = await fetch("/api/export/preview", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ selections: buildSelections() }),
                    });
                    const data = (await response.json()) as ExportPreviewResponse & { error?: string };
                    if (!response.ok) throw new Error(data.error ?? "生成导出预览失败。");
                    setPreview(data);
                  } catch (previewError) {
                    setError(sanitizeError(previewError, "生成导出预览失败。"));
                  }
                })
              }
            >
              生成 Preview
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={isPending || selectedProducts.length === 0 || !googleStatus.connected}
              onClick={() =>
                startTransition(async () => {
                  try {
                    setError(null);
                    const response = await fetch("/api/export/google-sheets", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ selections: buildSelections() }),
                    });
                    const data = (await response.json()) as { item?: ExportToGoogleSheetsResponse; error?: string };
                    if (!response.ok || !data.item) {
                      throw new Error(data.error ?? "导出到 Google Sheets 失败。");
                    }
                    setExportResult(data.item);
                    setMessage("Google Sheets 导出成功。");
                    await refreshGoogleStatus();
                  } catch (exportError) {
                    setError(sanitizeError(exportError, "导出到 Google Sheets 失败。"));
                  }
                })
              }
            >
              Confirm & Export
            </button>
          </div>
          {exportResult ? (
            <div className="empty-state" style={{ textAlign: "left" }}>
              <strong>{exportResult.batchName}</strong>
              <p className="helper">已导出 {exportResult.exportedProductCount} 个商品。</p>
              <a href={exportResult.sheetUrl} target="_blank" rel="noreferrer" className="primary-button">
                打开 Google Sheet
              </a>
            </div>
          ) : null}
        </section>
      </div>

      <section className="panel">
        <div className="split-header">
          <h2>Matrixify Preview</h2>
          <span className="helper">{preview ? `${preview.rows.length} rows` : "先生成预览"}</span>
        </div>
        {!preview ? (
          <div className="empty-state">点击 `生成 Preview` 后，这里会显示将写入 `Products` sheet 的 Matrixify 行。</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}>
              <thead>
                <tr>
                  <th align="left">Handle</th>
                  <th align="left">Title</th>
                  <th align="left">Quantity</th>
                  <th align="left">Price</th>
                  <th align="left">Compare At</th>
                  <th align="left">Inventory</th>
                  <th align="left">Image Src</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={`${row.handle}-${row.option1Value}`}>
                    <td style={{ padding: "8px 0" }}>{row.handle}</td>
                    <td>{row.title}</td>
                    <td>{row.option1Value}</td>
                    <td>{row.variantPrice}</td>
                    <td>{row.variantCompareAtPrice}</td>
                    <td>{row.variantInventoryQty}</td>
                    <td style={{ maxWidth: 360, overflowWrap: "anywhere" }}>{row.imageSrc || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
