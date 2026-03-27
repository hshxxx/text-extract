"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ListControls } from "@/components/list-controls";
import type {
  GenerateMarketingCopyRequest,
  MarketingCopyBootstrapResponse,
  MarketingCopyResult,
  MarketingCopySourceDetail,
  MarketingCopySourceItem,
  MarketingCopyTemplateRecord,
  MarketingCopyVersionDetail,
  MarketingCopyVersionListItem,
} from "@/lib/types/domain";
import { normalizeSearchQuery, paginateItems } from "@/utils/pagination";

type MarketingCopyClientProps = {
  initialSources: MarketingCopySourceItem[];
  initialTemplates: MarketingCopyTemplateRecord[];
  initialSourceId: string | null;
};

const marketingBootstrapCache = new Map<string, MarketingCopyBootstrapResponse>();

function getBootstrapCacheKey(sourceId: string | null) {
  return sourceId ?? "__default__";
}

function getVersionKey(
  sourceId: string | null,
  frontEditJobId: string | null,
  backEditJobId: string | null,
) {
  if (!sourceId || !frontEditJobId || !backEditJobId) {
    return null;
  }

  return `${sourceId}:${frontEditJobId}:${backEditJobId}`;
}

function cloneResult(result: MarketingCopyResult) {
  return JSON.parse(JSON.stringify(result)) as MarketingCopyResult;
}

function getEditableResult(version: MarketingCopyVersionDetail | null) {
  if (!version) {
    return null;
  }
  return cloneResult(version.version.final_result_json ?? version.version.draft_result_json);
}

function renderPreviewText(result: MarketingCopyResult | null) {
  if (!result) {
    return "尚未生成文案。";
  }

  return result.shopify.title.cn || result.shopify.title.en || "未命名文案版本";
}

