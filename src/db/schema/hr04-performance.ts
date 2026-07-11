import {
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  uuid
} from 'drizzle-orm/pg-core';

import { departments, id, positions, timestamps } from './_shared';
import { employees } from './hr01-employees';

export const competencyGroupEnum = pgEnum('competency_group', [
  'core',
  'knowledge',
  'skill',
  'attitude'
]);

export const reviewCycleTypeEnum = pgEnum('review_cycle_type', [
  'monthly',
  'quarterly',
  'yearly',
  'probation',
  'review_360'
]);

export const reviewCycleStatusEnum = pgEnum('review_cycle_status', [
  'draft',
  'open',
  'self_review',
  'manager_review',
  'closed'
]);

export const evaluationStatusEnum = pgEnum('evaluation_status', [
  'pending',
  'self_done',
  'manager_done',
  'finalized'
]);

/** Mô tả công việc (JD) theo vị trí */
export const jobDescriptions = pgTable('job_descriptions', {
  id: id(),
  positionId: uuid('position_id')
    .notNull()
    .references(() => positions.id),
  title: text('title').notNull(),
  summary: text('summary'),
  responsibilities: text('responsibilities'),
  requirements: text('requirements'),
  ...timestamps
});

/** Từ điển năng lực */
export const competencies = pgTable('competencies', {
  id: id(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  group: competencyGroupEnum('group').notNull(),
  departmentId: uuid('department_id').references(() => departments.id),
  description: text('description'),
  maxLevel: integer('max_level').notNull().default(5),
  ...timestamps
});

/** KPI/OKR giao cho công ty/phòng ban/cá nhân */
export const kpis = pgTable('kpis', {
  id: id(),
  name: text('name').notNull(),
  // Cấp giao: company | department | individual
  scope: text('scope').notNull(),
  departmentId: uuid('department_id').references(() => departments.id),
  employeeId: uuid('employee_id').references(() => employees.id),
  unit: text('unit'),
  target: numeric('target', { precision: 18, scale: 2 }),
  weight: numeric('weight', { precision: 5, scale: 2 }),
  period: text('period'), // 'YYYY' | 'YYYY-Qn' | 'YYYY-MM'
  ...timestamps
});

/** Chu kỳ đánh giá */
export const reviewCycles = pgTable('review_cycles', {
  id: id(),
  name: text('name').notNull(),
  type: reviewCycleTypeEnum('type').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: reviewCycleStatusEnum('status').notNull().default('draft'),
  ...timestamps
});

/** Kết quả đánh giá của 1 nhân viên trong 1 chu kỳ */
export const evaluations = pgTable('evaluations', {
  id: id(),
  cycleId: uuid('cycle_id')
    .notNull()
    .references(() => reviewCycles.id),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  reviewerId: uuid('reviewer_id').references(() => employees.id),
  selfScore: numeric('self_score', { precision: 5, scale: 2 }),
  managerScore: numeric('manager_score', { precision: 5, scale: 2 }),
  finalScore: numeric('final_score', { precision: 5, scale: 2 }),
  ranking: text('ranking'), // A/B/C... hoặc phân phối bell-curve
  comment: text('comment'),
  status: evaluationStatusEnum('status').notNull().default('pending'),
  ...timestamps
});
