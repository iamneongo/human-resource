import { integer, pgTable, text } from 'drizzle-orm/pg-core';

import { id, timestamps } from './_shared';

/**
 * Lưu file ngay trong Postgres (Neon) — nội dung mã hóa base64 ở cột `data`.
 * Phù hợp tài liệu nhỏ (ảnh đại diện, hợp đồng PDF, bằng cấp...).
 */
export const files = pgTable('files', {
  id: id(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull().default(0),
  data: text('data').notNull(), // base64
  ...timestamps
});
