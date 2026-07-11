'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { attendanceAdjustments, employees } from '@/db/schema';
import { getCurrentEmployeeId, requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

export async function listAdjustments() {
  await requireRole('manager');
  return db
    .select({
      id: attendanceAdjustments.id,
      workDate: attendanceAdjustments.workDate,
      reason: attendanceAdjustments.reason,
      status: attendanceAdjustments.status,
      employeeName: employees.fullName
    })
    .from(attendanceAdjustments)
    .leftJoin(employees, eq(attendanceAdjustments.employeeId, employees.id))
    .orderBy(desc(attendanceAdjustments.workDate))
    .limit(200);
}

export async function createAdjustment(v: Record<string, string>): Promise<Result> {
  await requireRole('employee');
  const employeeId = v.employeeId || (await getCurrentEmployeeId());
  if (!employeeId) return { ok: false, error: 'Không xác định được nhân viên.' };
  if (!v.workDate || !v.reason)
    return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  try {
    await db.insert(attendanceAdjustments).values({
      employeeId,
      workDate: v.workDate,
      reason: v.reason,
      requestedCheckIn:
        v.workDate && v.requestedCheckIn
          ? new Date(`${v.workDate}T${v.requestedCheckIn}`)
          : null,
      requestedCheckOut:
        v.workDate && v.requestedCheckOut
          ? new Date(`${v.workDate}T${v.requestedCheckOut}`)
          : null,
      status: 'pending'
    });
    revalidatePath('/dashboard/attendance/adjustments');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}

async function setStatus(
  id: string,
  status: 'approved' | 'rejected'
): Promise<Result> {
  try {
    await requireRole('manager');
  } catch {
    return { ok: false, error: 'Chỉ quản lý trở lên được phê duyệt.' };
  }
  const approverId = await getCurrentEmployeeId();
  await db
    .update(attendanceAdjustments)
    .set({ status, approverId: approverId ?? null })
    .where(eq(attendanceAdjustments.id, id));
  revalidatePath('/dashboard/attendance/adjustments');
  return { ok: true };
}

export async function approveAdjustment(id: string) {
  return setStatus(id, 'approved');
}
export async function rejectAdjustment(id: string) {
  return setStatus(id, 'rejected');
}
