'use server';

import { revalidatePath } from 'next/cache';
import { desc } from 'drizzle-orm';

import { db } from '@/db';
import { insuranceTaxConfigs } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

import { DEFAULT_TAX_BRACKETS } from './constants';

type Result = { ok: true } | { ok: false; error: string };

export async function listInsuranceTaxConfigs() {
  await requireRole('hr');
  return db
    .select()
    .from(insuranceTaxConfigs)
    .orderBy(desc(insuranceTaxConfigs.effectiveFrom))
    .limit(50);
}

export async function createInsuranceTaxConfig(
  v: Record<string, string>
): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.effectiveFrom) return { ok: false, error: 'Thiếu ngày hiệu lực.' };
  try {
    await db.insert(insuranceTaxConfigs).values({
      effectiveFrom: v.effectiveFrom,
      socialInsuranceRate: v.socialInsuranceRate || '0.08',
      healthInsuranceRate: v.healthInsuranceRate || '0.015',
      unemploymentRate: v.unemploymentRate || '0.01',
      personalDeduction: v.personalDeduction || '11000000',
      dependentDeduction: v.dependentDeduction || '4400000',
      taxBrackets: DEFAULT_TAX_BRACKETS
    });
    revalidatePath('/dashboard/payroll/insurance-tax');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}
