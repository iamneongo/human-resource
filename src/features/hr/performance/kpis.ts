'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { departments, employees, kpis } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

const SCOPES = ['company', 'department', 'individual'] as const;

export async function listKpis() {
  await requireRole('manager');
  return db
    .select({
      id: kpis.id,
      name: kpis.name,
      scope: kpis.scope,
      unit: kpis.unit,
      target: kpis.target,
      weight: kpis.weight,
      period: kpis.period,
      departmentName: departments.name,
      employeeName: employees.fullName
    })
    .from(kpis)
    .leftJoin(departments, eq(kpis.departmentId, departments.id))
    .leftJoin(employees, eq(kpis.employeeId, employees.id))
    .orderBy(desc(kpis.createdAt))
    .limit(300);
}

export async function createKpi(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.name || !v.scope)
    return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  if (!SCOPES.includes(v.scope as (typeof SCOPES)[number]))
    return { ok: false, error: 'Cấp giao KPI không hợp lệ.' };
  try {
    await db.insert(kpis).values({
      name: v.name,
      scope: v.scope,
      departmentId: v.departmentId || null,
      employeeId: v.employeeId || null,
      unit: v.unit || null,
      target: v.target || null,
      weight: v.weight || null,
      period: v.period || null
    });
    revalidatePath('/dashboard/performance/kpis');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}
