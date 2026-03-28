"use client";

import { PAGE_SIZE_OPTIONS } from "@/utils/pagination";

type FilterOption = {
  value: string;
  label: string;
};

type ListControlsProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  filterValue?: string;
  filterOptions?: FilterOption[];
  onFilterChange?: (value: string) => void;
  pageSize: number;
  onPageSizeChange: (value: number) => void;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  compact?: boolean;
};

export function ListControls({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filterValue,
  filterOptions,
  onFilterChange,
  pageSize,
  onPageSizeChange,
  currentPage,
  totalPages,
  totalItems,
  onPrevPage,
  onNextPage,
  compact = false,
}: ListControlsProps) {
  return (
    <div className={compact ? "stack list-controls list-controls-compact" : "stack list-controls"} style={{ gap: 12 }}>
      <div className={compact ? "control-row list-controls-row" : "control-row"} style={{ alignItems: "flex-end" }}>
        <div className={compact ? "field list-controls-field" : "field"} style={{ flex: "1 1 260px", marginBottom: 0 }}>
          <label>搜索</label>
          <input
            value={searchValue}
            placeholder={searchPlaceholder}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        {filterOptions && filterOptions.length > 0 && filterValue !== undefined && onFilterChange ? (
          <div className={compact ? "field list-controls-field" : "field"} style={{ minWidth: 160, marginBottom: 0 }}>
            <label>筛选</label>
            <select value={filterValue} onChange={(event) => onFilterChange(event.target.value)}>
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className={compact ? "field list-controls-field" : "field"} style={{ minWidth: 140, marginBottom: 0 }}>
          <label>每页条数</label>
          <select value={String(pageSize)} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={compact ? "split-header list-controls-footer" : "split-header"}>
        <p className="helper">
          共 {totalItems} 条 · 第 {currentPage}/{totalPages} 页
        </p>
        <div className={compact ? "button-row list-controls-actions" : "button-row"}>
          <button type="button" className="ghost-button" disabled={currentPage <= 1} onClick={onPrevPage}>
            上一页
          </button>
          <button type="button" className="ghost-button" disabled={currentPage >= totalPages} onClick={onNextPage}>
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
