'use server';

import { revalidatePath } from 'next/cache';
import { asc } from 'drizzle-orm';

import { db } from '@/db';
import { payrollFormulas } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

export async function listFormulas() {
  await requireRole('hr');
  return db
    .select()
    .from(payrollFormulas)
    .orderBy(asc(payrollFormulas.code))
    .limit(200);
}

export async function createFormula(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.code || !v.name || !v.expression)
    return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  try {
    await db.insert(payrollFormulas).values({
      code: v.code,
      name: v.name,
      expression: v.expression,
      description: v.description || null,
      isActive: true
    });
    revalidatePath('/dashboard/payroll/formulas');
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Lỗi';
    if (msg.includes('code')) return { ok: false, error: 'Mã công thức đã tồn tại.' };
    return { ok: false, error: msg };
  }
}
