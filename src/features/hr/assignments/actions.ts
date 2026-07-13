'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { departments, employees, jobAssignments, positions } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

export async function getAssignmentsByEmployee(employeeId: string) {
  await requireRole('manager');
  return db
    .select({
      id: jobAssignments.id,
      type: jobAssignments.type,
      effectiveDate: jobAssignments.effectiveDate,
      note: jobAssignments.note,
      departmentName: departments.name,
      positionTitle: positions.title
    })
    .from(jobAssignments)
    .leftJoin(departments, eq(jobAssignments.departmentId, departments.id))
    .leftJoin(positions, eq(jobAssignments.positionId, positions.id))
    .where(eq(jobAssignments.employeeId, employeeId))
    .orderBy(desc(jobAssignments.effectiveDate));
}

type Result = { ok: true } | { ok: false; error: string };

export async function listAssignments() {
  await requireRole('manager');
  return db
    .select({
      id: jobAssignments.id,
      type: jobAssignments.type,
      effectiveDate: jobAssignments.effectiveDate,
      note: jobAssignments.note,
      employeeName: employees.fullName,
      departmentName: departments.name,
      positionTitle: positions.title
    })
    .from(jobAssignments)
    .leftJoin(employees, eq(jobAssignments.employeeId, employees.id))
    .leftJoin(departments, eq(jobAssignments.departmentId, departments.id))
    .leftJoin(positions, eq(jobAssignments.positionId, positions.id))
    .orderBy(desc(jobAssignments.effectiveDate))
    .limit(200);
}

const TYPES = ['hire', 'transfer', 'promotion', 'rotation'] as const;

export async function createAssignment(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.employeeId || !v.type || !v.effectiveDate)
    return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  if (!TYPES.includes(v.type as (typeof TYPES)[number]))
    return { ok: false, error: 'Loại điều chuyển không hợp lệ.' };
  try {
    await db.insert(jobAssignments).values({
      employeeId: v.employeeId,
      departmentId: v.departmentId || null,
      positionId: v.positionId || null,
      type: v.type as (typeof TYPES)[number],
      effectiveDate: v.effectiveDate,
      note: v.note || null
    });

    // Cập nhật phòng ban/chức vụ hiện tại của nhân viên
    await db
      .update(employees)
      .set({
        ...(v.departmentId ? { departmentId: v.departmentId } : {}),
        ...(v.positionId ? { positionId: v.positionId } : {})
      })
      .where(eq(employees.id, v.employeeId));

    revalidatePath('/dashboard/hr/assignments');
    revalidatePath(`/dashboard/hr/employees/${v.employeeId}`);
    revalidatePath('/dashboard/hr/employees');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}
