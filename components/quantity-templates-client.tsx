"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ListControls } from "@/components/list-controls";
import type { QuantityTemplateInput, QuantityTemplateRecord, QuantityTemplateTier } from "@/lib/types/domain";
import { normalizeSearchQuery, paginateItems } from "@/utils/pagination";

const DEFAULT_TIERS: QuantityTemplateTier[] = [
  { optionValue: "1PC", price: 11.99, compareAtPrice: 23.99, inventoryQty: 100 },
  { optionValue: "3PCS", price: 23.99, compareAtPrice: 47.99, inventoryQty: 100 },
  { optionValue: "5PCS", price: 35.99, compareAtPrice: 69.99, inventoryQty: 100 },
  { optionValue: "8PCS", price: 47.99, compareAtPrice: 89.99, inventoryQty: 100 },
  { optionValue: "10PCS", price: 59.99, compareAtPrice: 119.99, inventoryQty: 100 },
  { optionValue: "20PCS", price: 119.99, compareAtPrice: 199.99, inventoryQty: 100 },
  { optionValue: "30PCS", price: 179.99, compareAtPrice: 299.99, inventoryQty: 100 },
];

function cloneTiers(tiers: QuantityTemplateTier[]) {
  return tiers.map((item) => ({ ...item }));
}

function sanitizeError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function QuantityTemplatesClient() {
  const [items, setItems] = useState<QuantityTemplateRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [tiers, setTiers] = useState<QuantityTemplateTier[]>(cloneTiers(DEFAULT_TIERS));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function refreshItems() {
    const response = await fetch("/api/quantity-templates");
    const data = (await response.json()) as { items?: QuantityTemplateRecord[]; error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "获取数量模板失败。");
    }
    setItems(data.items ?? []);
  }

  useEffect(() => {
    void refreshItems().catch((loadError) => setError(sanitizeError(loadError, "初始化数量模板失败。")));
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeSearchQuery(query);
    return items.filter((item) => {
      if (filter === "seeded" && !item.is_seeded) return false;
      if (filter === "custom" && item.is_seeded) return false;
      if (filter === "default" && !item.is_default) return false;
      if (!normalizedQuery) return true;
      return [item.name, item.is_seeded ? "seeded" : "custom"].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [filter, items, query]);

  const pagedItems = useMemo(() => paginateItems(filteredItems, page, pageSize), [filteredItems, page, pageSize]);

  useEffect(() => {
    setPage(pagedItems.currentPage);
  }, [pagedItems.currentPage]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setIsDefault(false);
    setTiers(cloneTiers(DEFAULT_TIERS));
  }

  function loadForEdit(item: QuantityTemplateRecord) {
    if (item.is_seeded) {
      return;
    }
    setEditingId(item.id);
    setName(item.name);
    setIsDefault(item.is_default);
    setTiers(cloneTiers(item.tiers_json));
    setMessage(null);
    setError(null);
  }

  function updateTier(index: number, field: keyof QuantityTemplateTier, value: string) {
    setTiers((current) => {
      const next = cloneTiers(current);
      if (field === "optionValue") {
        next[index].optionValue = value;
      } else {
        next[index][field] = Number(value) as never;
      }
      return next;
    });
  }

  async function submit() {
    setError(null);
    setMessage(null);
    const payload: QuantityTemplateInput = { name, isDefault, tiers };
    const response = await fetch(editingId ? `/api/quantity-templates/${editingId}` : "/api/quantity-templates", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "保存数量模板失败。");
    }

    await refreshItems();
    setMessage(editingId ? "数量模板已更新。" : "数量模板已创建。");
    resetForm();
  }

  async function remove(item: QuantityTemplateRecord) {
    if (item.is_seeded) {
      return;
    }
    const response = await fetch(`/api/quantity-templates/${item.id}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "删除数量模板失败。");
    }
    await refreshItems();
    setMessage("数量模板已删除。");
    if (editingId === item.id) {
      resetForm();
    }
  }

  return (
    <div className="grid-2">
      <section className="panel">
        <div className="hero">
          <h1>数量模板</h1>
          <p>维护 Matrixify 导出时的 Quantity variants。系统预置模板只读，自定义模板支持设为默认并做单商品微调。</p>
        </div>
        <div className="field">
          <label>模板名称</label>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <label className="toggle-row helper">
          <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />
          设为我的默认数量模板
        </label>
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
              {tiers.map((tier, index) => (
                <tr key={`${tier.optionValue}-${index}`}>
                  <td style={{ padding: "8px 0" }}>
                    <input value={tier.optionValue} onChange={(event) => updateTier(index, "optionValue", event.target.value)} />
                  </td>
                  <td>
                    <input type="number" step="0.01" value={tier.price} onChange={(event) => updateTier(index, "price", event.target.value)} />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={tier.compareAtPrice}
                      onChange={(event) => updateTier(index, "compareAtPrice", event.target.value)}
                    />
                  </td>
                  <td>
                    <input type="number" value={tier.inventoryQty} onChange={(event) => updateTier(index, "inventoryQty", event.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="button-row">
          <button
            type="button"
            className="primary-button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await submit().catch((submitError) => setError(sanitizeError(submitError, "保存数量模板失败。")));
              })
            }
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

      <section className="panel">
        <div className="split-header">
          <h2>已有数量模板</h2>
          <Link href="/export-to-sheets" className="ghost-button">
            返回导出页
          </Link>
        </div>
        <ListControls
          searchValue={query}
          onSearchChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          searchPlaceholder="按模板名搜索"
          filterValue={filter}
          filterOptions={[
            { value: "all", label: "全部模板" },
            { value: "seeded", label: "系统模板" },
            { value: "custom", label: "自定义模板" },
            { value: "default", label: "仅默认" },
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
        {pagedItems.items.length === 0 ? <div className="empty-state">还没有数量模板。</div> : null}
        <div className="stack">
          {pagedItems.items.map((item) => (
            <article key={item.id} className="list-card">
              <header>
                <div>
                  <strong>{item.name}</strong>
                  <div className="subtle">
                    {item.is_seeded ? "系统模板" : "自定义模板"}
                    {item.is_default ? " · 默认" : ""}
                  </div>
                </div>
              </header>
              <div className="helper">
                {item.tiers_json.map((tier) => `${tier.optionValue} / $${tier.price.toFixed(2)}`).join(" · ")}
              </div>
              {!item.is_seeded ? (
                <div className="button-row">
                  <button type="button" className="ghost-button" onClick={() => loadForEdit(item)}>
                    编辑
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() =>
                      startTransition(async () => {
                        await remove(item).catch((removeError) => setError(sanitizeError(removeError, "删除数量模板失败。")));
                      })
                    }
                  >
                    删除
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
