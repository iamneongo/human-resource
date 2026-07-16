'use client';

import * as React from 'react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';

import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { DataTablePagination } from '@/components/ui/table/data-table-pagination';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import type { FilterVariant, Option } from '@/types/data-table';

export type TableRowData = {
  id: string;
  cells: React.ReactNode[];
  sort: string[];
  values: unknown[];
  search: string;
};

type ColumnFilterMeta = {
  enabled?: boolean;
  variant?: FilterVariant;
  placeholder?: string;
  options?: Option[];
  range?: [number, number];
  unit?: string;
};

const DEFAULT_FACETED_FILTER_LIMIT = 50;

function inferFilterMeta(
  header: string,
  values: unknown[],
  meta?: ColumnFilterMeta
): ColumnFilterMeta | undefined {
  if (meta?.enabled === false) {
    return undefined;
  }

  if (meta?.variant) {
    return {
      enabled: true,
      ...meta
    };
  }

  const cleaned = values
    .map((value) => (typeof value === 'string' ? value.trim() : value))
    .filter((value) => value !== '' && value !== null && value !== undefined);

  if (!cleaned.length) {
    return undefined;
  }

  const normalizedHeader = header.trim().toLowerCase();
  if (!normalizedHeader || normalizedHeader === 'thao tác') {
    return undefined;
  }

  const stringValues = cleaned.map((value) => String(value));
  const uniqueCounts = new Map<string, number>();

  for (const value of stringValues) {
    uniqueCounts.set(value, (uniqueCounts.get(value) ?? 0) + 1);
  }

  const uniqueEntries = Array.from(uniqueCounts.entries());

  if (uniqueEntries.length > 1 && uniqueEntries.length <= DEFAULT_FACETED_FILTER_LIMIT) {
    return {
      enabled: true,
      variant: 'multiSelect',
      options: uniqueEntries
        .sort((a, b) => b[1] - a[1])
        .map(([value, count]) => ({ value, label: value, count })),
      ...meta
    };
  }

  if (uniqueEntries.length > 1) {
    return {
      enabled: true,
      variant: 'text',
      placeholder: meta?.placeholder ?? `Lọc ${header.toLowerCase()}`
    };
  }

  return undefined;
}

export function DataTableClient({
  headers,
  data,
  filterMeta = [],
  emptyText = 'Chưa có dữ liệu.',
  searchPlaceholder = 'Tìm kiếm...'
}: {
  headers: string[];
  data: TableRowData[];
  filterMeta?: Array<ColumnFilterMeta | undefined>;
  emptyText?: string;
  searchPlaceholder?: string;
}) {
  const [globalFilter, setGlobalFilter] = React.useState('');

  const columns = React.useMemo<ColumnDef<TableRowData>[]>(
    () =>
      headers.map((header, index) => {
        const effectiveMeta = inferFilterMeta(
          header,
          data.map((row) => row.values[index]),
          filterMeta[index]
        );
        const variant = effectiveMeta?.variant;

        return {
          id: header || `col_${index}`,
          accessorFn: (row) => row.values[index] ?? row.sort[index] ?? '',
          header: ({ column }) => <DataTableColumnHeader column={column} title={header} />,
          cell: ({ row }) => row.original.cells[index],
          enableSorting: true,
          enableHiding: true,
          enableColumnFilter: Boolean(effectiveMeta?.enabled),
          filterFn: (row, columnId, filterValue) => {
            const value = row.getValue(columnId);

            if (variant === 'multiSelect' || variant === 'select') {
              const selected = Array.isArray(filterValue) ? filterValue : [];
              if (!selected.length) return true;
              return selected.includes(String(value ?? ''));
            }

            return String(value ?? '')
              .toLowerCase()
              .includes(String(filterValue ?? '').toLowerCase());
          },
          meta: {
            label: header || `Cột ${index + 1}`,
            placeholder: effectiveMeta?.placeholder,
            variant,
            options: effectiveMeta?.options,
            range: effectiveMeta?.range,
            unit: effectiveMeta?.unit
          }
        } satisfies ColumnDef<TableRowData>;
      }),
    [data, filterMeta, headers]
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
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } }
  });

  return (
    <div className='flex min-w-0 max-w-full flex-col gap-2.5'>
      <div className='flex flex-wrap items-center gap-2'>
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className='h-9 w-full max-w-xs'
        />
      </div>

      <DataTableToolbar table={table} />

      <div className='min-w-0 rounded-lg border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
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
