'use server';

import { revalidatePath } from 'next/cache';
import { and, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';

import { db } from '@/db';
import { departments, employees, leaveBalances, leaveRequests } from '@/db/schema';
import { getCurrentEmployeeId, getCurrentRole, requireRole, roleAtLeast } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

const LEAVE_STATUSES = ['draft', 'pending', 'approved', 'rejected', 'cancelled'] as const;
const TYPES = ['annual', 'sick', 'maternity', 'unpaid', 'other'] as const;

function normalizeReason(value: string | undefined) {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

function getDateRangeDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;

  return { start, end, days };
}

async function hasOverlappingLeave(employeeId: string, startDate: string, endDate: string) {
  const rows = await db
    .select({ id: leaveRequests.id })
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.employeeId, employeeId),
        or(eq(leaveRequests.status, 'pending'), eq(leaveRequests.status, 'approved')),
        lte(leaveRequests.startDate, endDate),
        gte(leaveRequests.endDate, startDate)
      )
    )
    .limit(1);

  return rows.length > 0;
}

export async function listLeaves(filters?: {
  onlyEmployeeId?: string;
  employeeId?: string;
  departmentId?: string;
  type?: string;
  status?: string;
  search?: string;
}) {
  await requireRole('employee');

  const currentYear = new Date().getFullYear();
  return db
    .select({
      id: leaveRequests.id,
      employeeId: leaveRequests.employeeId,
      type: leaveRequests.type,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      days: leaveRequests.days,
      reason: leaveRequests.reason,
      status: leaveRequests.status,
      approverId: leaveRequests.approverId,
      createdAt: leaveRequests.createdAt,
      updatedAt: leaveRequests.updatedAt,
      employeeName: employees.fullName,
      employeeCode: employees.employeeCode,
      departmentId: employees.departmentId,
      departmentName: departments.name,
      entitledDays: leaveBalances.entitledDays,
      usedDays: leaveBalances.usedDays,
      remainingDays: sql<string>`coalesce(${leaveBalances.entitledDays}, 0) - coalesce(${leaveBalances.usedDays}, 0)`
    })
    .from(leaveRequests)
    .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(
      leaveBalances,
      and(
        eq(leaveBalances.employeeId, leaveRequests.employeeId),
        eq(leaveBalances.year, currentYear)
      )
    )
    .where(
      and(
        filters?.onlyEmployeeId ? eq(leaveRequests.employeeId, filters.onlyEmployeeId) : undefined,
        filters?.employeeId ? eq(leaveRequests.employeeId, filters.employeeId) : undefined,
        filters?.departmentId ? eq(employees.departmentId, filters.departmentId) : undefined,
        filters?.type && TYPES.includes(filters.type as (typeof TYPES)[number])
          ? eq(leaveRequests.type, filters.type as (typeof TYPES)[number])
          : undefined,
        filters?.status &&
          LEAVE_STATUSES.includes(filters.status as (typeof LEAVE_STATUSES)[number])
          ? eq(leaveRequests.status, filters.status as (typeof LEAVE_STATUSES)[number])
          : undefined,
        filters?.search
          ? or(
              ilike(employees.fullName, `%${filters.search}%`),
              ilike(employees.employeeCode, `%${filters.search}%`),
              ilike(departments.name, `%${filters.search}%`)
            )
          : undefined
      )
    )
    .orderBy(desc(leaveRequests.startDate))
    .limit(300);
}

