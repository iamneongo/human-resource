import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  uuid
} from 'drizzle-orm/pg-core';

import { id, positions, timestamps } from './_shared';
import { employees } from './hr01-employees';

export const trainingNeedSourceEnum = pgEnum('training_need_source', [
  'employee_request',
  'manager_assessment',
  'competency_gap'
]);

export const enrollmentTypeEnum = pgEnum('enrollment_type', [
  'mandatory',
  'self_registered'
]);

export const learningStatusEnum = pgEnum('learning_status', [
  'enrolled',
  'in_progress',
  'completed',
  'failed',
  'dropped'
]);

/** Phân tích nhu cầu đào tạo (TNA) */
export const trainingNeeds = pgTable('training_needs', {
  id: id(),
  employeeId: uuid('employee_id').references(() => employees.id),
  source: trainingNeedSourceEnum('source').notNull(),
  topic: text('topic').notNull(),
  description: text('description'),
  priority: text('priority'), // low | medium | high
  ...timestamps
});

/** Kế hoạch đào tạo */
export const trainingPlans = pgTable('training_plans', {
  id: id(),
  name: text('name').notNull(),
  year: integer('year').notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  estimatedCost: numeric('estimated_cost', { precision: 18, scale: 2 }),
  note: text('note'),
  ...timestamps
});

/** Khóa học & nội dung */
export const courses = pgTable('courses', {
  id: id(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  planId: uuid('plan_id').references(() => trainingPlans.id),
  instructor: text('instructor'),
  isElearning: boolean('is_elearning').notNull().default(false),
  materialsUrl: text('materials_url'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  cost: numeric('cost', { precision: 18, scale: 2 }),
  ...timestamps
});

/** Ghi danh học viên */
export const enrollments = pgTable('enrollments', {
  id: id(),
  courseId: uuid('course_id')
    .notNull()
    .references(() => courses.id),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  type: enrollmentTypeEnum('type').notNull().default('self_registered'),
  status: learningStatusEnum('status').notNull().default('enrolled'),
  ...timestamps
});

/** Theo dõi quá trình học tập */
export const learningProgress = pgTable('learning_progress', {
  id: id(),
  enrollmentId: uuid('enrollment_id')
    .notNull()
    .references(() => enrollments.id),
  attendanceRate: numeric('attendance_rate', { precision: 5, scale: 2 }),
  completionRate: numeric('completion_rate', { precision: 5, scale: 2 }),
  examScore: numeric('exam_score', { precision: 5, scale: 2 }),
  satisfactionScore: numeric('satisfaction_score', { precision: 5, scale: 2 }),
  appliedAssessment: text('applied_assessment'), // đánh giá áp dụng sau 1-3 tháng
  ...timestamps
});

/** Ngân sách đào tạo */
export const trainingBudgets = pgTable('training_budgets', {
  id: id(),
  year: integer('year').notNull(),
  totalBudget: numeric('total_budget', { precision: 18, scale: 2 }).notNull(),
  spent: numeric('spent', { precision: 18, scale: 2 }).notNull().default('0'),
  note: text('note'),
  ...timestamps
});

/** Lộ trình nghề nghiệp (Career Path) */
export const careerPaths = pgTable('career_paths', {
  id: id(),
  fromPositionId: uuid('from_position_id').references(() => positions.id),
  toPositionId: uuid('to_position_id')
    .notNull()
    .references(() => positions.id),
  requiredCourses: text('required_courses'), // danh sách khóa bắt buộc
  minYears: numeric('min_years', { precision: 4, scale: 1 }),
  description: text('description'),
  ...timestamps
});
