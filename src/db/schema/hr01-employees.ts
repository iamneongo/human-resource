import {
  date,
  foreignKey,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

import { costCenters, departments, id, positions, timestamps } from './_shared';
import { files } from './files';

export const employeeGenderEnum = pgEnum('employee_gender', ['male', 'female', 'other']);

export const employeeStatusEnum = pgEnum('employee_status', [
  'active',
  'probation',
  'on_leave',
  'terminated'
]);

export const maritalStatusEnum = pgEnum('marital_status', [
  'single',
  'married',
  'divorced',
  'widowed',
  'other'
]);

export const employeeDocumentTypeEnum = pgEnum('employee_document_type', [
  'degree',
  'id_card',
  'social_insurance',
  'certificate',
  'cv',
  'other'
]);

export const contractTypeEnum = pgEnum('contract_type', [
  'probation', // thử việc
  'fixed_term', // xác định thời hạn (chung)
  'term_1y', // HĐLĐ 1 năm
  'term_3y', // HĐLĐ 3 năm
  'indefinite', // không xác định thời hạn (KXĐ)
  'until_retirement', // HĐLĐ đến nghỉ hưu
  'seasonal' // thời vụ
]);

export const contractStatusEnum = pgEnum('contract_status', ['active', 'expired', 'terminated']);

export const jobAssignmentTypeEnum = pgEnum('job_assignment_type', [
  'hire',
  'transfer',
  'promotion',
  'rotation'
]);

export const assetTypeEnum = pgEnum('asset_type', ['laptop', 'device', 'uniform', 'other']);

export const assetStatusEnum = pgEnum('asset_status', ['assigned', 'returned', 'lost']);

export const rewardDisciplineTypeEnum = pgEnum('reward_discipline_type', ['reward', 'discipline']);

export const offboardingStatusEnum = pgEnum('offboarding_status', [
  'submitted',
  'approving',
  'asset_handover',
  'work_handover',
  'settled',
  'completed'
]);

export const employees = pgTable(
  'employees',
  {
    id: id(),
    employeeCode: text('employee_code').notNull().unique(),
    fullName: text('full_name').notNull(),
    dateOfBirth: date('date_of_birth'),
    gender: employeeGenderEnum('gender'),
    soCccd: text('so_cccd'),
    phone: text('phone'),
    email: text('email'),
    address: text('address'),
    maritalStatus: maritalStatusEnum('marital_status'),
    hireDate: date('hire_date'), // ngày vào làm
    seniorityDate: date('seniority_date'), // ngày theo dõi thâm niên (tính phép)
    probationEndDate: date('probation_end_date'), // ngày hết hạn thử việc
    resignDate: date('resign_date'), // ngày nghỉ việc
    resignReason: text('resign_reason'), // lý do thôi việc
    status: employeeStatusEnum('status').notNull().default('probation'),
    authUserId: text('auth_user_id'),
    legacyClerkUserId: text('clerk_user_id'),
    departmentId: uuid('department_id').references(() => departments.id),
    positionId: uuid('position_id').references(() => positions.id),
    managerId: uuid('manager_id'),
    avatarUrl: text('avatar_url'),
    ...timestamps
  },
  (table) => [
    foreignKey({
      columns: [table.managerId],
      foreignColumns: [table.id],
      name: 'employees_manager_id_fkey'
    })
  ]
);

export const employeeDocuments = pgTable('employee_documents', {
  id: id(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  type: employeeDocumentTypeEnum('type').notNull(),
  name: text('name').notNull(),
  fileUrl: text('file_url').notNull(),
  note: text('note'),
  issueDate: date('issue_date'),
  expiryDate: date('expiry_date'),
  ...timestamps
});

export const contracts = pgTable('contracts', {
  id: id(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  type: contractTypeEnum('type').notNull(),
  contractNumber: text('contract_number').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  baseSalary: numeric('base_salary', { precision: 18, scale: 2 }).notNull(),
  signNumber: text('sign_number'), // số văn bản ký
  signDate: date('sign_date'), // ngày ký HĐLĐ
  status: contractStatusEnum('status').notNull().default('active'),
  fileUrl: text('file_url'),
  fileId: uuid('file_id').references(() => files.id),
  fileName: text('file_name'),
  fileMimeType: text('file_mime_type'),
  fileSize: integer('file_size'),
  fileUploadedBy: text('file_uploaded_by'),
  fileUploadedAt: timestamp('file_uploaded_at', { withTimezone: true }),
  ...timestamps
});

export const jobAssignments = pgTable('job_assignments', {
  id: id(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  departmentId: uuid('department_id').references(() => departments.id),
  positionId: uuid('position_id').references(() => positions.id),
  costCenterId: uuid('cost_center_id').references(() => costCenters.id),
  type: jobAssignmentTypeEnum('type').notNull(),
  effectiveDate: date('effective_date').notNull(),
  note: text('note'),
  ...timestamps
});

export const salaryInfos = pgTable('salary_infos', {
  id: id(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  baseSalary: numeric('base_salary', { precision: 18, scale: 2 }).notNull(),
  fixedAllowance: numeric('fixed_allowance', { precision: 18, scale: 2 }).notNull().default('0'),
  commercialInsurancePackage: text('commercial_insurance_package'),
  otherBenefits: jsonb('other_benefits').$type<Record<string, unknown> | null>(),
  effectiveFrom: date('effective_from').notNull(),
  ...timestamps
});

export const assets = pgTable('assets', {
  id: id(),
  employeeId: uuid('employee_id').references(() => employees.id),
  name: text('name').notNull(),
  type: assetTypeEnum('type').notNull(),
  assetCode: text('asset_code'),
  issueDate: date('issue_date'),
  returnDate: date('return_date'),
  status: assetStatusEnum('status').notNull().default('assigned'),
  note: text('note'),
  ...timestamps
});

export const rewardsDisciplines = pgTable('rewards_disciplines', {
  id: id(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  type: rewardDisciplineTypeEnum('type').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  decisionNumber: text('decision_number'),
  decisionDate: date('decision_date').notNull(),
  formOrValue: text('form_or_value'),
  ...timestamps
});

export const offboardings = pgTable('offboardings', {
  id: id(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  resignationDate: date('resignation_date').notNull(),
  expectedLeaveDate: date('expected_leave_date').notNull(),
  reason: text('reason'),
  status: offboardingStatusEnum('status').notNull().default('submitted'),
  note: text('note'),
  ...timestamps
});
