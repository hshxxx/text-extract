"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ListControls } from "@/components/list-controls";
import type {
  CreateEditTaskResponse,
  EditTaskDetailResponse,
  EditHistoryItem,
  EditableImageListItem,
  RetryEditJobResponse,
} from "@/lib/types/domain";
import { normalizeSearchQuery, paginateItems } from "@/utils/pagination";

type EditImageClientProps = {
  initialSources: EditableImageListItem[];
  initialSourceId: string | null;
};

type EditResultState = CreateEditTaskResponse | EditTaskDetailResponse | RetryEditJobResponse;

function isTaskProcessing(status: string | null) {
  return (
    status === "splitting" ||
    status === "trimming" ||
    status === "validating" ||
    status === "editing_front" ||
    status === "editing_back" ||
    status === "uploading"
  );
}

function formatEditErrorCode(code: string | null | undefined) {
  switch (code) {
    case "PHOTOROOM_REQUEST_FAILED":
      return "IMAGE_EDIT_REQUEST_FAILED";
    case "PHOTOROOM_TIMEOUT":
      return "IMAGE_EDIT_TIMEOUT";
    case "PHOTOROOM_INVALID_RESPONSE":
      return "IMAGE_EDIT_INVALID_RESPONSE";
    default:
      return code ?? null;
  }
}