export async function createLeave(v: Record<string, string>): Promise<Result> {
  await requireRole('employee');

  const employeeId = v.employeeId || (await getCurrentEmployeeId());
  if (!employeeId) {
    return { ok: false, error: 'Không xác định được nhân sự.' };
  }
  if (!v.type || !v.startDate || !v.endDate) {
    return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  }

  const type = TYPES.includes(v.type as (typeof TYPES)[number])
    ? (v.type as (typeof TYPES)[number])
    : 'annual';
  const { start, end, days } = getDateRangeDays(v.startDate, v.endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, error: 'Ngày nghỉ phép không hợp lệ.' };
  }
  if (days <= 0) {
    return { ok: false, error: 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.' };
  }
  if (await hasOverlappingLeave(employeeId, v.startDate, v.endDate)) {
    return {
      ok: false,
      error: 'Nhân sự đã có đơn nghỉ chờ duyệt hoặc đã duyệt trùng khoảng ngày này.'
    };
  }

  try {
    await db.insert(leaveRequests).values({
      employeeId,
      type,
      startDate: v.startDate,
      endDate: v.endDate,
      days: String(days),
      reason: normalizeReason(v.reason),
      status: 'pending'
    });

    revalidatePath('/dashboard/attendance/leaves');
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không tạo được đơn nghỉ.'
    };
  }
}

export async function approveLeave(id: string): Promise<Result> {
  try {
    await requireRole('manager');
  } catch {
    return { ok: false, error: 'Chỉ quản lý trở lên được phê duyệt.' };
  }

  const approverId = await getCurrentEmployeeId();
  const [leave] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).limit(1);

  if (!leave) {
    return { ok: false, error: 'Không tìm thấy đơn.' };
  }
  if (leave.status !== 'pending') {
    return { ok: false, error: 'Đơn đã được xử lý.' };
  }

  if (leave.type === 'annual') {
    const year = new Date(leave.startDate).getFullYear();
    const [balance] = await db
      .select()
      .from(leaveBalances)
      .where(and(eq(leaveBalances.employeeId, leave.employeeId), eq(leaveBalances.year, year)))
      .limit(1);

    const remaining = balance ? Number(balance.entitledDays) - Number(balance.usedDays) : 0;
    if (Number(leave.days) > remaining) {
      return {
        ok: false,
        error: `Vượt số dư phép năm (còn ${remaining} ngày, đơn ${leave.days} ngày).`
      };
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(leaveRequests)
      .set({ status: 'approved', approverId: approverId ?? null })
      .where(eq(leaveRequests.id, id));

    if (leave.type === 'annual') {
      const year = new Date(leave.startDate).getFullYear();
      const updated = await tx
        .update(leaveBalances)
        .set({ usedDays: sql`${leaveBalances.usedDays} + ${leave.days}` })
        .where(and(eq(leaveBalances.employeeId, leave.employeeId), eq(leaveBalances.year, year)))
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
  revalidatePath('/dashboard/attendance/timesheets');
  return { ok: true };
}

export async function rejectLeave(id: string): Promise<Result> {
  try {
    await requireRole('manager');
  } catch {
    return { ok: false, error: 'Chỉ quản lý trở lên được phê duyệt.' };
  }

  await db.update(leaveRequests).set({ status: 'rejected' }).where(eq(leaveRequests.id, id));
  revalidatePath('/dashboard/attendance/leaves');
  return { ok: true };
}

export async function cancelLeave(id: string): Promise<Result> {
  try {
    await requireRole('employee');
  } catch {
    return { ok: false, error: 'Bạn cần đăng nhập để hủy đơn nghỉ.' };
  }

  const role = await getCurrentRole();
  const currentEmployeeId = await getCurrentEmployeeId();
  const [leave] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).limit(1);

  if (!leave) {
    return { ok: false, error: 'Không tìm thấy đơn nghỉ.' };
  }
  if (!roleAtLeast(role, 'manager') && leave.employeeId !== currentEmployeeId) {
    return { ok: false, error: 'Bạn chỉ được hủy đơn nghỉ do chính mình tạo.' };
  }
  if (!['draft', 'pending'].includes(leave.status)) {
    return { ok: false, error: 'Chỉ hủy được đơn nghỉ ở trạng thái nháp hoặc chờ duyệt.' };
  }

  await db.update(leaveRequests).set({ status: 'cancelled' }).where(eq(leaveRequests.id, id));
  revalidatePath('/dashboard/attendance/leaves');
  return { ok: true };
}
