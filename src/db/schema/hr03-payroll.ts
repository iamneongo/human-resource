import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

import { employees } from './hr01-employees';
import { id, timestamps } from './_shared';

export const payrollRunStatusEnum = pgEnum('payroll_run_status', [
  'draft',
  'previewed',
  'calculating',
  'locked',
  'approving',
  'approved',
  'paid'
]);

export const salaryAdjustmentTypeEnum = pgEnum('salary_adjustment_type', [
  'raise',
  'cut',
  'allowance',
  'bonus',
  'penalty',
  'other'
]);

/** Thang bảng lương (ngạch/bậc) */
export const salaryScales = pgTable('salary_scales', {
  id: id(),
  code: text('code').notNull().unique(),
  grade: text('grade').notNull(),
  step: integer('step').notNull(),
  minSalary: numeric('min_salary', { precision: 18, scale: 2 }).notNull(),
  maxSalary: numeric('max_salary', { precision: 18, scale: 2 }).notNull(),
  coefficient: numeric('coefficient', { precision: 6, scale: 2 }),
  ...timestamps
});

/** Công thức tính lương động */
export const payrollFormulas = pgTable('payroll_formulas', {
  id: id(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  // Biểu thức động, tham chiếu biến (base, workedDays, kpi, otHours...).
  expression: text('expression').notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps
});

/** Cấu hình BHXH & thuế TNCN */
export const insuranceTaxConfigs = pgTable('insurance_tax_configs', {
  id: id(),
  effectiveFrom: date('effective_from').notNull(),
  socialInsuranceRate: numeric('social_insurance_rate', {
    precision: 5,
    scale: 4
  }).notNull(), // BHXH (nhân viên)
  healthInsuranceRate: numeric('health_insurance_rate', {
    precision: 5,
    scale: 4
  }).notNull(), // BHYT
  unemploymentRate: numeric('unemployment_rate', {
    precision: 5,
    scale: 4
  }).notNull(), // BHTN
  personalDeduction: numeric('personal_deduction', {
    precision: 18,
    scale: 2
  }).notNull(), // giảm trừ bản thân
  dependentDeduction: numeric('dependent_deduction', {
    precision: 18,
    scale: 2
  }).notNull(), // giảm trừ người phụ thuộc
  // Biểu thuế lũy tiến từng phần: [{ upTo, rate }]
  taxBrackets: jsonb('tax_brackets')
    .$type<Array<{ upTo: number | null; rate: number }>>()
    .notNull(),
  ...timestamps
});

/** Biến động lương trong kỳ */
export const salaryAdjustments = pgTable('salary_adjustments', {
  id: id(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  type: salaryAdjustmentTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  effectiveMonth: date('effective_month').notNull(),
  note: text('note'),
  ...timestamps
});

/** Kỳ chạy lương (chốt bảng lương) */
export const payrollRuns = pgTable('payroll_runs', {
  id: id(),
  period: text('period').notNull(), // 'YYYY-MM'
  name: text('name').notNull(),
  status: payrollRunStatusEnum('status').notNull().default('draft'),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  note: text('note'),
  ...timestamps
});

/** Phiếu lương điện tử theo nhân viên trong 1 kỳ */
export const payslips = pgTable('payslips', {
  id: id(),
  payrollRunId: uuid('payroll_run_id')
    .notNull()
    .references(() => payrollRuns.id),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  isPreview: boolean('is_preview').notNull().default(false),
  baseSalary: numeric('base_salary', { precision: 18, scale: 2 }).notNull(),
  allowances: numeric('allowances', { precision: 18, scale: 2 }).notNull().default('0'),
  overtimePay: numeric('overtime_pay', { precision: 18, scale: 2 }).notNull().default('0'),
  grossPay: numeric('gross_pay', { precision: 18, scale: 2 }).notNull(),
  insuranceDeduction: numeric('insurance_deduction', {
    precision: 18,
    scale: 2
  })
    .notNull()
    .default('0'),
  taxDeduction: numeric('tax_deduction', { precision: 18, scale: 2 }).notNull().default('0'),
  otherDeduction: numeric('other_deduction', { precision: 18, scale: 2 }).notNull().default('0'),
  netPay: numeric('net_pay', { precision: 18, scale: 2 }).notNull(),
  // Chi tiết dòng lương để hiển thị/kiểm toán
  breakdown: jsonb('breakdown').$type<Record<string, number | string>>(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  ...timestamps
});
