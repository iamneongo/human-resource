'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { employees, salaryInfos } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

export async function listSalaryInfos() {
  // Dữ liệu lương nhạy cảm -> chỉ HR trở lên.
  await requireRole('hr');
  return db
    .select({
      id: salaryInfos.id,
      baseSalary: salaryInfos.baseSalary,
      fixedAllowance: salaryInfos.fixedAllowance,
      commercialInsurancePackage: salaryInfos.commercialInsurancePackage,
      effectiveFrom: salaryInfos.effectiveFrom,
      employeeName: employees.fullName,
      employeeCode: employees.employeeCode
    })
    .from(salaryInfos)
    .leftJoin(employees, eq(salaryInfos.employeeId, employees.id))
    .orderBy(desc(salaryInfos.effectiveFrom))
    .limit(200);
}

export async function createSalaryInfo(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.employeeId || !v.baseSalary || !v.effectiveFrom)
    return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  try {
    await db.insert(salaryInfos).values({
      employeeId: v.employeeId,
      baseSalary: v.baseSalary,
      fixedAllowance: v.fixedAllowance || '0',
      commercialInsurancePackage: v.commercialInsurancePackage || null,
      effectiveFrom: v.effectiveFrom
    });
    revalidatePath('/dashboard/hr/salary-info');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}
