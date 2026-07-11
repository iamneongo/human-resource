'use client';

import * as React from 'react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';

import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { DataTablePagination } from '@/components/ui/table/data-table-pagination';
import { DataTableViewOptions } from '@/components/ui/table/data-table-view-options';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

export type TableRowData = {
  id: string;
  cells: React.ReactNode[];
  sort: string[];
  search: string;
};

/**
 * Data table (kiểu tablecn) tự-size: tìm kiếm toàn cục, sắp xếp theo cột,
 * ẩn/hiện cột và phân trang — dựng trên TanStack React Table.
 * Nhận sẵn các ô đã render (ReactNode) từ server để giữ ranh giới RSC.
 */
export function DataTableClient({
  headers,
  data,
  emptyText = 'Chưa có dữ liệu.',
  searchPlaceholder = 'Tìm kiếm...'
}: {
  headers: string[];
  data: TableRowData[];
  emptyText?: string;
  searchPlaceholder?: string;
}) {
  const [globalFilter, setGlobalFilter] = React.useState('');

  const columns = React.useMemo<ColumnDef<TableRowData>[]>(
    () =>
      headers.map((header, i) => ({
        id: header || `col_${i}`,
        accessorFn: (row) => row.sort[i] ?? '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={header} />
        ),
        cell: ({ row }) => row.original.cells[i],
        enableSorting: true,
        enableHiding: true,
        meta: { label: header || `Cột ${i + 1}` }
      })),
    [headers]
  );

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, value) =>
      row.original.search.includes(String(value).toLowerCase()),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } }
  });

  return (
    <div className='flex flex-col gap-2.5'>
      <div className='flex items-center justify-between gap-2'>
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className='h-9 w-full max-w-xs'
        />
        <DataTableViewOptions table={table} />
      </div>

      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={headers.length}
                  className='text-muted-foreground h-24 text-center'
                >
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </div>
  );
}
