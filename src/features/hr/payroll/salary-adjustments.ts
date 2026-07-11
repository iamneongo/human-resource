'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { employees, salaryAdjustments } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

const TYPES = ['raise', 'cut', 'allowance', 'bonus', 'penalty', 'other'] as const;

export async function listSalaryAdjustments() {
  await requireRole('hr');
  return db
    .select({
      id: salaryAdjustments.id,
      type: salaryAdjustments.type,
      amount: salaryAdjustments.amount,
      effectiveMonth: salaryAdjustments.effectiveMonth,
      note: salaryAdjustments.note,
      employeeName: employees.fullName
    })
    .from(salaryAdjustments)
    .leftJoin(employees, eq(salaryAdjustments.employeeId, employees.id))
    .orderBy(desc(salaryAdjustments.effectiveMonth))
    .limit(200);
}

export async function createSalaryAdjustment(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.employeeId || !v.type || !v.amount || !v.effectiveMonth)
    return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  if (!TYPES.includes(v.type as (typeof TYPES)[number]))
    return { ok: false, error: 'Loại biến động không hợp lệ.' };
  try {
    await db.insert(salaryAdjustments).values({
      employeeId: v.employeeId,
      type: v.type as (typeof TYPES)[number],
      amount: v.amount,
      // Chuẩn hoá về ngày đầu tháng (YYYY-MM -> YYYY-MM-01).
      effectiveMonth: v.effectiveMonth.length === 7 ? `${v.effectiveMonth}-01` : v.effectiveMonth,
      note: v.note || null
    });
    revalidatePath('/dashboard/payroll/adjustments');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}
