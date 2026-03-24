"use client";

import { useMemo, useState, useTransition } from "react";
import { ListControls } from "@/components/list-controls";
import type {
  EditHistoryDetail,
  EditHistoryItem,
  ExportHistoryDetail,
  ExportHistoryItem,
  ExtractionJobRecord,
  ImageHistoryDetail,
  ImageHistoryItem,
  MarketingCopyHistoryItem,
  MarketingCopyVersionDetail,
} from "@/lib/types/domain";
import { normalizeSearchQuery, paginateItems } from "@/utils/pagination";

type HistoryClientProps = {
  initialTextItems: ExtractionJobRecord[];
  initialImageItems: ImageHistoryItem[];
  initialEditItems: EditHistoryItem[];
  initialMarketingItems: MarketingCopyHistoryItem[];
  initialExportItems: ExportHistoryItem[];
};

export function HistoryClient({
  initialTextItems,
  initialImageItems,
  initialEditItems,
  initialMarketingItems,
  initialExportItems,
}: HistoryClientProps) {
  const [activeTab, setActiveTab] = useState<"text" | "image" | "edit" | "marketing" | "export">("text");
  const [textItems] = useState(initialTextItems);
  const [imageItems] = useState(initialImageItems);
  const [editItems] = useState(initialEditItems);
  const [marketingItems] = useState(initialMarketingItems);
  const [selectedText, setSelectedText] = useState<ExtractionJobRecord | null>(initialTextItems[0] ?? null);
  const [selectedImage, setSelectedImage] = useState<ImageHistoryDetail | null>(null);
  const [selectedEdit, setSelectedEdit] = useState<EditHistoryDetail | null>(null);
  const [selectedMarketing, setSelectedMarketing] = useState<MarketingCopyVersionDetail | null>(null);
  const [selectedExport, setSelectedExport] = useState<ExportHistoryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [textQuery, setTextQuery] = useState("");
  const [imageQuery, setImageQuery] = useState("");
  const [editQuery, setEditQuery] = useState("");
  const [marketingQuery, setMarketingQuery] = useState("");
  const [exportQuery, setExportQuery] = useState("");
  const [textFilter, setTextFilter] = useState("all");
  const [imageFilter, setImageFilter] = useState("all");
  const [editFilter, setEditFilter] = useState("all");
  const [marketingFilter, setMarketingFilter] = useState("all");
  const [exportFilter, setExportFilter] = useState("all");
  const [textPageSize, setTextPageSize] = useState(10);
  const [imagePageSize, setImagePageSize] = useState(10);
  const [editPageSize, setEditPageSize] = useState(10);
  const [marketingPageSize, setMarketingPageSize] = useState(10);
  const [exportPageSize, setExportPageSize] = useState(10);
  const [textPage, setTextPage] = useState(1);
  const [imagePage, setImagePage] = useState(1);
  const [editPage, setEditPage] = useState(1);
  const [marketingPage, setMarketingPage] = useState(1);
  const [exportPage, setExportPage] = useState(1);
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
      if (
        editFilter === "processing" &&
        !(
          item.status.startsWith("editing_") ||
          item.status === "uploading" ||
          item.status === "splitting" ||
          item.status === "trimming" ||
          item.status === "validating"
        )
      ) {
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

  const filteredMarketingItems = useMemo(() => {
    const query = normalizeSearchQuery(marketingQuery);
    return marketingItems.filter((item) => {
      if (marketingFilter === "confirmed" && !item.isConfirmed) return false;
      if (marketingFilter === "draft" && item.isConfirmed) return false;
      if (!query) return true;
      return [
        item.versionId,
        item.sourceImageId,
        item.templateName,
        item.createdAt,
        item.finalResult?.shopify.title.cn ?? "",
        item.finalResult?.shopify.title.en ?? "",
        item.draftResult.shopify.title.cn,
        item.draftResult.shopify.title.en,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [marketingFilter, marketingItems, marketingQuery]);

  const filteredExportItems = useMemo(() => {
    const query = normalizeSearchQuery(exportQuery);
    return exportItems.filter((item) => {
      if (exportFilter === "single" && item.productCount !== 1) return false;
      if (exportFilter === "multiple" && item.productCount <= 1) return false;
      if (!query) return true;
      return [
        item.batchId,
        item.batchName,
        item.sheetUrl,
        item.productCount.toString(),
        item.createdAt,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [exportFilter, exportItems, exportQuery]);

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
  const pagedMarketingItems = useMemo(
    () => paginateItems(filteredMarketingItems, marketingPage, marketingPageSize),
    [filteredMarketingItems, marketingPage, marketingPageSize],
  );
  const pagedExportItems = useMemo(
    () => paginateItems(filteredExportItems, exportPage, exportPageSize),
    [filteredExportItems, exportPage, exportPageSize],
  );

  async function openTextDetail(id: string) {
    setError(null);
    const response = await fetch(`/api/history/${id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "?????????????????????????????????");
    }

    setSelectedText(data.item);
  }

  async function openImageDetail(id: string) {
    setError(null);
    const response = await fetch(`/api/image-history/${id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "?????????????????????????????????");
    }

    setSelectedImage(data.item);
  }

  async function openEditDetail(id: string) {
    setError(null);
    const response = await fetch(`/api/edit-history/${id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "?????????????????????????????????");
    }

    setSelectedEdit(data.item as EditHistoryDetail);
  }

  async function openMarketingDetail(id: string) {
    setError(null);
    const response = await fetch(`/api/marketing-copy/history/${id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "?????????????????????????????????");
    }

    setSelectedMarketing(data.item as MarketingCopyVersionDetail);
  }

  async function openExportDetail(id: string) {
    setError(null);
    const response = await fetch(`/api/export/history/${id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "?????????????????????????????????");
    }

    setSelectedExport(data.item as ExportHistoryDetail);
  }

  const activeMarketingResult =
    selectedMarketing?.version.final_result_json ?? selectedMarketing?.version.draft_result_json ?? null;

  return (
    <div className="grid-2">
      <section className="panel">
        <div className="hero">
          <h1>????????????</h1>
          <p>????????????????????????????????????????????????????????????????????????????????????????????????</p>
        </div>
        <div className="tab-row" style={{ marginBottom: 16 }}>
          <button type="button" className={activeTab === "text" ? "nav-link-active" : "nav-link"} onClick={() => setActiveTab("text")}>
            ????????????
          </button>
          <button type="button" className={activeTab === "image" ? "nav-link-active" : "nav-link"} onClick={() => setActiveTab("image")}>
            ????????????
          </button>
          <button type="button" className={activeTab === "edit" ? "nav-link-active" : "nav-link"} onClick={() => setActiveTab("edit")}>
            ????????????
          </button>
          <button type="button" className={activeTab === "marketing" ? "nav-link-active" : "nav-link"} onClick={() => setActiveTab("marketing")}>
            ????????????
          </button>
          <button type="button" className={activeTab === "export" ? "nav-link-active" : "nav-link"} onClick={() => setActiveTab("export")}>
            ?????? Sheets
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
              searchPlaceholder="??????????????????Prompt???????????????"
              filterValue={textFilter}
              filterOptions={[
                { value: "all", label: "????????????" },
                { value: "success", label: "??????" },
                { value: "failed", label: "??????" },
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
            {pagedTextItems.totalItems === 0 ? <div className="empty-state">????????????????????????????????????</div> : null}
            {pagedTextItems.items.map((item) => (
              <article key={item.id} className="list-card">
                <header>
                  <div>
                    <strong>{new Date(item.created_at).toLocaleString("zh-CN")}</strong>
                    <div className="subtle">{item.raw_input.slice(0, 72) || "?????????"}</div>
                  </div>
                  <span className={`status ${item.status === "success" ? "status-success" : "status-failed"}`}>{item.status}</span>
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
                          setError(detailError instanceof Error ? detailError.message : "?????????????????????????????????");
                        }
                      })
                    }
                  >
                    ????????????
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
              searchPlaceholder="??? Prompt??????????????????????????? ID ??????"
              filterValue={imageFilter}
              filterOptions={[
                { value: "all", label: "????????????" },
                { value: "success", label: "??????" },
                { value: "failed", label: "??????" },
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
            {pagedImageItems.totalItems === 0 ? <div className="empty-state">????????????????????????????????????</div> : null}
            {pagedImageItems.items.map((item) => (
              <article key={item.taskId} className="list-card">
                <header>
                  <div>
                    <strong>{new Date(item.createdAt).toLocaleString("zh-CN")}</strong>
                    <div className="subtle">{item.modelName} ?? {item.imageSize}</div>
                  </div>
                  <span className={`status ${item.status === "success" ? "status-success" : "status-failed"}`}>{item.status}</span>
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
                          setError(detailError instanceof Error ? detailError.message : "?????????????????????????????????");
                        }
                      })
                    }
                  >
                    ????????????
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : activeTab === "edit" ? (
          <div className="stack">
            <ListControls
              searchValue={editQuery}
              onSearchChange={(value) => {
                setEditQuery(value);
                setEditPage(1);
              }}
              searchPlaceholder="????????? ID??????????????????????????????"
              filterValue={editFilter}
              filterOptions={[
                { value: "all", label: "????????????" },
                { value: "completed", label: "?????????" },
                { value: "partial_success", label: "????????????" },
                { value: "failed", label: "??????" },
                { value: "processing", label: "?????????" },
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
            {pagedEditItems.totalItems === 0 ? <div className="empty-state">????????????????????????????????????</div> : null}
            {pagedEditItems.items.map((item) => (
              <article key={item.taskId} className="list-card">
                <header>
                  <div>
                    <strong>{new Date(item.createdAt).toLocaleString("zh-CN")}</strong>
                    <div className="subtle">Front: {item.frontStatus ?? "?????????"} ?? Back: {item.backStatus ?? "?????????"}</div>
                  </div>
                  <span className="status">{item.status}</span>
                </header>
                <div className="grid-2" style={{ marginTop: 12 }}>
                  <div className="history-image-thumb">
                    {item.frontImage ? <img src={item.frontImage} alt="front edited history" className="generated-image" /> : <div className="empty-state">?????? Front</div>}
                  </div>
                  <div className="history-image-thumb">
                    {item.backImage ? <img src={item.backImage} alt="back edited history" className="generated-image" /> : <div className="empty-state">?????? Back</div>}
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
                          setError(detailError instanceof Error ? detailError.message : "?????????????????????????????????");
                        }
                      })
                    }
                  >
                    ????????????
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : activeTab === "marketing" ? (
          <div className="stack">
            <ListControls
              searchValue={marketingQuery}
              onSearchChange={(value) => {
                setMarketingQuery(value);
                setMarketingPage(1);
              }}
              searchPlaceholder="?????????????????????????????????????????? ID ??????"
              filterValue={marketingFilter}
              filterOptions={[
                { value: "all", label: "????????????" },
                { value: "confirmed", label: "??? confirmed" },
                { value: "draft", label: "?????? confirmed" },
              ]}
              onFilterChange={(value) => {
                setMarketingFilter(value);
                setMarketingPage(1);
              }}
              pageSize={marketingPageSize}
              onPageSizeChange={(value) => {
                setMarketingPageSize(value);
                setMarketingPage(1);
              }}
              currentPage={pagedMarketingItems.currentPage}
              totalPages={pagedMarketingItems.totalPages}
              totalItems={pagedMarketingItems.totalItems}
              onPrevPage={() => setMarketingPage((current) => current - 1)}
              onNextPage={() => setMarketingPage((current) => current + 1)}
            />
            {pagedMarketingItems.totalItems === 0 ? <div className="empty-state">??????????????????????????????</div> : null}
            {pagedMarketingItems.items.map((item) => (
              <article key={item.versionId} className="list-card">
                <header>
                  <div>
                    <strong>{new Date(item.createdAt).toLocaleString("zh-CN")}</strong>
                    <div className="subtle">{item.templateName}</div>
                  </div>
                  <span className="badge">{item.isConfirmed ? "Confirmed" : "Draft"}</span>
                </header>
                <p className="subtle">
                  {item.finalResult?.shopify.title.cn ||
                    item.finalResult?.shopify.title.en ||
                    item.draftResult.shopify.title.cn ||
                    item.draftResult.shopify.title.en ||
                    "?????????????????????"}
                </p>
                <div className="grid-2" style={{ marginTop: 12 }}>
                  <div className="history-image-thumb">
                    {item.frontImageUrl ? <img src={item.frontImageUrl} alt="marketing front" className="generated-image" /> : <div className="empty-state">?????? Front</div>}
                  </div>
                  <div className="history-image-thumb">
                    {item.backImageUrl ? <img src={item.backImageUrl} alt="marketing back" className="generated-image" /> : <div className="empty-state">?????? Back</div>}
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
                          await openMarketingDetail(item.versionId);
                        } catch (detailError) {
                          setError(detailError instanceof Error ? detailError.message : "?????????????????????????????????");
                        }
                      })
                    }
                  >
                    ????????????
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="stack">
            <ListControls
              searchValue={exportQuery}
              onSearchChange={(value) => {
                setExportQuery(value);
                setExportPage(1);
              }}
              searchPlaceholder="????????????????????? ID???sheet ????????????"
              filterValue={exportFilter}
              filterOptions={[
                { value: "all", label: "????????????" },
                { value: "single", label: "???????????????" },
                { value: "multiple", label: "???????????????" },
              ]}
              onFilterChange={(value) => {
                setExportFilter(value);
                setExportPage(1);
              }}
              pageSize={exportPageSize}
              onPageSizeChange={(value) => {
                setExportPageSize(value);
                setExportPage(1);
              }}
              currentPage={pagedExportItems.currentPage}
              totalPages={pagedExportItems.totalPages}
              totalItems={pagedExportItems.totalItems}
              onPrevPage={() => setExportPage((current) => current - 1)}
              onNextPage={() => setExportPage((current) => current + 1)}
            />
            {pagedExportItems.totalItems === 0 ? <div className="empty-state">?????????????????? Google Sheets ????????????</div> : null}
            {pagedExportItems.items.map((item) => (
              <article key={item.batchId} className="list-card">
                <header>
                  <div>
                    <strong>{item.batchName}</strong>
                    <div className="subtle">{new Date(item.createdAt).toLocaleString("zh-CN")}</div>
                  </div>
                  <span className="badge">{item.productCount} products</span>
                </header>
                <p className="subtle">{item.sheetUrl}</p>
                <div className="button-row">
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await openExportDetail(item.batchId);
                        } catch (detailError) {
                          setError(detailError instanceof Error ? detailError.message : "?????????????????????????????????");
                        }
                      })
                    }
                  >
                    ????????????
                  </button>
                  <a href={item.sheetUrl} target="_blank" rel="noreferrer" className="ghost-button">
                    ?????? Sheet
                  </a>
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
              <h2>??????????????????</h2>
              {selectedText ? (
                <>
                  <p className="subtle">
                    ?????????{selectedText.status} ?? {new Date(selectedText.created_at).toLocaleString("zh-CN")}
                  </p>
                  {selectedText.error_message ? <p className="error-text">{selectedText.error_message}</p> : null}
                </>
              ) : (
                <div className="empty-state">????????????????????????????????????????????????</div>
              )}
              {error ? <p className="error-text">{error}</p> : null}
            </div>
            <div className="panel">
              <h3>????????????</h3>
              {selectedText?.template_snapshot ? <div className="mono-block">{selectedText.template_snapshot}</div> : <div className="empty-state">?????????????????????</div>}
            </div>
            <div className="panel">
              <h3>???????????????</h3>
              {selectedText?.structured_data ? <div className="mono-block">{JSON.stringify(selectedText.structured_data, null, 2)}</div> : <div className="empty-state">????????????????????????????????????</div>}
            </div>
            <div className="panel">
              <h3>?????? Prompt</h3>
              {selectedText?.final_prompt ? <div className="mono-block">{selectedText.final_prompt}</div> : <div className="empty-state">?????????????????????????????? Prompt???</div>}
            </div>
            <div className="panel">
              <h3>??????????????????</h3>
              {selectedText?.raw_model_output ? <div className="mono-block">{selectedText.raw_model_output}</div> : <div className="empty-state">?????????????????????????????????????????????</div>}
            </div>
          </>
        ) : activeTab === "image" ? (
          <>
            <div className="panel">
              <h2>??????????????????</h2>
              {selectedImage ? (
                <>
                  <p className="subtle">
                    ?????????{selectedImage.task.status} ?? {new Date(selectedImage.task.created_at).toLocaleString("zh-CN")}
                  </p>
                  <p className="subtle">
                    ?????????????????????{selectedImage.task.extraction_job_id} ?? ?????????{selectedImage.modelName} ?? ?????????{selectedImage.task.image_size}
                  </p>
                  {selectedImage.task.error_message ? <p className="error-text">{selectedImage.task.error_message}</p> : null}
                </>
              ) : (
                <div className="empty-state">????????????????????????????????????????????????</div>
              )}
              {error ? <p className="error-text">{error}</p> : null}
            </div>
            <div className="panel">
              <h3>?????? Prompt</h3>
              {selectedImage?.sourcePrompt ? <div className="mono-block">{selectedImage.sourcePrompt}</div> : <div className="empty-state">???????????? Prompt???</div>}
            </div>
            <div className="panel">
              <h3>????????????</h3>
              {selectedImage?.result?.image_url ? (
                <div className="stack">
                  <div className="image-frame">
                    <img src={selectedImage.result.image_url} alt="generated history result" className="generated-image" />
                  </div>
                  <div className="button-row">
                    <a href={selectedImage.result.image_url} className="ghost-button" target="_blank" rel="noreferrer">
                      ????????????
                    </a>
                  </div>
                </div>
              ) : (
                <div className="empty-state">???????????????????????????????????????</div>
              )}
            </div>
            <div className="panel">
              <h3>???????????????</h3>
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
                <div className="empty-state">????????????????????????</div>
              )}
            </div>
          </>
        ) : activeTab === "edit" ? (
          <>
            <div className="panel">
              <h2>????????????????????????</h2>
              {selectedEdit ? (
                <>
                  <p className="subtle">
                    ?????????{selectedEdit.task.status} ?? {new Date(selectedEdit.task.created_at).toLocaleString("zh-CN")}
                  </p>
                  <p className="subtle">???????????????{selectedEdit.sourceImageId}</p>
                </>
              ) : (
                <div className="empty-state">??????????????????????????????????????????????????????</div>
              )}
              {error ? <p className="error-text">{error}</p> : null}
            </div>
            <div className="panel">
              <h3>Front Final</h3>
              {selectedEdit?.frontJob?.image_url ? <div className="image-frame"><img src={selectedEdit.frontJob.image_url} alt="front final history" className="generated-image" /></div> : <div className="empty-state">?????? Front Final???</div>}
            </div>
            <div className="panel">
              <h3>Back Final</h3>
              {selectedEdit?.backJob?.image_url ? <div className="image-frame"><img src={selectedEdit.backJob.image_url} alt="back final history" className="generated-image" /></div> : <div className="empty-state">?????? Back Final???</div>}
            </div>
            <div className="panel">
              <h3>????????????</h3>
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
                <div className="empty-state">???????????????????????????</div>
              )}
            </div>
          </>
        ) : activeTab === "marketing" ? (
          <>
            <div className="panel">
              <h2>??????????????????</h2>
              {selectedMarketing ? (
                <>
                  <p className="subtle">
                    ?????????{selectedMarketing.template?.name ?? "????????????"} ?? {new Date(selectedMarketing.version.created_at).toLocaleString("zh-CN")}
                  </p>
                  <p className="subtle">Confirmed???{selectedMarketing.version.is_confirmed ? "???" : "???"}</p>
                </>
              ) : (
                <div className="empty-state">????????????????????????????????????????????????</div>
              )}
              {error ? <p className="error-text">{error}</p> : null}
            </div>
            <div className="panel">
              <h3>????????????</h3>
              {selectedMarketing ? (
                <div className="grid-2">
                  <div className="history-image-thumb">
                    {selectedMarketing.frontImageUrl ? <img src={selectedMarketing.frontImageUrl} alt="marketing detail front" className="generated-image" /> : <div className="empty-state">?????? Front</div>}
                  </div>
                  <div className="history-image-thumb">
                    {selectedMarketing.backImageUrl ? <img src={selectedMarketing.backImageUrl} alt="marketing detail back" className="generated-image" /> : <div className="empty-state">?????? Back</div>}
                  </div>
                </div>
              ) : (
                <div className="empty-state">?????????????????????????????????</div>
              )}
            </div>
            <div className="panel">
              <h3>Shopify ??????</h3>
              {activeMarketingResult ? (
                <div className="mono-block">
                  {JSON.stringify(
                    {
                      shopify_title_en: activeMarketingResult.shopify.title.en,
                      shopify_title_cn: activeMarketingResult.shopify.title.cn,
                      shopify_subtitle_en: activeMarketingResult.shopify.subtitle.en,
                      shopify_subtitle_cn: activeMarketingResult.shopify.subtitle.cn,
                      facebook_headline_en: activeMarketingResult.facebook.headline.en,
                      facebook_headline_cn: activeMarketingResult.facebook.headline.cn,
                    },
                    null,
                    2,
                  )}
                </div>
              ) : (
                <div className="empty-state">?????????????????????????????????</div>
              )}
            </div>
            <div className="panel">
              <h3>Shopify Description EN / CN</h3>
              {activeMarketingResult ? (
                <div className="grid-2">
                  <pre className="code-block">{activeMarketingResult.shopify.description.en}</pre>
                  <pre className="code-block">{activeMarketingResult.shopify.description.cn}</pre>
                </div>
              ) : (
                <div className="empty-state">?????? Shopify ???????????????</div>
              )}
            </div>
            <div className="panel">
              <h3>Facebook Copy EN / CN</h3>
              {activeMarketingResult ? (
                <div className="grid-2">
                  <pre className="code-block">
                    {JSON.stringify(
                      {
                        primary_text: activeMarketingResult.facebook.primary_text.en,
                        headline: activeMarketingResult.facebook.headline.en,
                        description: activeMarketingResult.facebook.description.en,
                        cta_suggestion: activeMarketingResult.facebook.cta_suggestion.en,
                      },
                      null,
                      2,
                    )}
                  </pre>
                  <pre className="code-block">
                    {JSON.stringify(
                      {
                        primary_text: activeMarketingResult.facebook.primary_text.cn,
                        headline: activeMarketingResult.facebook.headline.cn,
                        description: activeMarketingResult.facebook.description.cn,
                        cta_suggestion: activeMarketingResult.facebook.cta_suggestion.cn,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>
              ) : (
                <div className="empty-state">?????? Facebook ???????????????</div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="panel">
              <h2>??????????????????</h2>
              {selectedExport ? (
                <>
                  <p className="subtle">
                    ?????????{selectedExport.batch.batch_name} ?? {new Date(selectedExport.batch.created_at).toLocaleString("zh-CN")}
                  </p>
                  <p className="subtle">????????????{selectedExport.batch.product_count}</p>
                  <div className="button-row" style={{ marginTop: 12 }}>
                    <a href={selectedExport.batch.sheet_url} target="_blank" rel="noreferrer" className="ghost-button">
                      ?????? Google Sheet
                    </a>
                  </div>
                </>
              ) : (
                <div className="empty-state">????????????????????????????????????????????????</div>
              )}
              {error ? <p className="error-text">{error}</p> : null}
            </div>
            <div className="panel">
              <h3>????????????</h3>
              {selectedExport ? (
                <div className="stack">
                  {selectedExport.products.map((item) => (
                    <article key={item.exportProductId} className="list-card">
                      <header>
                        <div>
                          <strong>{item.titleEn}</strong>
                          <div className="subtle">{item.handle} ?? {item.quantityTemplateName}</div>
                        </div>
                      </header>
                      <div className="grid-2" style={{ marginTop: 12 }}>
                        <div className="history-image-thumb">
                          {item.frontImageUrl ? <img src={item.frontImageUrl} alt="export front" className="generated-image" /> : <div className="empty-state">?????? Front</div>}
                        </div>
                        <div className="history-image-thumb">
                          {item.backImageUrl ? <img src={item.backImageUrl} alt="export back" className="generated-image" /> : <div className="empty-state">?????? Back</div>}
                        </div>
                      </div>
                      <div className="mono-block">
                        {JSON.stringify(
                          {
                            export_product_id: item.exportProductId,
                            handle: item.handle,
                            marketing_copy_version_id: item.marketingCopyVersionId,
                            variant_overrides: item.variantOverrides,
                          },
                          null,
                          2,
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">???????????????????????????</div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
