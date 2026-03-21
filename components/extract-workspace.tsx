"use client";

import { useMemo, useState, useTransition } from "react";
import type { ExtractionResponse, ModelConfigRecord, StructuredData, TemplateRecord } from "@/lib/types/domain";
import { FIXED_SCHEMA_FIELDS } from "@/lib/types/domain";
import { MAX_INPUT_LENGTH } from "@/utils/constants";

type ExtractWorkspaceProps = {
  models: Array<Omit<ModelConfigRecord, "api_key_encrypted">>;
  templates: TemplateRecord[];
};

export function ExtractWorkspace({ models, templates }: ExtractWorkspaceProps) {
  const defaultModelId = useMemo(
    () => models.find((item) => item.is_default)?.id ?? models[0]?.id ?? "",
    [models],
  );
  const defaultTemplateId = useMemo(
    () => templates.find((item) => item.is_default)?.id ?? templates[0]?.id ?? "",
    [templates],
  );

  const [rawInput, setRawInput] = useState("");
  const [modelConfigId, setModelConfigId] = useState(defaultModelId);
  const [templateId, setTemplateId] = useState(defaultTemplateId);
  const [result, setResult] = useState<ExtractionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid-2">
      <section className="panel hero-card">
        <div className="hero">
          <h1>固定 Schema 文本解析</h1>
          <p>输入原始需求，系统将提取 7 个标准字段，再按模板渲染最终 Prompt。</p>
        </div>
        {models.length === 0 ? (
          <div className="empty-state">请先到模型配置页添加 OpenAI 兼容模型配置。</div>
        ) : null}
        {templates.length === 0 ? (
          <div className="empty-state">请先到模板管理页创建模板。</div>
        ) : null}
        <div className="field">
          <label htmlFor="rawInput">待解析文本</label>
          <textarea
            id="rawInput"
            maxLength={MAX_INPUT_LENGTH}
            placeholder="例如：设计一枚以丝绸之路为主题的纪念币，正面要有骆驼和商队，背面体现古城门..."
            value={rawInput}
            onChange={(event) => setRawInput(event.target.value)}
          />
          <span className="helper">
            {rawInput.length}/{MAX_INPUT_LENGTH}
          </span>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="modelConfigId">模型配置</label>
            <select
              id="modelConfigId"
              value={modelConfigId}
              onChange={(event) => setModelConfigId(event.target.value)}
            >
              {models.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.model}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="templateId">模板</label>
            <select id="templateId" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
              {templates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="button-row">
          <button
            type="button"
            className="primary-button"
            disabled={isPending || !modelConfigId || !templateId}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                setResult(null);

                const response = await fetch("/api/extract", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    rawInput,
                    modelConfigId,
                    templateId,
                  }),
                });

                const data = (await response.json()) as ExtractionResponse & { error?: string };

                if (!response.ok) {
                  setError(data.error ?? data.errorMessage ?? "生成失败。");
                  return;
                }

                if (data.status === "failed") {
                  setError(data.errorMessage ?? "生成失败。");
                }

                setResult(data);
              })
            }
          >
            {isPending ? "生成中..." : "开始生成"}
          </button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="stack">
        <div className="panel">
          <div className="split-header">
            <div>
              <h2>结构化字段</h2>
              <p className="subtle">固定输出字段共 7 项。</p>
            </div>
            {result?.status ? (
              <span className={`status ${result.status === "success" ? "status-success" : "status-failed"}`}>
                {result.status === "success" ? "成功" : "失败"}
              </span>
            ) : null}
          </div>
          {result?.structuredData ? (
            <div className="data-grid">
              {FIXED_SCHEMA_FIELDS.map((field) => (
                <div key={field} className="data-item">
                  <strong>{field}</strong>
                  <div>{(result.structuredData as StructuredData)[field] || "空字符串"}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">生成后会在这里展示结构化字段结果。</div>
          )}
        </div>
        <div className="panel">
          <h2>最终 Prompt</h2>
          {result?.finalPrompt ? (
            <div className="mono-block">{result.finalPrompt}</div>
          ) : (
            <div className="empty-state">生成后会在这里展示最终 Prompt。</div>
          )}
        </div>
        <div className="panel">
          <h2>原始模型输出</h2>
          {result?.rawModelOutput ? (
            <div className="mono-block">{result.rawModelOutput}</div>
          ) : (
            <div className="empty-state">便于排查 JSON 修复与字段校验问题。</div>
          )}
        </div>
      </section>
    </div>
  );
}
