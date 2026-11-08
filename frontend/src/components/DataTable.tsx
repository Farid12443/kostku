import type { ReactNode } from 'react';

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows?: T[];
  rowKey: (row: T) => number | string;
  isLoading?: boolean;
  emptyText?: string;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  emptyText = 'Belum ada data.',
  page,
  pageSize,
  total,
  onPageChange,
}: DataTableProps<T>) {
  const pageCount = page && pageSize && total ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-100 text-stone-700">
            <tr>
              {columns.map((column) => (
                <th key={column.header} scope="col" className={`px-4 py-3 font-semibold ${column.className ?? ''}`}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading &&
              [1, 2, 3, 4].map((row) => (
                <tr key={row}>
                  <td colSpan={columns.length} className="px-4 py-3">
                    <div className="skeleton h-6 w-full" />
                  </td>
                </tr>
              ))}
            {!isLoading && rows?.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-stone-600">
                  {emptyText}
                </td>
              </tr>
            )}
            {!isLoading &&
              rows?.map((row) => (
                <tr key={rowKey(row)} className="align-middle">
                  {columns.map((column) => (
                    <td key={column.header} className={`px-4 py-3 ${column.className ?? ''}`}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {onPageChange && page && pageCount > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-stone-200 px-4 py-3 text-sm">
          <span className="text-stone-600">
            Halaman {page} dari {pageCount}
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              Sebelumnya
            </button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
              Berikutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
