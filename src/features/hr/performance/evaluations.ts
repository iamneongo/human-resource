'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { employees, evaluations, reviewCycles } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

export async function listEvaluations() {
  await requireRole('manager');
  return db
    .select({
      id: evaluations.id,
      cycleName: reviewCycles.name,
      employeeName: employees.fullName,
      selfScore: evaluations.selfScore,
      managerScore: evaluations.managerScore,
      finalScore: evaluations.finalScore,
      ranking: evaluations.ranking,
      status: evaluations.status
    })
    .from(evaluations)
    .leftJoin(reviewCycles, eq(evaluations.cycleId, reviewCycles.id))
    .leftJoin(employees, eq(evaluations.employeeId, employees.id))
    .orderBy(desc(evaluations.createdAt))
    .limit(300);
}

export async function createEvaluation(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.cycleId || !v.employeeId)
    return { ok: false, error: 'Thiếu chu kỳ hoặc nhân viên.' };
  try {
    await db.insert(evaluations).values({
      cycleId: v.cycleId,
      employeeId: v.employeeId,
      status: 'pending'
    });
    revalidatePath('/dashboard/performance/cycles');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}

/** Xếp loại theo điểm cuối (thang 100). */
function rankOf(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

/**
 * Chấm điểm & chốt: điểm cuối = trung bình tự đánh giá và quản lý chấm.
 * Nhân viên (self) hoặc quản lý (manager) có thể cập nhật phần của mình.
 */
export async function scoreEvaluation(v: Record<string, string>): Promise<Result> {
  const id = v.id;
  if (!id) return { ok: false, error: 'Thiếu mã đánh giá.' };

  const [row] = await db
    .select()
    .from(evaluations)
    .where(eq(evaluations.id, id))
    .limit(1);
  if (!row) return { ok: false, error: 'Không tìm thấy đánh giá.' };

  const self = v.selfScore !== undefined && v.selfScore !== ''
    ? Number(v.selfScore)
    : row.selfScore !== null
      ? Number(row.selfScore)
      : null;

  // Quản lý chấm điểm -> yêu cầu quyền manager.
  const managerProvided = v.managerScore !== undefined && v.managerScore !== '';
  if (managerProvided) {
    try {
      await requireRole('manager');
    } catch {
      return { ok: false, error: 'Chỉ quản lý được chấm điểm quản lý.' };
    }
  } else {
    await requireRole('employee');
  }
  const manager = managerProvided
    ? Number(v.managerScore)
    : row.managerScore !== null
      ? Number(row.managerScore)
      : null;

  let finalScore: number | null = null;
  let status = row.status;
  if (self !== null && manager !== null) {
    finalScore = Math.round((self + manager) / 2);
    status = 'finalized';
  } else if (manager !== null) {
    status = 'manager_done';
  } else if (self !== null) {
    status = 'self_done';
  }

  await db
    .update(evaluations)
    .set({
      selfScore: self !== null ? String(self) : null,
      managerScore: manager !== null ? String(manager) : null,
      finalScore: finalScore !== null ? String(finalScore) : null,
      ranking: finalScore !== null ? rankOf(finalScore) : null,
      comment: v.comment || row.comment,
      status
    })
    .where(eq(evaluations.id, id));

  revalidatePath('/dashboard/performance/cycles');
  revalidatePath('/dashboard/performance/reports');
  return { ok: true };
}
