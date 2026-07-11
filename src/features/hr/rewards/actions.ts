'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { employees, rewardsDisciplines } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

export async function listRewards() {
  await requireRole('manager');
  return db
    .select({
      id: rewardsDisciplines.id,
      type: rewardsDisciplines.type,
      title: rewardsDisciplines.title,
      decisionNumber: rewardsDisciplines.decisionNumber,
      decisionDate: rewardsDisciplines.decisionDate,
      formOrValue: rewardsDisciplines.formOrValue,
      employeeName: employees.fullName
    })
    .from(rewardsDisciplines)
    .leftJoin(employees, eq(rewardsDisciplines.employeeId, employees.id))
    .orderBy(desc(rewardsDisciplines.decisionDate))
    .limit(200);
}

export async function createReward(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.employeeId || !v.type || !v.title || !v.decisionDate)
    return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  if (v.type !== 'reward' && v.type !== 'discipline')
    return { ok: false, error: 'Loại không hợp lệ.' };
  try {
    await db.insert(rewardsDisciplines).values({
      employeeId: v.employeeId,
      type: v.type,
      title: v.title,
      description: v.description || null,
      decisionNumber: v.decisionNumber || null,
      decisionDate: v.decisionDate,
      formOrValue: v.formOrValue || null
    });
    revalidatePath('/dashboard/hr/rewards');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}
