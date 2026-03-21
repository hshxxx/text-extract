"use client";

import { useState, useTransition } from "react";
import type { ExtractionJobRecord } from "@/lib/types/domain";

export function HistoryClient({ initialItems }: { initialItems: ExtractionJobRecord[] }) {
  const [items] = useState(initialItems);
  const [selected, setSelected] = useState<ExtractionJobRecord | null>(initialItems[0] ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function openDetail(id: string) {
    setError(null);
    const response = await fetch(`/api/history/${id}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "获取详情失败。");
    }
    setSelected(data.item);
  }

  return (
    <div className="grid-2">
      <section className="panel">
        <div className="hero">
          <h1>历史记录</h1>
          <p>成功和失败任务都会保留，便于回看模板快照、模型输出和错误原因。</p>
        </div>
        <div className="stack">
          {items.length === 0 ? <div className="empty-state">还没有历史任务。</div> : null}
          {items.map((item) => (
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
                        await openDetail(item.id);
                      } catch (detailError) {
                        setError(detailError instanceof Error ? detailError.message : "获取详情失败。");
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
      </section>

      <section className="stack">
        <div className="panel">
          <h2>任务详情</h2>
          {selected ? (
            <>
              <p className="subtle">
                状态：{selected.status} · {new Date(selected.created_at).toLocaleString("zh-CN")}
              </p>
              {selected.error_message ? <p className="error-text">{selected.error_message}</p> : null}
            </>
          ) : (
            <div className="empty-state">从左侧选择一条历史任务查看详情。</div>
          )}
          {error ? <p className="error-text">{error}</p> : null}
        </div>
        <div className="panel">
          <h3>模板快照</h3>
          {selected?.template_snapshot ? (
            <div className="mono-block">{selected.template_snapshot}</div>
          ) : (
            <div className="empty-state">暂无模板快照。</div>
          )}
        </div>
        <div className="panel">
          <h3>结构化数据</h3>
          {selected?.structured_data ? (
            <div className="mono-block">{JSON.stringify(selected.structured_data, null, 2)}</div>
          ) : (
            <div className="empty-state">这条任务没有结构化数据。</div>
          )}
        </div>
        <div className="panel">
          <h3>最终 Prompt</h3>
          {selected?.final_prompt ? (
            <div className="mono-block">{selected.final_prompt}</div>
          ) : (
            <div className="empty-state">这条任务没有生成最终 Prompt。</div>
          )}
        </div>
        <div className="panel">
          <h3>原始模型输出</h3>
          {selected?.raw_model_output ? (
            <div className="mono-block">{selected.raw_model_output}</div>
          ) : (
            <div className="empty-state">这条任务没有记录原始模型输出。</div>
          )}
        </div>
      </section>
    </div>
  );
}
