'use server';

import { revalidatePath } from 'next/cache';
import { asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { salaryScales } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

export async function listSalaryScales() {
  await requireRole('hr');
  return db.select().from(salaryScales).orderBy(asc(salaryScales.code)).limit(200);
}

export async function updateSalaryScale(id: string, v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  try {
    await db
      .update(salaryScales)
      .set({
        grade: v.grade || undefined,
        step: v.step ? Number(v.step) : undefined,
        minSalary: v.minSalary || undefined,
        maxSalary: v.maxSalary || undefined,
        coefficient: v.coefficient || null
      })
      .where(eq(salaryScales.id, id));
    revalidatePath('/dashboard/payroll/salary-scales');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}

export async function deleteSalaryScale(id: string): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  try {
    await db.delete(salaryScales).where(eq(salaryScales.id, id));
    revalidatePath('/dashboard/payroll/salary-scales');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}

export async function createSalaryScale(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.code || !v.grade || !v.step || !v.minSalary || !v.maxSalary)
    return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  try {
    await db.insert(salaryScales).values({
      code: v.code,
      grade: v.grade,
      step: Number(v.step),
      minSalary: v.minSalary,
      maxSalary: v.maxSalary,
      coefficient: v.coefficient || null
    });
    revalidatePath('/dashboard/payroll/salary-scales');
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Lỗi';
    if (msg.includes('code')) return { ok: false, error: 'Mã ngạch/bậc đã tồn tại.' };
    return { ok: false, error: msg };
  }
}
