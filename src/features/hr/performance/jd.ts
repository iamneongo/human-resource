'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { jobDescriptions, positions } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

export async function listJDs() {
  await requireRole('manager');
  return db
    .select({
      id: jobDescriptions.id,
      title: jobDescriptions.title,
      summary: jobDescriptions.summary,
      positionTitle: positions.title
    })
    .from(jobDescriptions)
    .leftJoin(positions, eq(jobDescriptions.positionId, positions.id))
    .orderBy(desc(jobDescriptions.createdAt))
    .limit(200);
}

export async function createJD(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.positionId || !v.title)
    return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  try {
    await db.insert(jobDescriptions).values({
      positionId: v.positionId,
      title: v.title,
      summary: v.summary || null,
      responsibilities: v.responsibilities || null,
      requirements: v.requirements || null
    });
    revalidatePath('/dashboard/performance/jd');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}
