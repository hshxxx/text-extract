"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ListControls } from "@/components/list-controls";
import type {
  ExtractionResultListItem,
  ImageGenerationResponse,
  ImageModelConfigRecord,
  ImageSize,
} from "@/lib/types/domain";
import { normalizeSearchQuery, paginateItems } from "@/utils/pagination";

type SafeImageModelConfig = Omit<ImageModelConfigRecord, "api_key_encrypted">;

type ImageGenerationClientProps = {
  initialPrompts: ExtractionResultListItem[];
  initialImageModels: SafeImageModelConfig[];
};

const IMAGE_SIZES: ImageSize[] = ["1024x1024", "1536x1536", "2048x2048", "2560x1440", "3840x2160"];

export function ImageGenerationClient({
  initialPrompts,
  initialImageModels,
}: ImageGenerationClientProps) {
  const [prompts, setPrompts] = useState(initialPrompts);
  const [selectedPromptId, setSelectedPromptId] = useState(initialPrompts[0]?.id ?? "");
  const [promptQuery, setPromptQuery] = useState("");
  const [promptFilter, setPromptFilter] = useState("all");
  const [promptPageSize, setPromptPageSize] = useState(10);
  const [promptPage, setPromptPage] = useState(1);
  const [imageModelConfigId, setImageModelConfigId] = useState(
    initialImageModels.find((item) => item.is_default)?.id ?? initialImageModels[0]?.id ?? "",
  );
  const [imageSize, setImageSize] = useState<ImageSize>("1024x1024");
  const [result, setResult] = useState<ImageGenerationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  async function refreshPrompts() {
    const response = await fetch("/api/extraction-results?limit=50");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "刷新 Prompt 列表失败。");
    }

    const items = data.items as ExtractionResultListItem[];
    setPrompts(items);
    setSelectedPromptId((current) => (items.some((item) => item.id === current) ? current : (items[0]?.id ?? "")));
  }

  return (
    <div className="grid-2">
      <section className="panel">
        <div className="hero">
          <h1>图片生成</h1>
          <p>直接消费文本提取阶段已经生成的 Prompt。若要改 Prompt，请返回文本解析页重新生成。</p>
        </div>
        {prompts.length === 0 ? (
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

      <section className="stack">
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
          {initialImageModels.length === 0 ? (
            <div className="empty-state">
              <p>请先在模型配置页创建图片模型。</p>
              <Link href="/settings/models" className="primary-button">
                前往模型配置
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
                    {initialImageModels.map((item) => (
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
              <div className="button-row">
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
                    Edit Image
                  </Link>
                ) : null}
              </div>
            </>
          )}
          {error ? <p className="error-text">{error}</p> : null}
        </div>

        <div className="panel">
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
        </div>
      </section>
    </div>
  );
}
