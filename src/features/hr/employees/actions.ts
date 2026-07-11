'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq, ilike, or } from 'drizzle-orm';

import { db } from '@/db';
import { contracts, departments, employeeProfiles, employees, positions } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

import { employeeFormSchema, type EmployeeFormValues } from './schema';

/** Chi tiết 1 nhân viên: hồ sơ + phòng ban/chức vụ + hợp đồng. */
export async function getEmployeeDetail(id: string) {
  await requireRole('manager');
  const [emp] = await db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      fullName: employees.fullName,
      dateOfBirth: employees.dateOfBirth,
      gender: employees.gender,
      soCccd: employees.soCccd,
      phone: employees.phone,
      email: employees.email,
      status: employees.status,
      hireDate: employees.hireDate,
      seniorityDate: employees.seniorityDate,
      probationEndDate: employees.probationEndDate,
      resignDate: employees.resignDate,
      resignReason: employees.resignReason,
      departmentName: departments.name,
      positionTitle: positions.title,
      birthPlace: employeeProfiles.birthPlace,
      cccdIssueDate: employeeProfiles.cccdIssueDate,
      cccdIssuePlace: employeeProfiles.cccdIssuePlace,
      nationality: employeeProfiles.nationality,
      permanentAddress: employeeProfiles.permanentAddress,
      educationLevel: employeeProfiles.educationLevel,
      major: employeeProfiles.major,
      jobTitle: employeeProfiles.jobTitle
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .leftJoin(employeeProfiles, eq(employeeProfiles.employeeId, employees.id))
    .where(eq(employees.id, id))
    .limit(1);
  if (!emp) return null;

  const contractRows = await db
    .select({
      id: contracts.id,
      type: contracts.type,
      contractNumber: contracts.contractNumber,
      startDate: contracts.startDate,
      endDate: contracts.endDate,
      status: contracts.status
    })
    .from(contracts)
    .where(eq(contracts.employeeId, id))
    .orderBy(desc(contracts.startDate));

  return { emp, contracts: contractRows };
}

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

/** Danh sách nhân viên (kèm phòng ban / chức vụ) cho bảng. */
export async function listEmployees(search?: string) {
  await requireRole('manager');

  const rows = await db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      fullName: employees.fullName,
      email: employees.email,
      phone: employees.phone,
      status: employees.status,
      hireDate: employees.hireDate,
      departmentName: departments.name,
      positionTitle: positions.title
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .where(
      search
        ? or(ilike(employees.fullName, `%${search}%`), ilike(employees.employeeCode, `%${search}%`))
        : undefined
    )
    .orderBy(desc(employees.createdAt))
    .limit(200);

  return rows;
}

/** Tạo nhân viên mới. Chỉ HR trở lên. */
export async function createEmployee(
  values: EmployeeFormValues
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Bạn không có quyền tạo nhân viên.' };
  }

  const parsed = employeeFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
  }
  const v = parsed.data;

  try {
    const [row] = await db
      .insert(employees)
      .values({
        employeeCode: v.employeeCode,
        fullName: v.fullName,
        email: v.email || null,
        phone: v.phone || null,
        soCccd: v.soCccd || null,
        dateOfBirth: v.dateOfBirth || null,
        gender: v.gender,
        hireDate: v.hireDate || null,
        status: v.status,
        departmentId: v.departmentId || null,
        positionId: v.positionId || null
      })
      .returning({ id: employees.id });

    revalidatePath('/dashboard/hr/employees');
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Lỗi không xác định';
    // Unique violation on employee_code
    if (msg.includes('employee_code')) {
      return { ok: false, error: 'Mã nhân viên đã tồn tại.' };
    }
    return { ok: false, error: msg };
  }
}
