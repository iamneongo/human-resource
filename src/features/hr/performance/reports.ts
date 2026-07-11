'use server';

import { isNotNull } from 'drizzle-orm';

import { db } from '@/db';
import { evaluations } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

/** Phân bố xếp loại (bell-curve) từ kết quả đánh giá đã chốt. */
export async function performanceDistribution() {
  await requireRole('manager');
  const rows = await db
    .select({ ranking: evaluations.ranking, finalScore: evaluations.finalScore })
    .from(evaluations)
    .where(isNotNull(evaluations.finalScore));

  const bands: Record<string, { label: string; count: number }> = {
    A: { label: 'A · Xuất sắc (≥90)', count: 0 },
    B: { label: 'B · Tốt (75-89)', count: 0 },
    C: { label: 'C · Đạt (60-74)', count: 0 },
    D: { label: 'D · Cần cải thiện (<60)', count: 0 }
  };
  for (const r of rows) {
    const k = r.ranking ?? 'D';
    if (bands[k]) bands[k].count += 1;
  }

  const total = rows.length;
  return {
    total,
    bands: Object.entries(bands).map(([id, v]) => ({
      id,
      label: v.label,
      count: v.count,
      percent: total > 0 ? Math.round((v.count / total) * 100) : 0
    }))
  };
}
