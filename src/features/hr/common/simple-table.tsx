import * as React from 'react';

import { DataTableClient, type TableRowData } from './data-table-client';
import { nodeToText } from './node-text';

export type Column<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

/**
 * Bảng dùng chung cho các màn nghiệp vụ HRM.
 * Render server-side rồi chuyển sang data table client để có tìm kiếm, sắp xếp và phân trang.
 */
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
  const data: TableRowData[] = rows.map((row) => {
    const cells = columns.map((column) => column.cell(row));
    const sort = cells.map(nodeToText);

    return {
      id: row.id,
      cells,
      sort,
      search: sort.join(' ').toLowerCase()
    };
  });

  return <DataTableClient headers={headers} data={data} emptyText={emptyText} />;
}
