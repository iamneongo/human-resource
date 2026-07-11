'use server';

import { revalidatePath } from 'next/cache';
import { and, desc, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { employees, leaveBalances, leaveRequests } from '@/db/schema';
import { getCurrentEmployeeId, requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

export async function listLeaves() {
  await requireRole('manager');
  return db
    .select({
      id: leaveRequests.id,
      type: leaveRequests.type,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      days: leaveRequests.days,
      reason: leaveRequests.reason,
      status: leaveRequests.status,
      employeeName: employees.fullName
    })
    .from(leaveRequests)
    .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
    .orderBy(desc(leaveRequests.startDate))
    .limit(200);
}

const TYPES = ['annual', 'sick', 'maternity', 'unpaid', 'other'] as const;

export async function createLeave(v: Record<string, string>): Promise<Result> {
  await requireRole('employee');
  const employeeId = v.employeeId || (await getCurrentEmployeeId());
  if (!employeeId) return { ok: false, error: 'Không xác định được nhân viên.' };
  if (!v.type || !v.startDate || !v.endDate)
    return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  const type = TYPES.includes(v.type as (typeof TYPES)[number])
    ? (v.type as (typeof TYPES)[number])
    : 'annual';

  // Số ngày nghỉ = số ngày lịch (bao gồm 2 đầu mút).
  const start = new Date(v.startDate);
  const end = new Date(v.endDate);
  const days =
    Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (days <= 0) return { ok: false, error: 'Khoảng ngày không hợp lệ.' };

  try {
    await db.insert(leaveRequests).values({
      employeeId,
      type,
      startDate: v.startDate,
      endDate: v.endDate,
      days: String(days),
      reason: v.reason || null,
      status: 'pending'
    });
    revalidatePath('/dashboard/attendance/leaves');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}

export async function approveLeave(id: string): Promise<Result> {
  try {
    await requireRole('manager');
  } catch {
    return { ok: false, error: 'Chỉ quản lý trở lên được phê duyệt.' };
  }
  const approverId = await getCurrentEmployeeId();

  const [leave] = await db
    .select()
    .from(leaveRequests)
    .where(eq(leaveRequests.id, id))
    .limit(1);
  if (!leave) return { ok: false, error: 'Không tìm thấy đơn.' };
  if (leave.status !== 'pending')
    return { ok: false, error: 'Đơn đã được xử lý.' };

  await db.transaction(async (tx) => {
    await tx
      .update(leaveRequests)
      .set({ status: 'approved', approverId: approverId ?? null })
      .where(eq(leaveRequests.id, id));

    // Chỉ phép năm mới trừ vào số dư phép.
    if (leave.type === 'annual') {
      const year = new Date(leave.startDate).getFullYear();
      const updated = await tx
        .update(leaveBalances)
        .set({ usedDays: sql`${leaveBalances.usedDays} + ${leave.days}` })
        .where(
          and(
            eq(leaveBalances.employeeId, leave.employeeId),
            eq(leaveBalances.year, year)
          )
        )
        .returning({ id: leaveBalances.id });

      if (updated.length === 0) {
        await tx.insert(leaveBalances).values({
          employeeId: leave.employeeId,
          year,
          usedDays: leave.days
        });
      }
    }
  });

  revalidatePath('/dashboard/attendance/leaves');
  revalidatePath('/dashboard/attendance/leave-balances');
  return { ok: true };
}

export async function rejectLeave(id: string): Promise<Result> {
  try {
    await requireRole('manager');
  } catch {
    return { ok: false, error: 'Chỉ quản lý trở lên được phê duyệt.' };
  }
  await db
    .update(leaveRequests)
    .set({ status: 'rejected' })
    .where(eq(leaveRequests.id, id));
  revalidatePath('/dashboard/attendance/leaves');
  return { ok: true };
}