export function MarketingCopyClient({
  initialSources,
  initialTemplates,
  initialSourceId,
}: MarketingCopyClientProps) {
  const bootstrapCacheKey = getBootstrapCacheKey(initialSourceId);
  const cachedBootstrap = marketingBootstrapCache.get(bootstrapCacheKey);
  const [sources, setSources] = useState(cachedBootstrap?.sources ?? initialSources);
  const [templates, setTemplates] = useState(cachedBootstrap?.templates ?? initialTemplates);
  const [selectedSourceId, setSelectedSourceId] = useState(() => {
    if (cachedBootstrap?.selectedSourceId) {
      return cachedBootstrap.selectedSourceId;
    }

    return initialSourceId && initialSources.some((item) => item.sourceImageId === initialSourceId)
      ? initialSourceId
      : (initialSources[0]?.sourceImageId ?? "");
  });
  const [sourceDetail, setSourceDetail] = useState<MarketingCopySourceDetail | null>(
    cachedBootstrap?.sourceDetail ?? null,
  );
  const [selectedFrontEditJobId, setSelectedFrontEditJobId] = useState(
    cachedBootstrap?.sourceDetail?.defaultFrontEditJobId ?? "",
  );
  const [selectedBackEditJobId, setSelectedBackEditJobId] = useState(
    cachedBootstrap?.sourceDetail?.defaultBackEditJobId ?? "",
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    cachedBootstrap?.templates[0]?.id ?? initialTemplates[0]?.id ?? "",
  );
  const [userInstruction, setUserInstruction] = useState("");
  const [versions, setVersions] = useState<MarketingCopyVersionListItem[]>(cachedBootstrap?.versions ?? []);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [activeVersion, setActiveVersion] = useState<MarketingCopyVersionDetail | null>(null);
  const [editableResult, setEditableResult] = useState<MarketingCopyResult | null>(null);
  const [sourceQuery, setSourceQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sourcePageSize, setSourcePageSize] = useState(10);
  const [sourcePage, setSourcePage] = useState(1);
  const [versionQuery, setVersionQuery] = useState("");
  const [versionFilter, setVersionFilter] = useState("all");
  const [versionPageSize, setVersionPageSize] = useState(10);
  const [versionPage, setVersionPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(() => !cachedBootstrap);
  const [hydratedSourceId, setHydratedSourceId] = useState<string | null>(
    cachedBootstrap?.sourceDetail?.sourceImageId ?? null,
  );
  const [hydratedVersionKey, setHydratedVersionKey] = useState<string | null>(() =>
    getVersionKey(
      cachedBootstrap?.selectedSourceId ?? null,
      cachedBootstrap?.sourceDetail?.defaultFrontEditJobId ?? null,
      cachedBootstrap?.sourceDetail?.defaultBackEditJobId ?? null,
    ),
  );
  const [isPending, startTransition] = useTransition();

  function applyBootstrapPayload(data: MarketingCopyBootstrapResponse) {
    const nextSources = data.sources ?? [];
    const nextTemplates = data.templates ?? [];
    const nextSelectedSourceId = data.selectedSourceId ?? "";
    const nextSourceDetail = data.sourceDetail ?? null;
    const nextVersions = data.versions ?? [];

    setSources(nextSources);
    setTemplates(nextTemplates);
    setBootstrapError(null);
    setSelectedSourceId(nextSelectedSourceId);
    setSourceDetail(nextSourceDetail);
    setVersions(nextVersions);
    setSourcePage(1);
    setVersionPage(1);
    setActiveVersionId(null);
    setActiveVersion(null);
    setEditableResult(null);
    setSelectedFrontEditJobId(nextSourceDetail?.defaultFrontEditJobId ?? "");
    setSelectedBackEditJobId(nextSourceDetail?.defaultBackEditJobId ?? "");
    setHydratedSourceId(nextSourceDetail?.sourceImageId ?? null);
    setHydratedVersionKey(
      getVersionKey(
        nextSelectedSourceId || null,
        nextSourceDetail?.defaultFrontEditJobId ?? null,
        nextSourceDetail?.defaultBackEditJobId ?? null,
      ),
    );

    setSelectedTemplateId((current) =>
      nextTemplates.some((item) => item.id === current) ? current : (nextTemplates[0]?.id ?? ""),
    );
  }

  const filteredSources = useMemo(() => {
    const query = normalizeSearchQuery(sourceQuery);
    return sources.filter((item) => {
      if (sourceFilter === "with_history" && !item.hasHistory) return false;
      if (sourceFilter === "without_history" && item.hasHistory) return false;
      if (!query) return true;
      return [
        item.promptPreview,
        item.sourceImageId,
        item.createdAt,
        item.hasHistory ? "history" : "new",
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [sourceFilter, sourceQuery, sources]);

  const pagedSources = useMemo(
    () => paginateItems(filteredSources, sourcePage, sourcePageSize),
    [filteredSources, sourcePage, sourcePageSize],
  );

  const filteredVersions = useMemo(() => {
    const query = normalizeSearchQuery(versionQuery);
    return versions.filter((item) => {
      if (versionFilter === "confirmed" && !item.isConfirmed) return false;
      if (versionFilter === "draft" && item.isConfirmed) return false;
      if (!query) return true;
      return [
        item.templateName,
        item.createdAt,
        item.id,
        renderPreviewText(item.finalResult ?? item.draftResult),
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [versionFilter, versionQuery, versions]);

  const pagedVersions = useMemo(
    () => paginateItems(filteredVersions, versionPage, versionPageSize),
    [filteredVersions, versionPage, versionPageSize],
  );

  useEffect(() => {
    setSourcePage(pagedSources.currentPage);
  }, [pagedSources.currentPage]);

  useEffect(() => {
    setVersionPage(pagedVersions.currentPage);
  }, [pagedVersions.currentPage]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const searchParams = new URLSearchParams();
        if (initialSourceId) {
          searchParams.set("source", initialSourceId);
        }
        const query = searchParams.toString();
        const response = await fetch(`/api/marketing-copy/bootstrap${query ? `?${query}` : ""}`);
        const data = (await response.json()) as MarketingCopyBootstrapResponse & { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "初始化营销文案页面失败。");
        }

        if (!active) return;

        marketingBootstrapCache.set(bootstrapCacheKey, data);
        applyBootstrapPayload(data);
      } catch (loadError) {
        if (!active) return;
        setBootstrapError(loadError instanceof Error ? loadError.message : "初始化营销文案页面失败。");
      } finally {
        if (active) {
          setIsBootstrapping(false);
        }
      }
    }

    const cachedData = marketingBootstrapCache.get(bootstrapCacheKey);

    if (cachedData) {
      applyBootstrapPayload(cachedData);
      setIsBootstrapping(false);
      void bootstrap();
    } else {
      void bootstrap();
    }

    return () => {
      active = false;
    };
  }, [bootstrapCacheKey, initialSourceId]);

  useEffect(() => {
    if (!filteredSources.some((item) => item.sourceImageId === selectedSourceId)) {
      setSelectedSourceId(filteredSources[0]?.sourceImageId ?? "");
    }
  }, [filteredSources, selectedSourceId]);

  useEffect(() => {
    if (!selectedSourceId) {
      setSourceDetail(null);
      setVersions([]);
      setActiveVersion(null);
      setActiveVersionId(null);
      setEditableResult(null);
      setHydratedSourceId(null);
      setHydratedVersionKey(null);
      return;
    }

    if (hydratedSourceId === selectedSourceId) {
      return;
    }

    let active = true;

    async function loadSource() {
      try {
        setError(null);
        setDetailError(null);
        setActiveVersionId(null);
        setActiveVersion(null);
        setEditableResult(null);
        setHydratedVersionKey(null);
        const response = await fetch(`/api/marketing-copy/source/${selectedSourceId}`);
        const data = (await response.json()) as { item?: MarketingCopySourceDetail; error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "获取素材详情失败。");
        }

        if (!active) return;

        const item = data.item ?? null;
        setSourceDetail(item);
        setSelectedFrontEditJobId(item?.defaultFrontEditJobId ?? "");
        setSelectedBackEditJobId(item?.defaultBackEditJobId ?? "");
        setVersions([]);
        setHydratedSourceId(selectedSourceId);
      } catch (loadError) {
        if (!active) return;
        setSourceDetail(null);
        setDetailError(loadError instanceof Error ? loadError.message : "获取素材详情失败。");
      }
    }

    void loadSource();

    return () => {
      active = false;
    };
  }, [hydratedSourceId, selectedSourceId]);

  useEffect(() => {
    if (!selectedSourceId || !selectedFrontEditJobId || !selectedBackEditJobId) {
      setVersions([]);
      setVersionPage(1);
      setHydratedVersionKey(null);
      return;
    }

    const versionKey = getVersionKey(selectedSourceId, selectedFrontEditJobId, selectedBackEditJobId);

    if (hydratedVersionKey === versionKey) {
      return;
    }

    let active = true;

    async function loadVersions() {
      try {
        const searchParams = new URLSearchParams({
          sourceImageId: selectedSourceId,
          frontEditJobId: selectedFrontEditJobId,
          backEditJobId: selectedBackEditJobId,
        });
        const response = await fetch(`/api/marketing-copy/versions?${searchParams.toString()}`);
        const data = (await response.json()) as { items?: MarketingCopyVersionListItem[]; error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "获取文案版本失败。");
        }

        if (!active) return;
        setVersions(data.items ?? []);
        setVersionPage(1);
        setHydratedVersionKey(versionKey);
      } catch (loadError) {
        if (!active) return;
        setVersions([]);
        setError(loadError instanceof Error ? loadError.message : "获取文案版本失败。");
      }
    }

    void loadVersions();

    return () => {
      active = false;
    };
  }, [hydratedVersionKey, selectedBackEditJobId, selectedFrontEditJobId, selectedSourceId]);

  async function loadVersionDetail(id: string) {
    const response = await fetch(`/api/marketing-copy/${id}`);
    const data = (await response.json()) as { item?: MarketingCopyVersionDetail; error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "获取文案详情失败。");
    }

    const item = data.item ?? null;
    setActiveVersionId(id);
    setActiveVersion(item);
    setEditableResult(getEditableResult(item));
    setError(null);
  }

  function updateLocalizedField(
    section: "shopify" | "facebook",
    field: string,
    language: "en" | "cn",
    value: string,
  ) {
    setEditableResult((current) => {
      if (!current) return current;
      const next = cloneResult(current);
      if (section === "shopify" && field === "selling_points") {
        return next;
      }
      const target = next[section][field as keyof (typeof next)[typeof section]] as {
        en: string;
        cn: string;
      };
      target[language] = value;
      return next;
    });
  }

  function updateSellingPoint(index: number, language: "en" | "cn", value: string) {
    setEditableResult((current) => {
      if (!current) return current;
      const next = cloneResult(current);
      next.shopify.selling_points[index][language] = value;
      return next;
    });
  }

  async function refreshVersionsForCurrentCombo() {
    if (!selectedSourceId || !selectedFrontEditJobId || !selectedBackEditJobId) {
      return;
    }
    const searchParams = new URLSearchParams({
      sourceImageId: selectedSourceId,
      frontEditJobId: selectedFrontEditJobId,
      backEditJobId: selectedBackEditJobId,
    });
    const response = await fetch(`/api/marketing-copy/versions?${searchParams.toString()}`);
    const data = (await response.json()) as { items?: MarketingCopyVersionListItem[]; error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "获取文案版本失败。");
    }

    setVersions(data.items ?? []);
  }

  const selectedFrontOption = sourceDetail?.frontOptions.find((item) => item.id === selectedFrontEditJobId) ?? null;
  const selectedBackOption = sourceDetail?.backOptions.find((item) => item.id === selectedBackEditJobId) ?? null;

  return (
    <div className="grid-2">
      <section className="panel">
        <div className="hero">
          <h1>Shopify 与 Facebook 文案生成</h1>
          <p>基于主题原文、双面商品图与预置模板，生成双语 Shopify 商品文案和 Facebook 广告文案。</p>
        </div>
        {bootstrapError ? <p className="error-text">{bootstrapError}</p> : null}
        {isBootstrapping ? (
          <div className="stack" style={{ marginBottom: 16 }}>
            <div className="skeleton-line skeleton-heading" />
            <div className="skeleton-card" />
          </div>
        ) : null}
        {sources.length === 0 ? (
          <div className="empty-state">
            <p>还没有满足条件的素材。先完成图片编辑，并确保至少有一张 Front 和一张 Back 成品图。</p>
            <Link href="/edit-image" className="primary-button">
              前往图片编辑
            </Link>
          </div>
        ) : null}
        <ListControls
          searchValue={sourceQuery}
          onSearchChange={(value) => {
            setSourceQuery(value);
            setSourcePage(1);
          }}
          searchPlaceholder="按素材 ID、Prompt、时间搜索"
          filterValue={sourceFilter}
          filterOptions={[
            { value: "all", label: "全部素材" },
            { value: "with_history", label: "仅有文案历史" },
            { value: "without_history", label: "仅无文案历史" },
          ]}
          onFilterChange={(value) => {
            setSourceFilter(value);
            setSourcePage(1);
          }}
          pageSize={sourcePageSize}
          onPageSizeChange={(value) => {
            setSourcePageSize(value);
            setSourcePage(1);
          }}
          currentPage={pagedSources.currentPage}
          totalPages={pagedSources.totalPages}
          totalItems={pagedSources.totalItems}
          onPrevPage={() => setSourcePage((current) => current - 1)}
          onNextPage={() => setSourcePage((current) => current + 1)}
        />
        <div className="stack">
          {pagedSources.totalItems === 0 ? <div className="empty-state">没有匹配的素材记录。</div> : null}
          {pagedSources.items.map((item) => (
            <button
              key={item.sourceImageId}
              type="button"
              className={
                selectedSourceId === item.sourceImageId
                  ? "list-card prompt-card-selected"
                  : "list-card prompt-card"
              }
              onClick={() => {
                setSelectedSourceId(item.sourceImageId);
                setActiveVersionId(null);
                setActiveVersion(null);
                setEditableResult(null);
                setError(null);
              }}
            >
              <div className="split-header">
                <strong>{new Date(item.createdAt).toLocaleString("zh-CN")}</strong>
                <span className="badge">{item.hasHistory ? "Has Copy" : "New"}</span>
              </div>
              <div className="history-image-thumb">
                <img src={item.sourceImageUrl} alt="marketing source" className="generated-image" />
              </div>
              <p className="subtle">{item.promptPreview}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="stack">
        <div className="panel">
          <h2>素材组合</h2>
          {sourceDetail ? (
            <div className="stack">
              <div className="image-frame">
                <img src={sourceDetail.sourceImageUrl} alt="selected design source" className="generated-image" />
              </div>
              <p className="subtle">{sourceDetail.promptPreview}</p>
              <div className="grid-2">
                <div className="field">
                  <label>Front 成品图</label>
                  <select value={selectedFrontEditJobId} onChange={(event) => setSelectedFrontEditJobId(event.target.value)}>
                    {sourceDetail.frontOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {new Date(item.createdAt).toLocaleString("zh-CN")} · {item.style}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Back 成品图</label>
                  <select value={selectedBackEditJobId} onChange={(event) => setSelectedBackEditJobId(event.target.value)}>
                    {sourceDetail.backOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {new Date(item.createdAt).toLocaleString("zh-CN")} · {item.style}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="history-image-thumb">
                  {selectedFrontOption ? (
                    <img src={selectedFrontOption.imageUrl} alt="selected front option" className="generated-image" />
                  ) : (
                    <div className="empty-state">暂无 Front 成品图</div>
                  )}
                </div>
                <div className="history-image-thumb">
                  {selectedBackOption ? (
                    <img src={selectedBackOption.imageUrl} alt="selected back option" className="generated-image" />
                  ) : (
                    <div className="empty-state">暂无 Back 成品图</div>
                  )}
                </div>
              </div>
              <div className="field">
                <label>文案模板</label>
                <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                  {templates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <p className="helper">
                  {templates.find((item) => item.id === selectedTemplateId)?.description ?? "请选择模板。"}
                </p>
              </div>
              <div className="field">
                <label>补充要求</label>
                <textarea
                  rows={4}
                  value={userInstruction}
                  placeholder="可选：补充受众、语气、卖点重点、广告方向等要求。"
                  onChange={(event) => setUserInstruction(event.target.value)}
                />
              </div>
              <div className="button-row">
                <button
                  type="button"
                  className="primary-button"
                  disabled={
                    isPending ||
                    !selectedSourceId ||
                    !selectedFrontEditJobId ||
                    !selectedBackEditJobId ||
                    !selectedTemplateId
                  }
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        setError(null);
                        const response = await fetch("/api/marketing-copy/generate", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            sourceImageId: selectedSourceId,
                            frontEditJobId: selectedFrontEditJobId,
                            backEditJobId: selectedBackEditJobId,
                            templateId: selectedTemplateId,
                            userInstruction,
                          } satisfies GenerateMarketingCopyRequest),
                        });
                        const data = (await response.json()) as { item?: MarketingCopyVersionDetail; error?: string };

                        if (!response.ok) {
                          throw new Error(data.error ?? "生成营销文案失败。");
                        }

                        const item = data.item ?? null;
                        setActiveVersion(item);
                        setActiveVersionId(item?.version.id ?? null);
                        setEditableResult(getEditableResult(item));
                        await refreshVersionsForCurrentCombo();
                      } catch (generateError) {
                        setError(generateError instanceof Error ? generateError.message : "生成营销文案失败。");
                      }
                    })
                  }
                >
                  {isPending ? "生成中..." : "Generate Marketing Copy"}
                </button>
              </div>
            </div>
          ) : detailError ? (
            <p className="error-text">{detailError}</p>
          ) : (
            <div className="empty-state">选择左侧素材后，这里会展示可用的 front/back 成品图和模板设置。</div>
          )}
        </div>

        <div className="panel">
          <h2>历史版本</h2>
          <ListControls
            searchValue={versionQuery}
            onSearchChange={(value) => {
              setVersionQuery(value);
              setVersionPage(1);
            }}
            searchPlaceholder="按模板、版本标题、时间搜索"
            filterValue={versionFilter}
            filterOptions={[
              { value: "all", label: "全部版本" },
              { value: "confirmed", label: "仅 confirmed" },
              { value: "draft", label: "仅未 confirmed" },
            ]}
            onFilterChange={(value) => {
              setVersionFilter(value);
              setVersionPage(1);
            }}
            pageSize={versionPageSize}
            onPageSizeChange={(value) => {
              setVersionPageSize(value);
              setVersionPage(1);
            }}
            currentPage={pagedVersions.currentPage}
            totalPages={pagedVersions.totalPages}
            totalItems={pagedVersions.totalItems}
            onPrevPage={() => setVersionPage((current) => current - 1)}
            onNextPage={() => setVersionPage((current) => current + 1)}
          />
          {pagedVersions.totalItems === 0 ? (
            <div className="empty-state">当前素材组合还没有历史文案版本。</div>
          ) : (
            <div className="stack">
              {pagedVersions.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={activeVersionId === item.id ? "list-card prompt-card-selected" : "list-card prompt-card"}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await loadVersionDetail(item.id);
                      } catch (loadError) {
                        setError(loadError instanceof Error ? loadError.message : "获取文案详情失败。");
                      }
                    })
                  }
                >
                  <div className="split-header">
                    <strong>{item.templateName}</strong>
                    <span className="badge">{item.isConfirmed ? "Confirmed" : "Draft"}</span>
                  </div>
                  <p className="subtle">{new Date(item.createdAt).toLocaleString("zh-CN")}</p>
                  <p className="subtle">{renderPreviewText(item.finalResult ?? item.draftResult)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="split-header">
            <div>
              <h2>编辑文案</h2>
              <p className="helper">支持字段级编辑、保存 final 版本，并在同一素材组合下切换 confirmed。</p>
            </div>
            {activeVersion?.version.is_confirmed ? <span className="badge">Confirmed</span> : null}
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          {editableResult && activeVersion ? (
            <div className="stack">
              <div className="grid-2">
                <div className="field">
                  <label>Shopify Title EN</label>
                  <input
                    value={editableResult.shopify.title.en}
                    onChange={(event) => updateLocalizedField("shopify", "title", "en", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Shopify Title CN</label>
                  <input
                    value={editableResult.shopify.title.cn}
                    onChange={(event) => updateLocalizedField("shopify", "title", "cn", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Shopify Subtitle EN</label>
                  <input
                    value={editableResult.shopify.subtitle.en}
                    onChange={(event) => updateLocalizedField("shopify", "subtitle", "en", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Shopify Subtitle CN</label>
                  <input
                    value={editableResult.shopify.subtitle.cn}
                    onChange={(event) => updateLocalizedField("shopify", "subtitle", "cn", event.target.value)}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="stack">
                  <h3>Shopify Selling Points EN/CN</h3>
                  {editableResult.shopify.selling_points.map((item, index) => (
                    <div key={`selling-${index}`} className="grid-2">
                      <div className="field">
                        <label>{`Selling Point ${index + 1} EN`}</label>
                        <input value={item.en} onChange={(event) => updateSellingPoint(index, "en", event.target.value)} />
                      </div>
                      <div className="field">
                        <label>{`Selling Point ${index + 1} CN`}</label>
                        <input value={item.cn} onChange={(event) => updateSellingPoint(index, "cn", event.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid-2">
                <div className="field">
                  <label>Shopify Description EN</label>
                  <textarea
                    rows={12}
                    value={editableResult.shopify.description.en}
                    onChange={(event) => updateLocalizedField("shopify", "description", "en", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Shopify Description CN</label>
                  <textarea
                    rows={12}
                    value={editableResult.shopify.description.cn}
                    onChange={(event) => updateLocalizedField("shopify", "description", "cn", event.target.value)}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="field">
                  <label>Facebook Primary Text EN</label>
                  <textarea
                    rows={5}
                    value={editableResult.facebook.primary_text.en}
                    onChange={(event) => updateLocalizedField("facebook", "primary_text", "en", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Facebook Primary Text CN</label>
                  <textarea
                    rows={5}
                    value={editableResult.facebook.primary_text.cn}
                    onChange={(event) => updateLocalizedField("facebook", "primary_text", "cn", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Facebook Headline EN</label>
                  <input
                    value={editableResult.facebook.headline.en}
                    onChange={(event) => updateLocalizedField("facebook", "headline", "en", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Facebook Headline CN</label>
                  <input
                    value={editableResult.facebook.headline.cn}
                    onChange={(event) => updateLocalizedField("facebook", "headline", "cn", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Facebook Description EN</label>
                  <input
                    value={editableResult.facebook.description.en}
                    onChange={(event) => updateLocalizedField("facebook", "description", "en", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Facebook Description CN</label>
                  <input
                    value={editableResult.facebook.description.cn}
                    onChange={(event) => updateLocalizedField("facebook", "description", "cn", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label>CTA Suggestion EN</label>
                  <input
                    value={editableResult.facebook.cta_suggestion.en}
                    onChange={(event) => updateLocalizedField("facebook", "cta_suggestion", "en", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label>CTA Suggestion CN</label>
                  <input
                    value={editableResult.facebook.cta_suggestion.cn}
                    onChange={(event) => updateLocalizedField("facebook", "cta_suggestion", "cn", event.target.value)}
                  />
                </div>
              </div>

              <div className="button-row">
                <button
                  type="button"
                  className="ghost-button"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        const response = await fetch(`/api/marketing-copy/${activeVersion.version.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ finalResult: editableResult }),
                        });
                        const data = (await response.json()) as { item?: MarketingCopyVersionDetail; error?: string };
                        if (!response.ok) {
                          throw new Error(data.error ?? "保存最终文案失败。");
                        }
                        const item = data.item ?? null;
                        setActiveVersion(item);
                        setEditableResult(getEditableResult(item));
                        await refreshVersionsForCurrentCombo();
                      } catch (saveError) {
                        setError(saveError instanceof Error ? saveError.message : "保存最终文案失败。");
                      }
                    })
                  }
                >
                  保存 Final
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        const saveResponse = await fetch(`/api/marketing-copy/${activeVersion.version.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ finalResult: editableResult }),
                        });
                        const saveData = (await saveResponse.json()) as {
                          item?: MarketingCopyVersionDetail;
                          error?: string;
                        };

                        if (!saveResponse.ok) {
                          throw new Error(saveData.error ?? "保存最终文案失败。");
                        }

                        const confirmResponse = await fetch(`/api/marketing-copy/${activeVersion.version.id}/confirm`, {
                          method: "POST",
                        });
                        const confirmData = (await confirmResponse.json()) as {
                          item?: MarketingCopyVersionDetail;
                          error?: string;
                        };

                        if (!confirmResponse.ok) {
                          throw new Error(confirmData.error ?? "确认文案版本失败。");
                        }

                        const item = confirmData.item ?? null;
                        setActiveVersion(item);
                        setEditableResult(getEditableResult(item));
                        await refreshVersionsForCurrentCombo();
                      } catch (confirmError) {
                        setError(confirmError instanceof Error ? confirmError.message : "确认文案版本失败。");
                      }
                    })
                  }
                >
                  Confirm Version
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state">先生成一版文案，或从上面的历史版本里选择一版进行查看和编辑。</div>
          )}
        </div>
      </section>
    </div>
  );
}
