'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { employees, overtimeRequests } from '@/db/schema';
import { getCurrentEmployeeId, requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

const OT_COEFFICIENT: Record<string, string> = {
  weekday: '1.5',
  weekend: '2.0',
  holiday: '3.0'
};

export async function listOvertime(onlyEmployeeId?: string) {
  await requireRole('employee');
  const q = db
    .select({
      id: overtimeRequests.id,
      workDate: overtimeRequests.workDate,
      fromTime: overtimeRequests.fromTime,
      toTime: overtimeRequests.toTime,
      kind: overtimeRequests.kind,
      coefficient: overtimeRequests.coefficient,
      hours: overtimeRequests.hours,
      reason: overtimeRequests.reason,
      status: overtimeRequests.status,
      employeeName: employees.fullName
    })
    .from(overtimeRequests)
    .leftJoin(employees, eq(overtimeRequests.employeeId, employees.id))
    .where(onlyEmployeeId ? eq(overtimeRequests.employeeId, onlyEmployeeId) : undefined)
    .orderBy(desc(overtimeRequests.workDate))
    .limit(200);
  return q;
}

const KINDS = ['weekday', 'weekend', 'holiday'] as const;

export async function createOvertime(v: Record<string, string>): Promise<Result> {
  await requireRole('employee');
  const employeeId = v.employeeId || (await getCurrentEmployeeId());
  if (!employeeId) return { ok: false, error: 'Không xác định được nhân viên.' };
  if (!v.workDate || !v.fromTime || !v.toTime)
    return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  const kind = KINDS.includes(v.kind as (typeof KINDS)[number])
    ? (v.kind as (typeof KINDS)[number])
    : 'weekday';

  // Tính số giờ OT từ khoảng thời gian.
  const from = new Date(`${v.workDate}T${v.fromTime}`);
  const to = new Date(`${v.workDate}T${v.toTime}`);
  const hours = Math.max(0, (to.getTime() - from.getTime()) / 3_600_000);

  try {
    await db.insert(overtimeRequests).values({
      employeeId,
      workDate: v.workDate,
      fromTime: from,
      toTime: to,
      kind,
      coefficient: OT_COEFFICIENT[kind],
      hours: hours.toFixed(2),
      reason: v.reason || null,
      status: 'pending'
    });
    revalidatePath('/dashboard/attendance/overtime');
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
    .update(overtimeRequests)
    .set({ status, approverId: approverId ?? null })
    .where(eq(overtimeRequests.id, id));
  revalidatePath('/dashboard/attendance/overtime');
  return { ok: true };
}

export async function approveOvertime(id: string) {
  return setStatus(id, 'approved');
}
export async function rejectOvertime(id: string) {
  return setStatus(id, 'rejected');
}
