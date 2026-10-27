"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorState, TableSkeleton } from "./ui";

export type Column<T = any> = {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  width?: string;
};

export function DataTable<T extends Record<string, any>>({
  rows,
  columns,
  loading,
  error,
  onRowClick,
  rowKey = "id",
  emptyTitle,
  emptyMessage,
  footer,
  rowClassName,
}: {
  rows: T[] | null | undefined;
  columns: Column<T>[];
  loading?: boolean;
  error?: string | null;
  onRowClick?: (row: T) => void;
  rowKey?: string | ((row: T) => string);
  emptyTitle?: string;
  emptyMessage?: string;
  footer?: ReactNode;
  rowClassName?: (row: T) => string;
}) {
  if (loading) return <TableSkeleton rows={7} />;
  if (error) return <ErrorState message={error} />;
  if (!rows?.length) return <EmptyState title={emptyTitle || "No records found"} message={emptyMessage || "Adjust your filters or create a new record."} />;

  const keyOf = (row: T) => (typeof rowKey === "function" ? rowKey(row) : String(row[rowKey] ?? ""));

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.012]">
              {columns.map((column) => (
                <th key={column.key} className={cn("table-th", column.headerClassName)} style={{ width: column.width }}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={keyOf(row) || index}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(event) => {
                  if (onRowClick && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    onRowClick(row);
                  }
                }}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn("table-row", onRowClick && "cursor-pointer focus:outline-none focus-visible:bg-white/[0.04]", rowClassName?.(row))}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn("table-td", column.className)}>
                    {column.render ? column.render(row, index) : (row[column.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}
