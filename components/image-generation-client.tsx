"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ListControls } from "@/components/list-controls";
import { WorkspaceIntro } from "@/components/workspace-intro";
import type {
  ExtractionResultListItem,
  GenerateImageBootstrapResponse,
  ImageGenerationResponse,
  ImageSize,
  SafeImageModelConfigRecord,
} from "@/lib/types/domain";
import { normalizeSearchQuery, paginateItems } from "@/utils/pagination";

type ImageGenerationClientProps = {
  initialPrompts: ExtractionResultListItem[];
  initialImageModels: SafeImageModelConfigRecord[];
};

const IMAGE_SIZES: ImageSize[] = ["1024x1024", "1536x1536", "2048x2048", "2560x1440", "3840x2160"];
let cachedImageGenerationBootstrap: {
  prompts: ExtractionResultListItem[];
  imageModels: SafeImageModelConfigRecord[];
} | null = null;

function sanitizeError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function ImageGenerationClient({
  initialPrompts,
  initialImageModels,
}: ImageGenerationClientProps) {
  const [prompts, setPrompts] = useState(() => cachedImageGenerationBootstrap?.prompts ?? initialPrompts);
  const [imageModels, setImageModels] = useState<SafeImageModelConfigRecord[]>(
    () => cachedImageGenerationBootstrap?.imageModels ?? initialImageModels,
  );
  const [selectedPromptId, setSelectedPromptId] = useState(
    () => cachedImageGenerationBootstrap?.prompts[0]?.id ?? initialPrompts[0]?.id ?? "",
  );
  const [promptQuery, setPromptQuery] = useState("");
  const [promptFilter, setPromptFilter] = useState("all");
  const [promptPageSize, setPromptPageSize] = useState(10);
  const [promptPage, setPromptPage] = useState(1);
  const [imageModelConfigId, setImageModelConfigId] = useState(() =>
    (cachedImageGenerationBootstrap?.imageModels ?? initialImageModels).find((item) => item.is_default)?.id ??
    (cachedImageGenerationBootstrap?.imageModels ?? initialImageModels)[0]?.id ??
    "",
  );
  const [imageSize, setImageSize] = useState<ImageSize>("1024x1024");
  const [result, setResult] = useState<ImageGenerationResponse | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(() => !cachedImageGenerationBootstrap);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const response = await fetch("/api/generate-image/bootstrap");
        const data = (await response.json()) as GenerateImageBootstrapResponse & { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "初始化图片生成页面失败。");
        }

        if (!active) {
          return;
        }

        const next = {
          prompts: data.prompts ?? [],
          imageModels: data.imageModels ?? [],
        };

        cachedImageGenerationBootstrap = next;
        setPrompts(next.prompts);
        setImageModels(next.imageModels);
        setSelectedPromptId((current) => (next.prompts.some((item) => item.id === current) ? current : (next.prompts[0]?.id ?? "")));
        setImageModelConfigId((current) =>
          next.imageModels.some((item) => item.id === current)
            ? current
            : (next.imageModels.find((item) => item.is_default)?.id ?? next.imageModels[0]?.id ?? ""),
        );
        setBootstrapError(null);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setBootstrapError(sanitizeError(loadError, "初始化图片生成页面失败。"));
      } finally {
        if (active) {
          setIsBootstrapping(false);
        }
      }
    }

    if (cachedImageGenerationBootstrap) {
      setPrompts(cachedImageGenerationBootstrap.prompts);
      setImageModels(cachedImageGenerationBootstrap.imageModels);
      setIsBootstrapping(false);
      void bootstrap();
    } else {
      void bootstrap();
    }

    return () => {
      active = false;
    };
  }, []);

  const selectedPrompt = useMemo(
    () => prompts.find((item) => item.id === selectedPromptId) ?? null,
    [prompts, selectedPromptId],
  );

  const filteredPrompts = useMemo(() => {
    const query = normalizeSearchQuery(promptQuery);
    const now = Date.now();

    return prompts.filter((item) => {
      if (promptFilter === "7d" && now - new Date(item.created_at).getTime() > 7 * 24 * 60 * 60 * 1000) {
        return false;
      }
      if (promptFilter === "30d" && now - new Date(item.created_at).getTime() > 30 * 24 * 60 * 60 * 1000) {
        return false;
      }
      if (!query) return true;
      return item.prompt.toLowerCase().includes(query) || item.id.toLowerCase().includes(query);
    });
  }, [promptFilter, promptQuery, prompts]);

  const pagedPrompts = useMemo(
    () => paginateItems(filteredPrompts, promptPage, promptPageSize),
    [filteredPrompts, promptPage, promptPageSize],
  );

  useEffect(() => {
    setPromptPage(pagedPrompts.currentPage);
  }, [pagedPrompts.currentPage]);

  useEffect(() => {
    if (!filteredPrompts.some((item) => item.id === selectedPromptId)) {
      setSelectedPromptId(filteredPrompts[0]?.id ?? "");
    }
  }, [filteredPrompts, selectedPromptId]);

  useEffect(() => {
    if (!imageModels.some((item) => item.id === imageModelConfigId)) {
      setImageModelConfigId(imageModels.find((item) => item.is_default)?.id ?? imageModels[0]?.id ?? "");
    }
  }, [imageModelConfigId, imageModels]);

  async function refreshPrompts() {
    const response = await fetch("/api/extraction-results?limit=50");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "刷新 Prompt 列表失败。");
    }

    const items = data.items as ExtractionResultListItem[];
    cachedImageGenerationBootstrap = {
      prompts: items,
      imageModels: cachedImageGenerationBootstrap?.imageModels ?? imageModels,
    };
    setPrompts(items);
    setSelectedPromptId((current) => (items.some((item) => item.id === current) ? current : (items[0]?.id ?? "")));
  }

  return (
    <div className="workspace-shell">
      <WorkspaceIntro
        title="图片生成"
        description="选择已经生成的 Prompt，指定图片模型和尺寸后直接出图。"
        actions={<span className="status-pill">Prompt Driven</span>}
      />
      <div className="workspace-grid-3">
        <section className="panel workspace-column">
        {bootstrapError ? <p className="error-text">{bootstrapError}</p> : null}
        {isBootstrapping ? (
          <div className="stack" style={{ marginBottom: 16 }}>
            <div className="skeleton-line skeleton-heading" />
            <div className="skeleton-card" />
          </div>
        ) : null}
        {prompts.length === 0 && !isBootstrapping ? (
          <div className="empty-state">
            <p>还没有可用 Prompt。先去文本解析页生成一条成功记录。</p>
            <Link href="/extract" className="primary-button">
              前往文本解析
            </Link>
          </div>
        ) : null}
        <div className="split-header" style={{ marginBottom: 12 }}>
          <div>
            <h2>Prompt 列表</h2>
            <p className="subtle">默认加载最近 20 条成功生成的 Prompt。</p>
          </div>
          <button
            type="button"
            className="ghost-button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await refreshPrompts();
                } catch (refreshError) {
                  setError(refreshError instanceof Error ? refreshError.message : "刷新 Prompt 列表失败。");
                }
              })
            }
          >
            刷新 Prompt
          </button>
        </div>
        <ListControls
          searchValue={promptQuery}
          onSearchChange={(value) => {
            setPromptQuery(value);
            setPromptPage(1);
          }}
          searchPlaceholder="按 Prompt 内容或任务 ID 搜索"
          filterValue={promptFilter}
          filterOptions={[
            { value: "all", label: "全部" },
            { value: "7d", label: "近 7 天" },
            { value: "30d", label: "近 30 天" },
          ]}
          onFilterChange={(value) => {
            setPromptFilter(value);
            setPromptPage(1);
          }}
          pageSize={promptPageSize}
          onPageSizeChange={(value) => {
            setPromptPageSize(value);
            setPromptPage(1);
          }}
          currentPage={pagedPrompts.currentPage}
          totalPages={pagedPrompts.totalPages}
          totalItems={pagedPrompts.totalItems}
          onPrevPage={() => setPromptPage((current) => current - 1)}
          onNextPage={() => setPromptPage((current) => current + 1)}
        />
        <div className="stack">
          {pagedPrompts.totalItems === 0 ? <div className="empty-state">没有匹配的 Prompt 记录。</div> : null}
          {pagedPrompts.items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={selectedPromptId === item.id ? "list-card prompt-card-selected" : "list-card prompt-card"}
              onClick={() => setSelectedPromptId(item.id)}
            >
              <strong>{new Date(item.created_at).toLocaleString("zh-CN")}</strong>
              <div className="subtle" style={{ marginTop: 8 }}>
                {item.prompt.slice(0, 120)}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="stack workspace-column">
        <div className="panel">
          <h2>Prompt 预览</h2>
          {selectedPrompt ? (
            <div className="mono-block">{selectedPrompt.prompt}</div>
          ) : (
            <div className="empty-state">选择左侧 Prompt 后，这里会显示完整内容。</div>
          )}
        </div>

        <div className="panel">
          <h2>图片设置</h2>
          {imageModels.length === 0 && !isBootstrapping ? (
            <div className="empty-state">
              <p>请先在模型模板管理里创建图片模型。</p>
              <Link href="/settings" className="primary-button">
                前往模型模板管理
              </Link>
            </div>
          ) : (
            <>
              <div className="grid-2">
                <div className="field">
                  <label htmlFor="imageModelConfigId">图片模型</label>
                  <select
                    id="imageModelConfigId"
                    value={imageModelConfigId}
                    onChange={(event) => setImageModelConfigId(event.target.value)}
                  >
                    {imageModels.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.model}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="imageSize">图片尺寸</label>
                  <select
                    id="imageSize"
                    value={imageSize}
                    onChange={(event) => setImageSize(event.target.value as ImageSize)}
                  >
                    {IMAGE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="button-row primary-group">
                <button
                  type="button"
                  className="primary-button"
                  disabled={isPending || !selectedPromptId || !imageModelConfigId}
                  onClick={() =>
                    startTransition(async () => {
                      setError(null);
                      setResult(null);

                      const response = await fetch("/api/generate-image", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          extractionResultId: selectedPromptId,
                          imageModelConfigId,
                          imageSize,
                        }),
                      });
                      const data = (await response.json()) as ImageGenerationResponse & { error?: string };

                      if (!response.ok) {
                        setError(data.error ?? data.errorMessage ?? "图片生成失败。");
                        return;
                      }

                      if (data.status === "failed") {
                        setError(data.errorMessage ?? "图片生成失败。");
                      }

                      setResult(data);
                    })
                  }
                >
                  {isPending ? "生成中..." : result?.imageUrl ? "重新生成" : "开始生成"}
                </button>
                {result?.imageUrl ? (
                  <a href={result.imageUrl} className="ghost-button" download target="_blank" rel="noreferrer">
                    下载图片
                  </a>
                ) : null}
                {result?.imageResultId ? (
                  <Link href={`/edit-image?source=${result.imageResultId}`} className="ghost-button">
                    前往图片编辑
                  </Link>
                ) : null}
              </div>
            </>
          )}
          {error ? <p className="error-text">{error}</p> : null}
        </div>
      </section>

        <section className="panel workspace-column">
          <h2>生成结果</h2>
          {result?.imageUrl ? (
            <div className="stack">
              <div className="image-frame">
                <img src={result.imageUrl} alt="AI generated result" className="generated-image" />
              </div>
              <p className="helper">
                来源任务：{result.extractionJobId} · 模型：{result.modelName} · 尺寸：{result.imageSize}
              </p>
              {result.seed ? <p className="helper">Seed：{result.seed}</p> : null}
            </div>
          ) : (
            <div className="empty-state">生成后会在这里展示图片预览与下载入口。</div>
          )}
        </section>
      </div>
    </div>
  );
}
