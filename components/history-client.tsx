"use client";

import { useMemo, useState, useTransition } from "react";
import { ListControls } from "@/components/list-controls";
import type {
  EditHistoryDetail,
  EditHistoryItem,
  ExtractionJobRecord,
  ImageHistoryDetail,
  ImageHistoryItem,
} from "@/lib/types/domain";
import { normalizeSearchQuery, paginateItems } from "@/utils/pagination";

type HistoryClientProps = {
  initialTextItems: ExtractionJobRecord[];
  initialImageItems: ImageHistoryItem[];
  initialEditItems: EditHistoryItem[];
};

export function HistoryClient({
  initialTextItems,
  initialImageItems,
  initialEditItems,
}: HistoryClientProps) {
  const [activeTab, setActiveTab] = useState<"text" | "image" | "edit">("text");
  const [textItems] = useState(initialTextItems);
  const [imageItems] = useState(initialImageItems);
  const [editItems] = useState(initialEditItems);
  const [selectedText, setSelectedText] = useState<ExtractionJobRecord | null>(initialTextItems[0] ?? null);
  const [selectedImage, setSelectedImage] = useState<ImageHistoryDetail | null>(null);
  const [selectedEdit, setSelectedEdit] = useState<EditHistoryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [textQuery, setTextQuery] = useState("");
  const [imageQuery, setImageQuery] = useState("");
  const [editQuery, setEditQuery] = useState("");
  const [textFilter, setTextFilter] = useState("all");
  const [imageFilter, setImageFilter] = useState("all");
  const [editFilter, setEditFilter] = useState("all");
  const [textPageSize, setTextPageSize] = useState(10);
  const [imagePageSize, setImagePageSize] = useState(10);
  const [editPageSize, setEditPageSize] = useState(10);
  const [textPage, setTextPage] = useState(1);
  const [imagePage, setImagePage] = useState(1);
  const [editPage, setEditPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  const filteredTextItems = useMemo(() => {
    const query = normalizeSearchQuery(textQuery);
    return textItems.filter((item) => {
      if (textFilter !== "all" && item.status !== textFilter) return false;
      if (!query) return true;
      return [item.raw_input, item.final_prompt ?? "", item.created_at].some((value) =>
        value.toLowerCase().includes(query),
      );
    });
  }, [textFilter, textItems, textQuery]);

  const filteredImageItems = useMemo(() => {
    const query = normalizeSearchQuery(imageQuery);
    return imageItems.filter((item) => {
      if (imageFilter !== "all" && item.status !== imageFilter) return false;
      if (!query) return true;
      return [
        item.promptPreview,
        item.prompt,
        item.modelName,
        item.imageSize,
        item.createdAt,
        item.taskId,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [imageFilter, imageItems, imageQuery]);

  const filteredEditItems = useMemo(() => {
    const query = normalizeSearchQuery(editQuery);
    return editItems.filter((item) => {
      if (editFilter === "processing" && !(item.status.startsWith("editing_") || item.status === "uploading" || item.status === "splitting" || item.status === "trimming" || item.status === "validating")) {
        return false;
      }
      if (editFilter !== "all" && editFilter !== "processing" && item.status !== editFilter) return false;
      if (!query) return true;
      return [
        item.taskId,
        item.sourceImageId,
        item.status,
        item.frontStatus ?? "",
        item.backStatus ?? "",
        item.createdAt,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [editFilter, editItems, editQuery]);

  const pagedTextItems = useMemo(
    () => paginateItems(filteredTextItems, textPage, textPageSize),
    [filteredTextItems, textPage, textPageSize],
  );
  const pagedImageItems = useMemo(
    () => paginateItems(filteredImageItems, imagePage, imagePageSize),
    [filteredImageItems, imagePage, imagePageSize],
  );
  const pagedEditItems = useMemo(
    () => paginateItems(filteredEditItems, editPage, editPageSize),
    [filteredEditItems, editPage, editPageSize],
  );

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

  async function openEditDetail(id: string) {
    setError(null);
    const response = await fetch(`/api/edit-history/${id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "获取图片编辑详情失败。");
    }
    setSelectedEdit(data.item as EditHistoryDetail);
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
          <button
            type="button"
            className={activeTab === "edit" ? "nav-link-active" : "nav-link"}
            onClick={() => setActiveTab("edit")}
          >
            图片编辑
          </button>
        </div>

        {activeTab === "text" ? (
          <div className="stack">
            <ListControls
              searchValue={textQuery}
              onSearchChange={(value) => {
                setTextQuery(value);
                setTextPage(1);
              }}
              searchPlaceholder="按输入内容、Prompt、时间搜索"
              filterValue={textFilter}
              filterOptions={[
                { value: "all", label: "全部状态" },
                { value: "success", label: "成功" },
                { value: "failed", label: "失败" },
              ]}
              onFilterChange={(value) => {
                setTextFilter(value);
                setTextPage(1);
              }}
              pageSize={textPageSize}
              onPageSizeChange={(value) => {
                setTextPageSize(value);
                setTextPage(1);
              }}
              currentPage={pagedTextItems.currentPage}
              totalPages={pagedTextItems.totalPages}
              totalItems={pagedTextItems.totalItems}
              onPrevPage={() => setTextPage((current) => current - 1)}
              onNextPage={() => setTextPage((current) => current + 1)}
            />
            {pagedTextItems.totalItems === 0 ? <div className="empty-state">还没有文本提取历史任务。</div> : null}
            {pagedTextItems.items.map((item) => (
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
        ) : activeTab === "image" ? (
          <div className="stack">
            <ListControls
              searchValue={imageQuery}
              onSearchChange={(value) => {
                setImageQuery(value);
                setImagePage(1);
              }}
              searchPlaceholder="按 Prompt、模型、尺寸、任务 ID 搜索"
              filterValue={imageFilter}
              filterOptions={[
                { value: "all", label: "全部状态" },
                { value: "success", label: "成功" },
                { value: "failed", label: "失败" },
              ]}
              onFilterChange={(value) => {
                setImageFilter(value);
                setImagePage(1);
              }}
              pageSize={imagePageSize}
              onPageSizeChange={(value) => {
                setImagePageSize(value);
                setImagePage(1);
              }}
              currentPage={pagedImageItems.currentPage}
              totalPages={pagedImageItems.totalPages}
              totalItems={pagedImageItems.totalItems}
              onPrevPage={() => setImagePage((current) => current - 1)}
              onNextPage={() => setImagePage((current) => current + 1)}
            />
            {pagedImageItems.totalItems === 0 ? <div className="empty-state">还没有图片生成历史任务。</div> : null}
            {pagedImageItems.items.map((item) => (
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
        ) : (
          <div className="stack">
            <ListControls
              searchValue={editQuery}
              onSearchChange={(value) => {
                setEditQuery(value);
                setEditPage(1);
              }}
              searchPlaceholder="按任务 ID、来源图片、状态搜索"
              filterValue={editFilter}
              filterOptions={[
                { value: "all", label: "全部状态" },
                { value: "completed", label: "已完成" },
                { value: "partial_success", label: "部分成功" },
                { value: "failed", label: "失败" },
                { value: "processing", label: "处理中" },
              ]}
              onFilterChange={(value) => {
                setEditFilter(value);
                setEditPage(1);
              }}
              pageSize={editPageSize}
              onPageSizeChange={(value) => {
                setEditPageSize(value);
                setEditPage(1);
              }}
              currentPage={pagedEditItems.currentPage}
              totalPages={pagedEditItems.totalPages}
              totalItems={pagedEditItems.totalItems}
              onPrevPage={() => setEditPage((current) => current - 1)}
              onNextPage={() => setEditPage((current) => current + 1)}
            />
            {pagedEditItems.totalItems === 0 ? <div className="empty-state">还没有图片编辑历史任务。</div> : null}
            {pagedEditItems.items.map((item) => (
              <article key={item.taskId} className="list-card">
                <header>
                  <div>
                    <strong>{new Date(item.createdAt).toLocaleString("zh-CN")}</strong>
                    <div className="subtle">
                      Front: {item.frontStatus ?? "未开始"} · Back: {item.backStatus ?? "未开始"}
                    </div>
                  </div>
                  <span className="status">{item.status}</span>
                </header>
                <div className="grid-2" style={{ marginTop: 12 }}>
                  <div className="history-image-thumb">
                    {item.frontImage ? <img src={item.frontImage} alt="front edited history" className="generated-image" /> : <div className="empty-state">暂无 Front</div>}
                  </div>
                  <div className="history-image-thumb">
                    {item.backImage ? <img src={item.backImage} alt="back edited history" className="generated-image" /> : <div className="empty-state">暂无 Back</div>}
                  </div>
                </div>
                <div className="button-row" style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await openEditDetail(item.taskId);
                        } catch (detailError) {
                          setError(detailError instanceof Error ? detailError.message : "获取图片编辑详情失败。");
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
        ) : activeTab === "image" ? (
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
        ) : (
          <>
            <div className="panel">
              <h2>图片编辑任务详情</h2>
              {selectedEdit ? (
                <>
                  <p className="subtle">
                    状态：{selectedEdit.task.status} · {new Date(selectedEdit.task.created_at).toLocaleString("zh-CN")}
                  </p>
                  <p className="subtle">来源图片：{selectedEdit.sourceImageId}</p>
                </>
              ) : (
                <div className="empty-state">从左侧选择一条图片编辑任务查看详情。</div>
              )}
              {error ? <p className="error-text">{error}</p> : null}
            </div>
            <div className="panel">
              <h3>Front Final</h3>
              {selectedEdit?.frontJob?.image_url ? (
                <div className="image-frame">
                  <img src={selectedEdit.frontJob.image_url} alt="front final history" className="generated-image" />
                </div>
              ) : (
                <div className="empty-state">暂无 Front Final。</div>
              )}
            </div>
            <div className="panel">
              <h3>Back Final</h3>
              {selectedEdit?.backJob?.image_url ? (
                <div className="image-frame">
                  <img src={selectedEdit.backJob.image_url} alt="back final history" className="generated-image" />
                </div>
              ) : (
                <div className="empty-state">暂无 Back Final。</div>
              )}
            </div>
            <div className="panel">
              <h3>状态摘要</h3>
              {selectedEdit ? (
                <div className="mono-block">
                  {JSON.stringify(
                    {
                      task_id: selectedEdit.task.id,
                      source_image_id: selectedEdit.sourceImageId,
                      status: selectedEdit.task.status,
                      front_status: selectedEdit.frontJob?.status ?? null,
                      back_status: selectedEdit.backJob?.status ?? null,
                      front_image: selectedEdit.frontJob?.image_url ?? null,
                      back_image: selectedEdit.backJob?.image_url ?? null,
                    },
                    null,
                    2,
                  )}
                </div>
              ) : (
                <div className="empty-state">暂无图片编辑详情。</div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
