import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

import { employees } from './hr01-employees';
import { id, timestamps } from './_shared';

export const shiftTypeEnum = pgEnum('shift_type', [
  'office',
  'split',
  'night',
  'rotating'
]);

export const leaveTypeEnum = pgEnum('leave_type', [
  'annual',
  'sick',
  'maternity',
  'unpaid',
  'other'
]);

export const approvalStatusEnum = pgEnum('approval_status', [
  'draft',
  'pending',
  'approved',
  'rejected',
  'cancelled'
]);

export const otKindEnum = pgEnum('ot_kind', ['weekday', 'weekend', 'holiday']);

/** Cấu hình ca làm việc */
export const shifts = pgTable('shifts', {
  id: id(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: shiftTypeEnum('type').notNull().default('office'),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  breakMinutes: integer('break_minutes').notNull().default(0),
  standardHours: numeric('standard_hours', { precision: 5, scale: 2 })
    .notNull()
    .default('8'),
  ...timestamps
});

/** Thiết bị chấm công (vân tay/thẻ từ/FaceID) */
export const attendanceDevices = pgTable('attendance_devices', {
  id: id(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  location: text('location'),
  ipAddress: text('ip_address'),
  kind: text('kind'), // fingerprint | card | faceid
  isActive: boolean('is_active').notNull().default(true),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  ...timestamps
});

/** Dữ liệu thô check-in/out từ máy chấm công */
export const attendanceRaw = pgTable('attendance_raw', {
  id: id(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  deviceId: uuid('device_id').references(() => attendanceDevices.id),
  punchAt: timestamp('punch_at', { withTimezone: true }).notNull(),
  direction: text('direction'), // in | out
  ...timestamps
});

/** Bảng công tổng hợp theo ngày */
export const timesheets = pgTable('timesheets', {
  id: id(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  workDate: date('work_date').notNull(),
  shiftId: uuid('shift_id').references(() => shifts.id),
  checkIn: timestamp('check_in', { withTimezone: true }),
  checkOut: timestamp('check_out', { withTimezone: true }),
  workedHours: numeric('worked_hours', { precision: 5, scale: 2 }),
  lateMinutes: integer('late_minutes').notNull().default(0),
  earlyLeaveMinutes: integer('early_leave_minutes').notNull().default(0),
  status: text('status'), // present | absent | leave | holiday
  ...timestamps
});

/** Làm thêm giờ (OT) */
export const overtimeRequests = pgTable('overtime_requests', {
  id: id(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  workDate: date('work_date').notNull(),
  fromTime: timestamp('from_time', { withTimezone: true }).notNull(),
  toTime: timestamp('to_time', { withTimezone: true }).notNull(),
  kind: otKindEnum('kind').notNull().default('weekday'),
  coefficient: numeric('coefficient', { precision: 4, scale: 2 })
    .notNull()
    .default('1.5'),
  hours: numeric('hours', { precision: 5, scale: 2 }),
  reason: text('reason'),
  status: approvalStatusEnum('status').notNull().default('pending'),
  approverId: uuid('approver_id').references(() => employees.id),
  ...timestamps
});

/** Nghỉ phép */
export const leaveRequests = pgTable('leave_requests', {
  id: id(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  type: leaveTypeEnum('type').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  days: numeric('days', { precision: 5, scale: 2 }).notNull(),
  reason: text('reason'),
  status: approvalStatusEnum('status').notNull().default('pending'),
  approverId: uuid('approver_id').references(() => employees.id),
  ...timestamps
});

/** Số dư phép năm theo nhân viên */
export const leaveBalances = pgTable('leave_balances', {
  id: id(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  year: integer('year').notNull(),
  entitledDays: numeric('entitled_days', { precision: 5, scale: 2 })
    .notNull()
    .default('12'),
  accruedDays: numeric('accrued_days', { precision: 5, scale: 2 })
    .notNull()
    .default('0'),
  usedDays: numeric('used_days', { precision: 5, scale: 2 })
    .notNull()
    .default('0'),
  ...timestamps
});

/** Giải trình / điều chỉnh dữ liệu công bất thường */
export const attendanceAdjustments = pgTable('attendance_adjustments', {
  id: id(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  workDate: date('work_date').notNull(),
  reason: text('reason').notNull(),
  requestedCheckIn: timestamp('requested_check_in', { withTimezone: true }),
  requestedCheckOut: timestamp('requested_check_out', { withTimezone: true }),
  status: approvalStatusEnum('status').notNull().default('pending'),
  approverId: uuid('approver_id').references(() => employees.id),
  ...timestamps
});
