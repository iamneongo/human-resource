import { z } from 'zod';

export const employeeStatusValues = ['active', 'probation', 'on_leave', 'terminated'] as const;

export const genderValues = ['male', 'female', 'other'] as const;
export const maritalStatusValues = ['single', 'married', 'divorced', 'widowed', 'other'] as const;

export const employeeFormSchema = z.object({
  employeeCode: z.string().min(1, 'Bắt buộc nhập mã nhân viên'),
  fullName: z.string().min(1, 'Bắt buộc nhập họ tên'),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  soCccd: z.string().optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  gender: z.enum(genderValues).optional(),
  address: z.string().optional().or(z.literal('')),
  maritalStatus: z.enum(maritalStatusValues).optional(),
  hireDate: z.string().optional().or(z.literal('')),
  seniorityDate: z.string().optional().or(z.literal('')),
  probationEndDate: z.string().optional().or(z.literal('')),
  resignDate: z.string().optional().or(z.literal('')),
  resignReason: z.string().optional().or(z.literal('')),
  status: z.enum(employeeStatusValues).default('probation'),
  departmentId: z.string().uuid().optional().or(z.literal('')),
  positionId: z.string().uuid().optional().or(z.literal('')),
  birthPlace: z.string().optional().or(z.literal('')),
  cccdIssueDate: z.string().optional().or(z.literal('')),
  cccdIssuePlace: z.string().optional().or(z.literal('')),
  nationality: z.string().optional().or(z.literal('')),
  permanentAddress: z.string().optional().or(z.literal('')),
  educationLevel: z.string().optional().or(z.literal('')),
  major: z.string().optional().or(z.literal('')),
  jobTitle: z.string().optional().or(z.literal(''))
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
