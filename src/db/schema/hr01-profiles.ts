import { date, integer, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';

import { employees } from './hr01-employees';
import { id, timestamps } from './_shared';

/**
 * Hồ sơ chi tiết nhân viên (1-1) — tách khỏi bảng `employees` để không phình
 * bảng lõi. Chứa thông tin nhân thân, giấy tờ, học vấn, địa chỉ.
 */
export const employeeProfiles = pgTable('employee_profiles', {
  id: id(),
  employeeId: uuid('employee_id')
    .notNull()
    .unique()
    .references(() => employees.id, { onDelete: 'cascade' }),
  birthPlace: text('birth_place'), // nơi sinh
  cccdIssueDate: date('cccd_issue_date'), // ngày cấp CMND/CCCD
  cccdIssuePlace: text('cccd_issue_place'), // nơi cấp
  nationality: text('nationality'), // quốc tịch
  permanentAddress: text('permanent_address'), // thường trú
  temporaryAddress: text('temporary_address'), // tạm trú
  educationLevel: text('education_level'), // trình độ văn hóa
  major: text('major'), // chuyên ngành
  jobTitle: text('job_title'), // chức danh công việc (khác chức vụ)
  ...timestamps
});

export const ppeItemEnum = pgEnum('ppe_item', [
  'protective', // đồ BHLĐ chung
  'boot', // ủng
  'shoe', // giày
  'other'
]);

export const ppeIssueTypeEnum = pgEnum('ppe_issue_type', [
  'new', // phát mới
  'periodic' // phát định kỳ
]);

/**
 * Cấp phát bảo hộ lao động (BHLĐ) theo quý/năm — chuẩn hóa từ hàng chục cột
 * BHLĐ trong file thật thành bản ghi.
 */
export const ppeIssuances = pgTable('ppe_issuances', {
  id: id(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  item: ppeItemEnum('item').notNull(),
  issueType: ppeIssueTypeEnum('issue_type').notNull().default('new'),
  year: integer('year').notNull(),
  quarter: integer('quarter'), // 1..4, nullable
  issuedAt: date('issued_at'),
  expiresAt: date('expires_at'),
  note: text('note'),
  ...timestamps
});
