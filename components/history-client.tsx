"use client";

import { useState, useTransition } from "react";
import type {
  ExtractionJobRecord,
  ImageHistoryDetail,
  ImageHistoryItem,
} from "@/lib/types/domain";

type HistoryClientProps = {
  initialTextItems: ExtractionJobRecord[];
  initialImageItems: ImageHistoryItem[];
};

export function HistoryClient({
  initialTextItems,
  initialImageItems,
}: HistoryClientProps) {
  const [activeTab, setActiveTab] = useState<"text" | "image">("text");
  const [textItems] = useState(initialTextItems);
  const [imageItems] = useState(initialImageItems);
  const [selectedText, setSelectedText] = useState<ExtractionJobRecord | null>(initialTextItems[0] ?? null);
  const [selectedImage, setSelectedImage] = useState<ImageHistoryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function openTextDetail(id: string) {
    setError(null);
    const response = await fetch(`/api/history/${id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "获取文本历史详情失败。");
    }

    setSelectedText(data.item);
  }

  async function openImageDetail(id: string) {
    setError(null);
    const response = await fetch(`/api/image-history/${id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "获取图片历史详情失败。");
    }

    setSelectedImage(data.item);
  }

  return (
    <div className="grid-2">
      <section className="panel">
        <div className="hero">
          <h1>历史记录</h1>
          <p>文本提取与图片生成分标签保存，便于反查 Prompt、模型和最终结果。</p>
        </div>
        <div className="tab-row" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={activeTab === "text" ? "nav-link-active" : "nav-link"}
            onClick={() => setActiveTab("text")}
          >
            文本提取
          </button>
          <button
            type="button"
            className={activeTab === "image" ? "nav-link-active" : "nav-link"}
            onClick={() => setActiveTab("image")}
          >
            图片生成
          </button>
        </div>

        {activeTab === "text" ? (
          <div className="stack">
            {textItems.length === 0 ? <div className="empty-state">还没有文本提取历史任务。</div> : null}
            {textItems.map((item) => (
              <article key={item.id} className="list-card">
                <header>
                  <div>
                    <strong>{new Date(item.created_at).toLocaleString("zh-CN")}</strong>
                    <div className="subtle">{item.raw_input.slice(0, 72) || "空输入"}</div>
                  </div>
                  <span className={`status ${item.status === "success" ? "status-success" : "status-failed"}`}>
                    {item.status}
                  </span>
                </header>
                <div className="button-row">
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await openTextDetail(item.id);
                        } catch (detailError) {
                          setError(
                            detailError instanceof Error ? detailError.message : "获取文本历史详情失败。",
                          );
                        }
                      })
                    }
                  >
                    查看详情
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="stack">
            {imageItems.length === 0 ? <div className="empty-state">还没有图片生成历史任务。</div> : null}
            {imageItems.map((item) => (
              <article key={item.taskId} className="list-card">
                <header>
                  <div>
                    <strong>{new Date(item.createdAt).toLocaleString("zh-CN")}</strong>
                    <div className="subtle">
                      {item.modelName} · {item.imageSize}
                    </div>
                  </div>
                  <span className={`status ${item.status === "success" ? "status-success" : "status-failed"}`}>
                    {item.status}
                  </span>
                </header>
                {item.imageUrl ? (
                  <div className="history-image-thumb">
                    <img src={item.imageUrl} alt="history preview" className="generated-image" />
                  </div>
                ) : null}
                <p className="subtle">{item.promptPreview}</p>
                <div className="button-row">
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await openImageDetail(item.taskId);
                        } catch (detailError) {
                          setError(
                            detailError instanceof Error ? detailError.message : "获取图片历史详情失败。",
                          );
                        }
                      })
                    }
                  >
                    查看详情
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="stack">
        {activeTab === "text" ? (
          <>
            <div className="panel">
              <h2>文本任务详情</h2>
              {selectedText ? (
                <>
                  <p className="subtle">
                    状态：{selectedText.status} · {new Date(selectedText.created_at).toLocaleString("zh-CN")}
                  </p>
                  {selectedText.error_message ? <p className="error-text">{selectedText.error_message}</p> : null}
                </>
              ) : (
                <div className="empty-state">从左侧选择一条文本任务查看详情。</div>
              )}
              {error ? <p className="error-text">{error}</p> : null}
            </div>
            <div className="panel">
              <h3>模板快照</h3>
              {selectedText?.template_snapshot ? (
                <div className="mono-block">{selectedText.template_snapshot}</div>
              ) : (
                <div className="empty-state">暂无模板快照。</div>
              )}
            </div>
            <div className="panel">
              <h3>结构化数据</h3>
              {selectedText?.structured_data ? (
                <div className="mono-block">{JSON.stringify(selectedText.structured_data, null, 2)}</div>
              ) : (
                <div className="empty-state">这条任务没有结构化数据。</div>
              )}
            </div>
            <div className="panel">
              <h3>最终 Prompt</h3>
              {selectedText?.final_prompt ? (
                <div className="mono-block">{selectedText.final_prompt}</div>
              ) : (
                <div className="empty-state">这条任务没有生成最终 Prompt。</div>
              )}
            </div>
            <div className="panel">
              <h3>原始模型输出</h3>
              {selectedText?.raw_model_output ? (
                <div className="mono-block">{selectedText.raw_model_output}</div>
              ) : (
                <div className="empty-state">这条任务没有记录原始模型输出。</div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="panel">
              <h2>图片任务详情</h2>
              {selectedImage ? (
                <>
                  <p className="subtle">
                    状态：{selectedImage.task.status} · {new Date(selectedImage.task.created_at).toLocaleString("zh-CN")}
                  </p>
                  <p className="subtle">
                    来源提取任务：{selectedImage.task.extraction_job_id} · 模型：{selectedImage.modelName} · 尺寸：
                    {selectedImage.task.image_size}
                  </p>
                  {selectedImage.task.error_message ? (
                    <p className="error-text">{selectedImage.task.error_message}</p>
                  ) : null}
                </>
              ) : (
                <div className="empty-state">从左侧选择一条图片任务查看详情。</div>
              )}
              {error ? <p className="error-text">{error}</p> : null}
            </div>
            <div className="panel">
              <h3>来源 Prompt</h3>
              {selectedImage?.sourcePrompt ? (
                <div className="mono-block">{selectedImage.sourcePrompt}</div>
              ) : (
                <div className="empty-state">暂无来源 Prompt。</div>
              )}
            </div>
            <div className="panel">
              <h3>生成图片</h3>
              {selectedImage?.result?.image_url ? (
                <div className="stack">
                  <div className="image-frame">
                    <img src={selectedImage.result.image_url} alt="generated history result" className="generated-image" />
                  </div>
                  <div className="button-row">
                    <a href={selectedImage.result.image_url} className="ghost-button" target="_blank" rel="noreferrer">
                      打开原图
                    </a>
                  </div>
                </div>
              ) : (
                <div className="empty-state">这条任务没有可用图片结果。</div>
              )}
            </div>
            <div className="panel">
              <h3>结果元数据</h3>
              {selectedImage?.result ? (
                <div className="mono-block">
                  {JSON.stringify(
                    {
                      task_id: selectedImage.result.task_id,
                      image_url: selectedImage.result.image_url,
                      storage_path: selectedImage.result.storage_path,
                      provider_image_url: selectedImage.result.provider_image_url,
                      model: selectedImage.result.model,
                      seed: selectedImage.result.seed,
                    },
                    null,
                    2,
                  )}
                </div>
              ) : (
                <div className="empty-state">暂无结果元数据。</div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
