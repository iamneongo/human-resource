'use server';

import { revalidatePath } from 'next/cache';
import { asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { competencies, departments } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

const GROUPS = ['core', 'knowledge', 'skill', 'attitude'] as const;

export async function listCompetencies() {
  await requireRole('manager');
  return db
    .select({
      id: competencies.id,
      code: competencies.code,
      name: competencies.name,
      group: competencies.group,
      maxLevel: competencies.maxLevel,
      departmentName: departments.name
    })
    .from(competencies)
    .leftJoin(departments, eq(competencies.departmentId, departments.id))
    .orderBy(asc(competencies.code))
    .limit(300);
}

export async function createCompetency(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.code || !v.name || !v.group)
    return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  if (!GROUPS.includes(v.group as (typeof GROUPS)[number]))
    return { ok: false, error: 'Nhóm năng lực không hợp lệ.' };
  try {
    await db.insert(competencies).values({
      code: v.code,
      name: v.name,
      group: v.group as (typeof GROUPS)[number],
      departmentId: v.departmentId || null,
      description: v.description || null,
      maxLevel: v.maxLevel ? Number(v.maxLevel) : 5
    });
    revalidatePath('/dashboard/performance/competencies');
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Lỗi';
    if (msg.includes('code')) return { ok: false, error: 'Mã năng lực đã tồn tại.' };
    return { ok: false, error: msg };
  }
}
