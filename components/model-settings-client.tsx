"use client";

import { useMemo, useState, useTransition } from "react";
import { ListControls } from "@/components/list-controls";
import type {
  ImageModelConfigRecord,
  ModelConfigRecord,
  Provider,
  ImageProvider,
} from "@/lib/types/domain";
import { normalizeSearchQuery, paginateItems } from "@/utils/pagination";

type SafeTextModelConfig = Omit<ModelConfigRecord, "api_key_encrypted">;
type SafeImageModelConfig = Omit<ImageModelConfigRecord, "api_key_encrypted">;

type ModelSettingsClientProps = {
  initialTextModels: SafeTextModelConfig[];
  initialImageModels: SafeImageModelConfig[];
  suggestedTextModel: string;
  suggestedImageModel: string;
  suggestedBaseUrl: string;
};

function sanitizeError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function ModelSettingsClient({
  initialTextModels,
  initialImageModels,
  suggestedTextModel,
  suggestedImageModel,
  suggestedBaseUrl,
}: ModelSettingsClientProps) {
  const [textItems, setTextItems] = useState(initialTextModels);
  const [imageItems, setImageItems] = useState(initialImageModels);
  const [textEditingId, setTextEditingId] = useState<string | null>(null);
  const [imageEditingId, setImageEditingId] = useState<string | null>(null);
  const [textName, setTextName] = useState("");
  const [imageName, setImageName] = useState("");
  const [textModel, setTextModel] = useState(suggestedTextModel);
  const [imageModel, setImageModel] = useState(suggestedImageModel);
  const [textBaseUrl, setTextBaseUrl] = useState(suggestedBaseUrl);
  const [imageBaseUrl, setImageBaseUrl] = useState(suggestedBaseUrl);
  const [textApiKey, setTextApiKey] = useState("");
  const [imageApiKey, setImageApiKey] = useState("");
  const [textIsDefault, setTextIsDefault] = useState(false);
  const [imageIsDefault, setImageIsDefault] = useState(false);
  const [textMessage, setTextMessage] = useState<string | null>(null);
  const [imageMessage, setImageMessage] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [textQuery, setTextQuery] = useState("");
  const [imageQuery, setImageQuery] = useState("");
  const [textFilter, setTextFilter] = useState("all");
  const [imageFilter, setImageFilter] = useState("all");
  const [textPageSize, setTextPageSize] = useState(10);
  const [imagePageSize, setImagePageSize] = useState(10);
  const [textPage, setTextPage] = useState(1);
  const [imagePage, setImagePage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const textProvider: Provider = "openai";
  const imageProvider: ImageProvider = "openai";

  const filteredTextItems = useMemo(() => {
    const query = normalizeSearchQuery(textQuery);
    return textItems.filter((item) => {
      if (textFilter === "default" && !item.is_default) return false;
      if (textFilter === "non_default" && item.is_default) return false;
      if (!query) return true;
      return [item.name, item.model, item.base_url ?? ""].some((value) =>
        value.toLowerCase().includes(query),
      );
    });
  }, [textFilter, textItems, textQuery]);

  const filteredImageItems = useMemo(() => {
    const query = normalizeSearchQuery(imageQuery);
    return imageItems.filter((item) => {
      if (imageFilter === "default" && !item.is_default) return false;
      if (imageFilter === "non_default" && item.is_default) return false;
      if (!query) return true;
      return [item.name, item.model, item.base_url ?? ""].some((value) =>
        value.toLowerCase().includes(query),
      );
    });
  }, [imageFilter, imageItems, imageQuery]);

  const pagedTextItems = useMemo(
    () => paginateItems(filteredTextItems, textPage, textPageSize),
    [filteredTextItems, textPage, textPageSize],
  );
  const pagedImageItems = useMemo(
    () => paginateItems(filteredImageItems, imagePage, imagePageSize),
    [filteredImageItems, imagePage, imagePageSize],
  );

  const resetTextForm = () => {
    setTextEditingId(null);
    setTextName("");
    setTextModel(suggestedTextModel);
    setTextBaseUrl(suggestedBaseUrl);
    setTextApiKey("");
    setTextIsDefault(false);
  };

  const resetImageForm = () => {
    setImageEditingId(null);
    setImageName("");
    setImageModel(suggestedImageModel);
    setImageBaseUrl(suggestedBaseUrl);
    setImageApiKey("");
    setImageIsDefault(false);
  };

  async function refreshTextItems() {
    const response = await fetch("/api/models");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "刷新文本模型配置失败。");
    }

    setTextItems(data.items);
  }

  async function refreshImageItems() {
    const response = await fetch("/api/image-models");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "刷新图片模型配置失败。");
    }

    setImageItems(data.items);
  }

  async function submitText(testOnly = false) {
    setTextMessage(null);
    setTextError(null);

    const payload = {
      name: textName,
      provider: textProvider,
      model: textModel,
      baseUrl: textBaseUrl,
      apiKey: textApiKey,
      isDefault: textIsDefault,
    };
    const url = testOnly ? "/api/models/test" : textEditingId ? `/api/models/${textEditingId}` : "/api/models";
    const method = testOnly ? "POST" : textEditingId ? "PATCH" : "POST";
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "文本模型操作失败。");
    }

    if (testOnly) {
      setTextMessage("文本模型连接测试成功，可以保存配置。");
      return;
    }

    await refreshTextItems();
    setTextMessage(textEditingId ? "文本模型配置已更新。" : "文本模型配置已创建。");
    resetTextForm();
  }

  async function submitImage(testOnly = false) {
    setImageMessage(null);
    setImageError(null);

    const payload = {
      name: imageName,
      provider: imageProvider,
      model: imageModel,
      baseUrl: imageBaseUrl,
      apiKey: imageApiKey,
      isDefault: imageIsDefault,
    };
    const url = testOnly
      ? "/api/image-models/test"
      : imageEditingId
        ? `/api/image-models/${imageEditingId}`
        : "/api/image-models";
    const method = testOnly ? "POST" : imageEditingId ? "PATCH" : "POST";
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "图片模型操作失败。");
    }

    if (testOnly) {
      setImageMessage("图片模型连接测试成功，可以保存配置。");
      return;
    }

    await refreshImageItems();
    setImageMessage(imageEditingId ? "图片模型配置已更新。" : "图片模型配置已创建。");
    resetImageForm();
  }

  return (
    <div className="stack">
      <div className="grid-2">
        <section className="panel">
          <div className="hero">
            <h1>文本模型配置</h1>
            <p>用于固定 Schema 文本提取。保存前会执行真实连接测试，API Key 仅在服务端加密保存。</p>
          </div>
          <div className="field">
            <label htmlFor="textModelName">名称</label>
            <input id="textModelName" value={textName} onChange={(event) => setTextName(event.target.value)} />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="textProvider">Provider</label>
              <select id="textProvider" value={textProvider} disabled>
                <option value="openai">OpenAI Compatible</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="textModel">Model</label>
              <input id="textModel" value={textModel} onChange={(event) => setTextModel(event.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="textBaseUrl">Base URL</label>
            <input
              id="textBaseUrl"
              placeholder="https://your-proxy.example.com/v1"
              value={textBaseUrl}
              onChange={(event) => setTextBaseUrl(event.target.value)}
            />
          </div>
          <p className="helper">Base URL 请填到 `/v1` 这一层，不要填完整的接口路径。</p>
          <p className="helper">当前建议模型：`{suggestedTextModel}`</p>
          <div className="field">
            <label htmlFor="textApiKey">{textEditingId ? "API Key（留空表示沿用旧值）" : "API Key"}</label>
            <input
              id="textApiKey"
              type="password"
              value={textApiKey}
              onChange={(event) => setTextApiKey(event.target.value)}
            />
          </div>
          <label className="helper toggle-row">
            <input
              type="checkbox"
              checked={textIsDefault}
              onChange={(event) => setTextIsDefault(event.target.checked)}
            />
            设为默认文本模型
          </label>
          <div className="button-row">
            <button
              type="button"
              className="ghost-button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () =>
                  submitText(true).catch((error) =>
                    setTextError(sanitizeError(error, "文本模型连接测试失败。")),
                  ),
                )
              }
            >
              测试连接
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () =>
                  submitText(false).catch((error) =>
                    setTextError(sanitizeError(error, "文本模型保存失败。")),
                  ),
                )
              }
            >
              {textEditingId ? "更新配置" : "保存配置"}
            </button>
            {textEditingId ? (
              <button type="button" className="ghost-button" onClick={resetTextForm}>
                取消编辑
              </button>
            ) : null}
          </div>
          {textMessage ? <p className="helper">{textMessage}</p> : null}
          {textError ? <p className="error-text">{textError}</p> : null}
        </section>

        <section className="panel">
          <h2>已有文本模型</h2>
          <ListControls
            searchValue={textQuery}
            onSearchChange={(value) => {
              setTextQuery(value);
              setTextPage(1);
            }}
            searchPlaceholder="按名称、模型、Base URL 搜索"
            filterValue={textFilter}
            filterOptions={[
              { value: "all", label: "全部模型" },
              { value: "default", label: "仅默认" },
              { value: "non_default", label: "仅非默认" },
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
          <div className="stack">
            {pagedTextItems.totalItems === 0 ? <div className="empty-state">还没有文本模型配置。</div> : null}
            {pagedTextItems.items.map((item) => (
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
                      setTextEditingId(item.id);
                      setTextName(item.name);
                      setTextModel(item.model);
                      setTextBaseUrl(item.base_url ?? "");
                      setTextApiKey("");
                      setTextIsDefault(item.is_default);
                      setTextError(null);
                      setTextMessage(null);
                    }}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() =>
                      startTransition(async () => {
                        setTextError(null);
                        const response = await fetch(`/api/models/${item.id}`, { method: "DELETE" });
                        const data = await response.json();

                        if (!response.ok) {
                          setTextError(data.error ?? "删除文本模型失败。");
                          return;
                        }

                        await refreshTextItems();
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

      <div className="grid-2">
        <section className="panel">
          <div className="hero">
            <h2>图片模型配置</h2>
            <p>用于图片生成模块。字段沿用文本模型配置结构，当前首版开放 OpenAI 兼容图片接口。</p>
          </div>
          <div className="field">
            <label htmlFor="imageModelName">名称</label>
            <input id="imageModelName" value={imageName} onChange={(event) => setImageName(event.target.value)} />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="imageProvider">Provider</label>
              <select id="imageProvider" value={imageProvider} disabled>
                <option value="openai">OpenAI Compatible</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="imageModel">Model</label>
              <input id="imageModel" value={imageModel} onChange={(event) => setImageModel(event.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="imageBaseUrl">Base URL</label>
            <input
              id="imageBaseUrl"
              placeholder="https://your-proxy.example.com/v1"
              value={imageBaseUrl}
              onChange={(event) => setImageBaseUrl(event.target.value)}
            />
          </div>
          <p className="helper">图片接口默认访问 `/images/generations`，Base URL 也请填到 `/v1` 层。</p>
          <p className="helper">当前建议模型：`{suggestedImageModel}`</p>
          <div className="field">
            <label htmlFor="imageApiKey">{imageEditingId ? "API Key（留空表示沿用旧值）" : "API Key"}</label>
            <input
              id="imageApiKey"
              type="password"
              value={imageApiKey}
              onChange={(event) => setImageApiKey(event.target.value)}
            />
          </div>
          <label className="helper toggle-row">
            <input
              type="checkbox"
              checked={imageIsDefault}
              onChange={(event) => setImageIsDefault(event.target.checked)}
            />
            设为默认图片模型
          </label>
          <div className="button-row">
            <button
              type="button"
              className="ghost-button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () =>
                  submitImage(true).catch((error) =>
                    setImageError(sanitizeError(error, "图片模型连接测试失败。")),
                  ),
                )
              }
            >
              测试连接
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () =>
                  submitImage(false).catch((error) =>
                    setImageError(sanitizeError(error, "图片模型保存失败。")),
                  ),
                )
              }
            >
              {imageEditingId ? "更新配置" : "保存配置"}
            </button>
            {imageEditingId ? (
              <button type="button" className="ghost-button" onClick={resetImageForm}>
                取消编辑
              </button>
            ) : null}
          </div>
          {imageMessage ? <p className="helper">{imageMessage}</p> : null}
          {imageError ? <p className="error-text">{imageError}</p> : null}
        </section>

        <section className="panel">
          <h2>已有图片模型</h2>
          <ListControls
            searchValue={imageQuery}
            onSearchChange={(value) => {
              setImageQuery(value);
              setImagePage(1);
            }}
            searchPlaceholder="按名称、模型、Base URL 搜索"
            filterValue={imageFilter}
            filterOptions={[
              { value: "all", label: "全部模型" },
              { value: "default", label: "仅默认" },
              { value: "non_default", label: "仅非默认" },
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
          <div className="stack">
            {pagedImageItems.totalItems === 0 ? <div className="empty-state">还没有图片模型配置。</div> : null}
            {pagedImageItems.items.map((item) => (
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
                      setImageEditingId(item.id);
                      setImageName(item.name);
                      setImageModel(item.model);
                      setImageBaseUrl(item.base_url ?? "");
                      setImageApiKey("");
                      setImageIsDefault(item.is_default);
                      setImageError(null);
                      setImageMessage(null);
                    }}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() =>
                      startTransition(async () => {
                        setImageError(null);
                        const response = await fetch(`/api/image-models/${item.id}`, { method: "DELETE" });
                        const data = await response.json();

                        if (!response.ok) {
                          setImageError(data.error ?? "删除图片模型失败。");
                          return;
                        }

                        await refreshImageItems();
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
    </div>
  );
}
