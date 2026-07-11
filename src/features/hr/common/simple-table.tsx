import * as React from 'react';

import { DataTableClient, type TableRowData } from './data-table-client';
import { nodeToText } from './node-text';

export type Column<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

/**
 * Bảng dùng chung — nay render qua data table (kiểu tablecn): tìm kiếm,
 * sắp xếp theo cột, ẩn/hiện cột, phân trang. Giữ nguyên API `Column` cũ.
 *
 * Là Server Component: render sẵn từng ô thành ReactNode (serializable) rồi
 * chuyển cho client table, nên không vi phạm ranh giới RSC.
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
  const headers = columns.map((c) => c.header);
  const data: TableRowData[] = rows.map((row) => {
    const cells = columns.map((c) => c.cell(row));
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
