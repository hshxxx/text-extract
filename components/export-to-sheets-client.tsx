"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ListControls } from "@/components/list-controls";
import { WorkspaceIntro } from "@/components/workspace-intro";
import { cloneQuantityTemplateTiers } from "@/lib/quantity-template-presets";
import type {
  ExportBootstrapResponse,
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

type PersistedGoogleStatus = GoogleAuthStatusResponse & {
  updatedAt: string;
};

let cachedExportBootstrap: ExportBootstrapResponse | null = null;
let cachedGoogleStatus: GoogleAuthStatusResponse | null = null;
const GOOGLE_STATUS_STORAGE_KEY = "export_google_status_cache";

function sanitizeError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function readPersistedGoogleStatus() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(GOOGLE_STATUS_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedGoogleStatus>;
    if (typeof parsed.connected !== "boolean") {
      return null;
    }

    return {
      connected: parsed.connected,
      googleEmail: typeof parsed.googleEmail === "string" ? parsed.googleEmail : null,
    } satisfies GoogleAuthStatusResponse;
  } catch {
    return null;
  }
}

function persistGoogleStatus(status: GoogleAuthStatusResponse) {
  cachedGoogleStatus = status;

  if (typeof window === "undefined") {
    return;
  }

  const payload: PersistedGoogleStatus = {
    ...status,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(GOOGLE_STATUS_STORAGE_KEY, JSON.stringify(payload));
}

function clearPersistedGoogleStatus() {
  cachedGoogleStatus = null;

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(GOOGLE_STATUS_STORAGE_KEY);
  }
}

