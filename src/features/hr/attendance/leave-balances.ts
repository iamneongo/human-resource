'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { employees, leaveBalances } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

export async function listLeaveBalances(year = new Date().getFullYear()) {
  await requireRole('manager');
  return db
    .select({
      id: leaveBalances.id,
      year: leaveBalances.year,
      entitledDays: leaveBalances.entitledDays,
      accruedDays: leaveBalances.accruedDays,
      usedDays: leaveBalances.usedDays,
      remaining: sql<string>`${leaveBalances.entitledDays} - ${leaveBalances.usedDays}`,
      employeeName: employees.fullName,
      employeeCode: employees.employeeCode
    })
    .from(leaveBalances)
    .leftJoin(employees, eq(leaveBalances.employeeId, employees.id))
    .where(eq(leaveBalances.year, year))
    .limit(500);
}

/**
 * Tính lại quyền lợi phép năm cho tất cả nhân viên theo thâm niên.
 * Luật LĐ VN: 12 ngày phép/năm, +1 ngày cho mỗi 5 năm thâm niên.
 */
export async function recalcLeaveBalances(
  year = new Date().getFullYear()
): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }

  const emps = await db
    .select({ id: employees.id, hireDate: employees.hireDate })
    .from(employees);

  for (const e of emps) {
    const years = e.hireDate
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(e.hireDate).getTime()) /
              (365.25 * 86_400_000)
          )
        )
      : 0;
    const entitled = 12 + Math.floor(years / 5);

    const updated = await db
      .update(leaveBalances)
      .set({ entitledDays: String(entitled) })
      .where(
        and(eq(leaveBalances.employeeId, e.id), eq(leaveBalances.year, year))
      )
      .returning({ id: leaveBalances.id });

    if (updated.length === 0) {
      await db.insert(leaveBalances).values({
        employeeId: e.id,
        year,
        entitledDays: String(entitled)
      });
    }
  }

  revalidatePath('/dashboard/attendance/leave-balances');
  return { ok: true };
}
