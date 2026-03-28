"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ListControls } from "@/components/list-controls";
import { SettingsSubnav } from "@/components/settings-subnav";
import { WorkspaceIntro } from "@/components/workspace-intro";
import type { TemplateRecord } from "@/lib/types/domain";
import { FIXED_SCHEMA_FIELDS } from "@/lib/types/domain";
import { normalizeSearchQuery, paginateItems } from "@/utils/pagination";
import { extractTemplatePlaceholders } from "@/utils/templateValidation";

let cachedTemplateItems: TemplateRecord[] | null = null;

function sanitizeError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function TemplateSettingsClient({ initialItems }: { initialItems: TemplateRecord[] }) {
  const [items, setItems] = useState(() => cachedTemplateItems ?? initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [isBootstrapping, setIsBootstrapping] = useState(() => !cachedTemplateItems);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const response = await fetch("/api/templates");
        const data = (await response.json()) as { items?: TemplateRecord[]; error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "获取模板失败。");
        }

        if (!active) {
          return;
        }

        cachedTemplateItems = data.items ?? [];
        setItems(cachedTemplateItems);
        setBootstrapError(null);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setBootstrapError(sanitizeError(loadError, "初始化模板页面失败。"));
      } finally {
        if (active) {
          setIsBootstrapping(false);
        }
      }
    }

    if (cachedTemplateItems) {
      setItems(cachedTemplateItems);
      setIsBootstrapping(false);
      void bootstrap();
    } else {
      void bootstrap();
    }

    return () => {
      active = false;
    };
  }, []);

  const placeholders = useMemo(() => extractTemplatePlaceholders(content), [content]);
  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeSearchQuery(query);
    return items.filter((item) => {
      if (filter === "default" && !item.is_default) return false;
      if (filter === "seeded" && !item.is_seeded) return false;
      if (filter === "custom" && item.is_seeded) return false;
      if (!normalizedQuery) return true;
      return [item.name, item.content].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [filter, items, query]);
  const pagedItems = useMemo(() => paginateItems(filteredItems, page, pageSize), [filteredItems, page, pageSize]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setContent("");
    setIsDefault(false);
  };

  async function refreshItems() {
    const response = await fetch("/api/templates");
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "刷新模板失败。");
    }
    cachedTemplateItems = data.items;
    setItems(data.items);
  }

  async function submit() {
    setError(null);
    setMessage(null);
    const url = editingId ? `/api/templates/${editingId}` : "/api/templates";
    const method = editingId ? "PATCH" : "POST";
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, content, isDefault }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "保存模板失败。");
    }
    await refreshItems();
    setMessage(editingId ? "模板已更新。" : "模板已创建。");
    resetForm();
  }

  return (
    <div className="workspace-shell">
      <WorkspaceIntro
        title="模型模板管理"
        description="统一维护可复用模板与字段约束。当前页用于编辑文本解析模板。"
        actions={<span className="status-pill">Template Rules</span>}
      />
      <SettingsSubnav />
      <div className="grid-2">
        <section className="panel">
          <div className="section-header">
            <div>
              <h2>模板编辑</h2>
              <p className="lead">模板应直接描述纪念币画面本身，不要写成“请生成一段 Prompt”这类元指令。</p>
            </div>
          </div>
        {bootstrapError ? <p className="error-text">{bootstrapError}</p> : null}
        {isBootstrapping ? (
          <div className="stack" style={{ marginBottom: 16 }}>
            <div className="skeleton-line skeleton-heading" />
            <div className="skeleton-card" />
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="templateName">模板名称</label>
          <input id="templateName" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="templateContent">模板内容</label>
          <textarea
            id="templateContent"
            placeholder="直接描述纪念币画面，例如正反面元素、刻字和材质风格..."
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        </div>
        <label className="helper" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
          <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />
          设为默认模板
        </label>
        <div className="button-row">
          <button
            type="button"
            className="primary-button"
            disabled={isPending}
            onClick={() => startTransition(async () => submit().catch((err) => setError(err.message)))}
          >
            {editingId ? "更新模板" : "保存模板"}
          </button>
          {editingId ? (
            <button type="button" className="ghost-button" onClick={resetForm}>
              取消编辑
            </button>
          ) : null}
        </div>
        {message ? <p className="helper">{message}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        </section>

        <section className="stack">
          <div className="panel">
          <h2>可用字段</h2>
          <div className="data-grid">
            {FIXED_SCHEMA_FIELDS.map((field) => (
              <div key={field} className="data-item">
                <strong>{field}</strong>
                <div>{`{${field}}`}</div>
              </div>
            ))}
          </div>
          </div>
          <div className="panel">
          <h2>模板预览</h2>
          {content ? (
            <>
              <div className="mono-block">{content}</div>
              <p className="helper">
                当前占位符：{placeholders.length > 0 ? placeholders.join(", ") : "未使用占位符"}
              </p>
            </>
          ) : (
            <div className="empty-state">编辑模板内容后，这里会显示实时预览。</div>
          )}
          </div>
          <div className="panel">
          <h2>已有模板</h2>
          <ListControls
            searchValue={query}
            onSearchChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            searchPlaceholder="按模板名、内容搜索"
            filterValue={filter}
            filterOptions={[
              { value: "all", label: "全部模板" },
              { value: "default", label: "仅默认" },
              { value: "seeded", label: "仅系统预置" },
              { value: "custom", label: "仅自定义" },
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
            currentPage={pagedItems.currentPage}
            totalPages={pagedItems.totalPages}
            totalItems={pagedItems.totalItems}
            onPrevPage={() => setPage((current) => current - 1)}
            onNextPage={() => setPage((current) => current + 1)}
          />
          <div className="stack">
            {pagedItems.totalItems === 0 ? <div className="empty-state">没有匹配的模板记录。</div> : null}
            {pagedItems.items.map((item) => (
              <article key={item.id} className="list-card">
                <header>
                  <div>
                    <strong>{item.name}</strong>
                    <div className="subtle">{item.is_seeded ? "系统预置模板" : "自定义模板"}</div>
                  </div>
                  {item.is_default ? <span className="badge">默认</span> : null}
                </header>
                <div className="mono-block" style={{ maxHeight: 160 }}>{item.content}</div>
                <div className="button-row" style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      setEditingId(item.id);
                      setName(item.name);
                      setContent(item.content);
                      setIsDefault(item.is_default);
                      setMessage(null);
                      setError(null);
                    }}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() =>
                      startTransition(async () => {
                        const response = await fetch(`/api/templates/${item.id}`, { method: "DELETE" });
                        const data = await response.json();
                        if (!response.ok) {
                          setError(data.error ?? "删除模板失败。");
                          return;
                        }
                        await refreshItems();
                      })
                    }
                  >
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>
          </div>
        </section>
      </div>
    </div>
  );
}
