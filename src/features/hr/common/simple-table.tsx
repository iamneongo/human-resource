import * as React from 'react';

import type { FilterVariant, Option } from '@/types/data-table';

import { DataTableClient, type TableRowData } from './data-table-client';
import { nodeToText } from './node-text';

export type ColumnFilterMeta = {
  enabled?: boolean;
  variant?: FilterVariant;
  placeholder?: string;
  options?: Option[];
  range?: [number, number];
  unit?: string;
};

export type Column<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  value?: (row: T) => unknown;
  filter?: ColumnFilterMeta;
  className?: string;
};

export function SimpleTable<T extends { id: string }>({
  columns,
  rows,
  emptyText = 'Chưa có dữ liệu.'
}: {
  columns: Column<T>[];
  rows: T[];
  emptyText?: string;
}) {
  const headers = columns.map((column) => column.header);
  const filterMeta = columns.map((column) => column.filter);

  const data: TableRowData[] = rows.map((row) => {
    const cells = columns.map((column) => column.cell(row));
    const sort = cells.map(nodeToText);
    const values = columns.map((column, index) => column.value?.(row) ?? sort[index] ?? '');

    return {
      id: row.id,
      cells,
      sort,
      values,
      search: sort.join(' ').toLowerCase()
    };
  });

  return (
    <DataTableClient headers={headers} data={data} filterMeta={filterMeta} emptyText={emptyText} />
  );
}