export function ExportToSheetsClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGoogleStatus = cachedGoogleStatus ?? readPersistedGoogleStatus();
  const [googleStatus, setGoogleStatus] = useState<GoogleAuthStatusResponse>(
    () =>
      initialGoogleStatus ?? {
        connected: false,
        googleEmail: null,
      },
  );
  const [products, setProducts] = useState<ExportableProductItem[]>(() => cachedExportBootstrap?.products ?? []);
  const [templates, setTemplates] = useState<QuantityTemplateRecord[]>(() => cachedExportBootstrap?.templates ?? []);
  const [selectedMap, setSelectedMap] = useState<Record<string, SelectionState>>({});
  const [preview, setPreview] = useState<ExportPreviewResponse | null>(null);
  const [exportResult, setExportResult] = useState<ExportToGoogleSheetsResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(() => !cachedExportBootstrap);
  const [isStatusLoading, setIsStatusLoading] = useState(() => !initialGoogleStatus);
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
    const googleEmail = searchParams.get("google_email");
    const googleError = searchParams.get("google_error");

    if (googleFlag === "connected") {
      const nextStatus = {
        connected: true,
        googleEmail: googleEmail ?? cachedGoogleStatus?.googleEmail ?? null,
      } satisfies GoogleAuthStatusResponse;

      persistGoogleStatus(nextStatus);
      setGoogleStatus(nextStatus);
      setStatusError(null);
      setIsStatusLoading(false);
      setMessage("Google 账号已连接，现在可以导出到你的 Drive。");
      void refreshGoogleStatus().catch((refreshError) =>
        setStatusError(sanitizeError(refreshError, "刷新 Google 授权状态失败。")),
      );
    }

    if (googleError) {
      setStatusError(`Google 授权失败：${googleError}`);
    }

    if (googleFlag || googleError) {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("google");
      nextParams.delete("google_email");
      nextParams.delete("google_error");
      const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
      router.replace(nextUrl, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const persistedStatus = readPersistedGoogleStatus();
    if (!persistedStatus) {
      return;
    }

    cachedGoogleStatus = persistedStatus;
    setGoogleStatus(persistedStatus);
    setIsStatusLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const response = await fetch("/api/export/bootstrap");
        const data = (await response.json()) as ExportBootstrapResponse & { error?: string };

        if (!response.ok) throw new Error(data.error ?? "初始化导出页面失败。");

        if (!active) return;

        setProducts(data.products ?? []);
        setTemplates(data.templates ?? []);
        cachedExportBootstrap = {
          products: data.products ?? [],
          templates: data.templates ?? [],
        };
        setBootstrapError(null);
      } catch (loadError) {
        if (!active) return;
        setBootstrapError(sanitizeError(loadError, "初始化导出页面失败。"));
      } finally {
        if (active) {
          setIsBootstrapping(false);
        }
      }
    }

    if (cachedExportBootstrap) {
      setProducts(cachedExportBootstrap.products);
      setTemplates(cachedExportBootstrap.templates);
      setIsBootstrapping(false);
      void bootstrap();
    } else {
      void bootstrap();
    }

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      try {
        const response = await fetch("/api/export/google-status");
        const data = (await response.json()) as GoogleAuthStatusResponse & { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "获取 Google 授权状态失败。");
        }

        if (!active) {
          return;
        }

        const nextStatus = {
          connected: data.connected,
          googleEmail: data.googleEmail,
        };
        persistGoogleStatus(nextStatus);
        setGoogleStatus(nextStatus);
        setStatusError(null);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setStatusError(sanitizeError(loadError, "获取 Google 授权状态失败。"));
      } finally {
        if (active) {
          setIsStatusLoading(false);
        }
      }
    }

    if (initialGoogleStatus) {
      setGoogleStatus(initialGoogleStatus);
      setIsStatusLoading(false);
      void loadStatus();
    } else {
      void loadStatus();
    }

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
        tiers: cloneQuantityTemplateTiers(defaultTemplate?.tiers_json ?? []),
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
        tiers: cloneQuantityTemplateTiers(template.tiers_json),
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
      const nextTiers = cloneQuantityTemplateTiers(currentSelection.tiers);
      if (field === "optionName" || field === "optionValue" || field === "variantSku") {
        nextTiers[index][field] = value as never;
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
    const response = await fetch("/api/export/google-status");
    const data = (await response.json()) as GoogleAuthStatusResponse & { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "刷新 Google 授权状态失败。");
    }

    const nextStatus = {
      connected: data.connected,
      googleEmail: data.googleEmail,
    };

    persistGoogleStatus(nextStatus);
    setGoogleStatus(nextStatus);
  }

  return (
    <div className="workspace-shell">
      <WorkspaceIntro
        title="导出 Sheets"
        description="选择 confirmed 文案版本、套用数量模板，并将 Matrixify 数据导出到 Google Sheets。"
        actions={<span className={`status-pill ${googleStatus.connected ? "success" : "danger"}`}>{googleStatus.connected ? "Google Connected" : "Google Required"}</span>}
      />
      <div className="stack">
        <section className="panel">
        <div className="split-header">
          <div className="stack" style={{ gap: 6 }}>
            <strong>Google 授权状态</strong>
            <span className="helper">
              {isStatusLoading
                ? "正在刷新 Google 授权状态..."
                : googleStatus.connected
                ? `已连接：${googleStatus.googleEmail ?? "Google 账号"}`
                : "未连接 Google Drive，无法执行导出。"}
            </span>
          </div>
        <div className="button-row primary-group">
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
                    clearPersistedGoogleStatus();
                    setMessage("Google 授权已断开。");
                    setIsStatusLoading(false);
                    setGoogleStatus({ connected: false, googleEmail: null });
                  })
                }
              >
                断开 Google
              </button>
            ) : (
              <a href="/api/google/auth/start" className="primary-button">
                连接 Google
              </a>
            )}
          </div>
        </div>
        {message ? <p className="helper">{message}</p> : null}
        {statusError ? <p className="error-text">{statusError}</p> : null}
        {bootstrapError ? <p className="error-text">{bootstrapError}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        </section>

        {isBootstrapping ? (
          <section className="panel">
            <div className="stack">
              <div className="skeleton-line skeleton-heading" />
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </div>
          </section>
        ) : null}

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
                          <th align="left">Option1 Name</th>
                          <th align="left">Option1 Value</th>
                          <th align="left">Variant SKU</th>
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
                                value={tier.optionName}
                                onChange={(event) =>
                                  updateTier(product.marketingCopyVersionId, index, "optionName", event.target.value)
                                }
                              />
                            </td>
                            <td>
                              <input
                                value={tier.optionValue}
                                onChange={(event) =>
                                  updateTier(product.marketingCopyVersionId, index, "optionValue", event.target.value)
                                }
                              />
                            </td>
                            <td>
                              <input
                                value={tier.variantSku}
                                onChange={(event) =>
                                  updateTier(product.marketingCopyVersionId, index, "variantSku", event.target.value)
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

          <div className="button-row primary-group">
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
              生成预览
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
              确认并导出
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
            <div className="empty-state">点击 `生成预览` 后，这里会显示将写入 `Products` sheet 的 Matrixify 行。</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}>
                <thead>
                  <tr>
                    <th align="left">Handle</th>
                    <th align="left">Title</th>
                    <th align="left">Option1 Name</th>
                    <th align="left">Option1 Value</th>
                    <th align="left">Variant SKU</th>
                    <th align="left">Price</th>
                    <th align="left">Compare At</th>
                    <th align="left">Inventory</th>
                    <th align="left">Image Src</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={`${row.handle}-${row.option1Value}-${row.variantSku}`}>
                      <td style={{ padding: "8px 0" }}>{row.handle}</td>
                      <td>{row.title}</td>
                      <td>{row.option1Name}</td>
                      <td>{row.option1Value}</td>
                      <td>{row.variantSku}</td>
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
    </div>
  );
}