export function EditImageClient({ initialSources, initialSourceId }: EditImageClientProps) {
  const [sources, setSources] = useState(initialSources);
  const [selectedSourceId, setSelectedSourceId] = useState(
    initialSourceId && initialSources.some((item) => item.id === initialSourceId)
      ? initialSourceId
      : (initialSources[0]?.id ?? ""),
  );
  const [sourceQuery, setSourceQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sourcePageSize, setSourcePageSize] = useState(10);
  const [sourcePage, setSourcePage] = useState(1);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [result, setResult] = useState<EditResultState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceHistory, setSourceHistory] = useState<EditHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedSource = useMemo(
    () => sources.find((item) => item.id === selectedSourceId) ?? null,
    [sources, selectedSourceId],
  );

  const filteredSources = useMemo(() => {
    const query = normalizeSearchQuery(sourceQuery);
    return sources.filter((item) => {
      if (sourceFilter === "edited" && !item.edited) return false;
      if (sourceFilter === "not_edited" && item.edited) return false;
      if (!query) return true;
      return [
        item.id,
        item.taskId,
        item.createdAt,
        item.latestEditStatus ?? "",
        item.edited ? "edited" : "not edited",
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [sourceFilter, sourceQuery, sources]);

  const pagedSources = useMemo(
    () => paginateItems(filteredSources, sourcePage, sourcePageSize),
    [filteredSources, sourcePage, sourcePageSize],
  );

  useEffect(() => {
    setSourcePage(pagedSources.currentPage);
  }, [pagedSources.currentPage]);

  useEffect(() => {
    if (!filteredSources.some((item) => item.id === selectedSourceId)) {
      setSelectedSourceId(filteredSources[0]?.id ?? "");
      setActiveTaskId(null);
      setResult(null);
    }
  }, [filteredSources, selectedSourceId]);

  useEffect(() => {
    if (!activeTaskId) {
      setResult(null);
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const response = await fetch(`/api/edit-image/${activeTaskId}`);
        const data = (await response.json()) as { item?: EditTaskDetailResponse; error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "获取图片编辑详情失败。");
        }

        if (!active) {
          return;
        }

        const item = data.item ?? null;
        setResult(item);
        setError(null);

        if (item) {
          updateSourceStatus(item.task_id, item.task_status);

          if (item.task_status === "completed" || item.task_status === "partial_success") {
            void loadSourceHistory(selectedSourceId);
          }

          if (isTaskProcessing(item.task_status)) {
            timer = setTimeout(() => {
              void poll();
            }, 2000);
          }
        }
      } catch (detailError) {
        if (active) {
          setResult(null);
          setError(detailError instanceof Error ? detailError.message : "获取图片编辑详情失败。");
        }
      }
    };

    void poll();

    return () => {
      active = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [activeTaskId]);

  useEffect(() => {
    if (!selectedSourceId) {
      setSourceHistory([]);
      setHistoryError(null);
      return;
    }

    void loadSourceHistory(selectedSourceId);
  }, [selectedSourceId]);

  async function loadSourceHistory(sourceId: string) {
    try {
      const response = await fetch(`/api/edit-history/by-source/${sourceId}`);
      const data = (await response.json()) as { items?: EditHistoryItem[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "获取来源图历史编辑结果失败。");
      }

      setSourceHistory(data.items ?? []);
      setHistoryError(null);
    } catch (historyLoadError) {
      setSourceHistory([]);
      setHistoryError(
        historyLoadError instanceof Error ? historyLoadError.message : "获取来源图历史编辑结果失败。",
      );
    }
  }

  function updateSourceStatus(taskId: string, status: string) {
    setSources((current) =>
      current.map((item) =>
        item.id === selectedSourceId
          ? {
              ...item,
              edited: status === "completed" || status === "partial_success",
              latestEditTaskId: taskId,
              latestEditStatus: status as EditableImageListItem["latestEditStatus"],
            }
          : item,
      ),
    );
  }

  function resolveTaskStatus(value: EditResultState | null) {
    if (!value) {
      return null;
    }

    return "task_status" in value ? value.task_status : value.status;
  }

  return (
    <div className="grid-2">
      <section className="panel">
        <div className="hero">
          <h1>图片编辑</h1>
          <p>基于图片生成结果自动拆分正反面，生成两张适合商品展示的纪念币成品图。</p>
        </div>
        {sources.length === 0 ? (
          <div className="empty-state">
            <p>还没有可编辑的来源图片。先去图片生成页产出一张白底双币图。</p>
            <Link href="/generate-image" className="primary-button">
              前往图片生成
            </Link>
          </div>
        ) : null}
        <ListControls
          searchValue={sourceQuery}
          onSearchChange={(value) => {
            setSourceQuery(value);
            setSourcePage(1);
          }}
          searchPlaceholder="按来源 ID、任务 ID、时间、最近状态搜索"
          filterValue={sourceFilter}
          filterOptions={[
            { value: "all", label: "全部来源" },
            { value: "edited", label: "仅已编辑" },
            { value: "not_edited", label: "仅未编辑" },
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
          {pagedSources.totalItems === 0 ? <div className="empty-state">没有匹配的来源图片记录。</div> : null}
          {pagedSources.items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={selectedSourceId === item.id ? "list-card prompt-card-selected" : "list-card prompt-card"}
              onClick={() => {
                setSelectedSourceId(item.id);
                setActiveTaskId(null);
                setResult(null);
                setError(null);
              }}
            >
              <div className="split-header">
                <strong>{new Date(item.createdAt).toLocaleString("zh-CN")}</strong>
                <span className="badge">{item.edited ? "Edited" : "Not Edited"}</span>
              </div>
              <div className="history-image-thumb">
                <img src={item.imageUrl} alt="source preview" className="generated-image" />
              </div>
              <p className="subtle">
                {item.latestEditStatus ? `最近编辑状态：${item.latestEditStatus}` : "尚未创建编辑任务"}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="stack">
        <div className="panel">
          <h2>来源图片</h2>
          {selectedSource ? (
            <div className="stack">
              <div className="image-frame">
                <img src={selectedSource.imageUrl} alt="selected source" className="generated-image" />
              </div>
              <div className="button-row">
                <button
                  type="button"
                  className="primary-button"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      setActiveTaskId(null);
                      setResult(null);
                      setError(null);
                      const response = await fetch("/api/edit-image", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ source_image_id: selectedSource.id }),
                      });
                      const data = (await response.json()) as EditResultState & { error?: string };

                      if (!response.ok) {
                        setError(data.error ?? "创建图片编辑任务失败。");
                        return;
                      }

                      setActiveTaskId(data.task_id);
                      setResult(data);
                      updateSourceStatus(data.task_id, resolveTaskStatus(data) ?? "failed");
                    })
                  }
                >
                  {isPending ? "处理中..." : "Generate"}
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state">选择左侧来源图片后，这里会显示预览和生成入口。</div>
          )}
          {error ? <p className="error-text">{error}</p> : null}
        </div>

        <div className="panel">
          <h2>编辑结果</h2>
          {result ? (
            <div className="stack">
              <p className="subtle">主任务状态：{resolveTaskStatus(result)}</p>
              <p className="subtle">
                Front：{result.front_status ?? "未开始"} · Back：{result.back_status ?? "未开始"}
              </p>
              {"error_message" in result && result.error_message ? (
                <p className="error-text">
                  {formatEditErrorCode(result.error_code) ? `${formatEditErrorCode(result.error_code)} · ` : ""}
                  {result.error_message}
                </p>
              ) : null}
              <div className="grid-2">
                <div className="panel" style={{ padding: 16 }}>
                  <h3>Front Edited Image</h3>
                  {result.front_image ? (
                    <div className="image-frame">
                      <img src={result.front_image} alt="front edited result" className="generated-image" />
                    </div>
                  ) : (
                    <div className="empty-state">Front 结果尚不可用。</div>
                  )}
                  {result.front_status === "failed" && result.front_job_id ? (
                    <div className="button-row" style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            const response = await fetch(`/api/edit-image/${result.front_job_id}/retry`, {
                              method: "POST",
                            });
                            const data = (await response.json()) as RetryEditJobResponse & { error?: string };

                            if (!response.ok) {
                              setError(data.error ?? "Front 重试失败。");
                              return;
                            }

                            setActiveTaskId(data.task_id);
                            setResult(data);
                            updateSourceStatus(data.task_id, data.status);
                          })
                        }
                      >
                        Retry Front
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="panel" style={{ padding: 16 }}>
                  <h3>Back Edited Image</h3>
                  {result.back_image ? (
                    <div className="image-frame">
                      <img src={result.back_image} alt="back edited result" className="generated-image" />
                    </div>
                  ) : (
                    <div className="empty-state">Back 结果尚不可用。</div>
                  )}
                  {result.back_status === "failed" && result.back_job_id ? (
                    <div className="button-row" style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            const response = await fetch(`/api/edit-image/${result.back_job_id}/retry`, {
                              method: "POST",
                            });
                            const data = (await response.json()) as RetryEditJobResponse & { error?: string };

                            if (!response.ok) {
                              setError(data.error ?? "Back 重试失败。");
                              return;
                            }

                            setActiveTaskId(data.task_id);
                            setResult(data);
                            updateSourceStatus(data.task_id, data.status);
                          })
                        }
                      >
                        Retry Back
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">生成后会在这里展示 front/back 两张商品图。</div>
          )}
        </div>

        <div className="panel">
          <h2>该图片历史编辑结果</h2>
          {historyError ? <p className="error-text">{historyError}</p> : null}
          {selectedSource ? (
            sourceHistory.length > 0 ? (
              <div className="stack">
                {sourceHistory.map((item) => (
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
                        {item.frontImage ? (
                          <img src={item.frontImage} alt="front history result" className="generated-image" />
                        ) : (
                          <div className="empty-state">暂无 Front</div>
                        )}
                      </div>
                      <div className="history-image-thumb">
                        {item.backImage ? (
                          <img src={item.backImage} alt="back history result" className="generated-image" />
                        ) : (
                          <div className="empty-state">暂无 Back</div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">这张来源图还没有成功的历史编辑结果。</div>
            )
          ) : (
            <div className="empty-state">选择左侧来源图后，这里会显示该图片过去的成功编辑结果。</div>
          )}
        </div>
      </section>
    </div>
  );
}
