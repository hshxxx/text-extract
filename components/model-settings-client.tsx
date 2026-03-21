"use client";

import { useState, useTransition } from "react";
import type { ModelConfigRecord, Provider } from "@/lib/types/domain";

type SafeModelConfig = Omit<ModelConfigRecord, "api_key_encrypted">;

type ModelSettingsClientProps = {
  initialItems: SafeModelConfig[];
  suggestedModel: string;
  suggestedBaseUrl: string;
};

export function ModelSettingsClient({
  initialItems,
  suggestedModel,
  suggestedBaseUrl,
}: ModelSettingsClientProps) {
  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [model, setModel] = useState(suggestedModel);
  const [baseUrl, setBaseUrl] = useState(suggestedBaseUrl);
  const [apiKey, setApiKey] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const provider: Provider = "openai";

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setModel(suggestedModel);
    setBaseUrl(suggestedBaseUrl);
    setApiKey("");
    setIsDefault(false);
  };

  async function refreshItems() {
    const response = await fetch("/api/models");
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "刷新模型配置失败。");
    }
    setItems(data.items);
  }

  async function submit(testOnly = false) {
    setMessage(null);
    setError(null);
    const payload = { name, provider, model, baseUrl, apiKey, isDefault };
    const url = testOnly ? "/api/models/test" : editingId ? `/api/models/${editingId}` : "/api/models";
    const method = testOnly ? "POST" : editingId ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "操作失败。");
    }

    if (testOnly) {
      setMessage("连接测试成功，可以保存配置。");
      return;
    }

    await refreshItems();
    setMessage(editingId ? "模型配置已更新。" : "模型配置已创建。");
    resetForm();
  }

  return (
    <div className="grid-2">
      <section className="panel">
        <div className="hero">
          <h1>OpenAI 兼容模型配置</h1>
          <p>支持 OpenAI 官方接口和中转站。保存前会执行真实连接测试，API Key 仅在服务端加密保存。</p>
        </div>
        <div className="field">
          <label htmlFor="modelName">名称</label>
          <input id="modelName" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="provider">Provider</label>
            <select id="provider" value={provider} disabled>
              <option value="openai">OpenAI Compatible</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="model">Model</label>
            <input id="model" value={model} onChange={(event) => setModel(event.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="baseUrl">Base URL</label>
          <input
            id="baseUrl"
            placeholder="https://your-proxy.example.com/v1"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
          />
        </div>
        <p className="helper">Base URL 请填到 `/v1` 这一层，不要填完整的 `/chat/completions`。</p>
        <p className="helper">当前建议模型：`{suggestedModel}`</p>
        <div className="field">
          <label htmlFor="apiKey">{editingId ? "API Key（留空表示沿用旧值）" : "API Key"}</label>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
        </div>
        <label className="helper" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
          <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />
          设为默认模型
        </label>
        <div className="button-row">
          <button
            type="button"
            className="ghost-button"
            disabled={isPending}
            onClick={() => startTransition(async () => submit(true).catch((err) => setError(err.message)))}
          >
            测试连接
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={isPending}
            onClick={() => startTransition(async () => submit(false).catch((err) => setError(err.message)))}
          >
            {editingId ? "更新配置" : "保存配置"}
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
        <h2>已有配置</h2>
        <div className="stack">
          {items.length === 0 ? <div className="empty-state">还没有模型配置。</div> : null}
          {items.map((item) => (
            <article key={item.id} className="list-card">
              <header>
                <div>
                  <strong>{item.name}</strong>
                  <div className="subtle">
                    {item.provider} · {item.model}
                  </div>
                </div>
                {item.is_default ? <span className="badge">默认</span> : null}
              </header>
              <div className="button-row">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    setEditingId(item.id);
                    setName(item.name);
                    setModel(item.model);
                    setBaseUrl(item.base_url ?? "");
                    setApiKey("");
                    setIsDefault(item.is_default);
                    setError(null);
                    setMessage(null);
                  }}
                >
                  编辑
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() =>
                    startTransition(async () => {
                      setError(null);
                      const response = await fetch(`/api/models/${item.id}`, { method: "DELETE" });
                      const data = await response.json();
                      if (!response.ok) {
                        setError(data.error ?? "删除失败。");
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
      </section>
    </div>
  );
}
