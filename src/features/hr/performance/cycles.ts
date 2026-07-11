'use server';

import { revalidatePath } from 'next/cache';
import { desc } from 'drizzle-orm';

import { db } from '@/db';
import { reviewCycles } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

const TYPES = ['monthly', 'quarterly', 'yearly', 'probation', 'review_360'] as const;

export async function listCycles() {
  await requireRole('manager');
  return db
    .select()
    .from(reviewCycles)
    .orderBy(desc(reviewCycles.startDate))
    .limit(100);
}

export async function createCycle(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.name || !v.type || !v.startDate || !v.endDate)
    return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  if (!TYPES.includes(v.type as (typeof TYPES)[number]))
    return { ok: false, error: 'Loại chu kỳ không hợp lệ.' };
  try {
    await db.insert(reviewCycles).values({
      name: v.name,
      type: v.type as (typeof TYPES)[number],
      startDate: v.startDate,
      endDate: v.endDate,
      status: 'draft'
    });
    revalidatePath('/dashboard/performance/cycles');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}
