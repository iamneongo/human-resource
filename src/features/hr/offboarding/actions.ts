'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { employees, offboardings } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

import { OFFBOARDING_FLOW } from './constants';

type Result = { ok: true } | { ok: false; error: string };

export async function listOffboardings() {
  await requireRole('manager');
  return db
    .select({
      id: offboardings.id,
      resignationDate: offboardings.resignationDate,
      expectedLeaveDate: offboardings.expectedLeaveDate,
      reason: offboardings.reason,
      status: offboardings.status,
      employeeName: employees.fullName,
      employeeCode: employees.employeeCode
    })
    .from(offboardings)
    .leftJoin(employees, eq(offboardings.employeeId, employees.id))
    .orderBy(desc(offboardings.resignationDate))
    .limit(200);
}

export async function createOffboarding(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.employeeId || !v.resignationDate || !v.expectedLeaveDate)
    return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  try {
    await db.insert(offboardings).values({
      employeeId: v.employeeId,
      resignationDate: v.resignationDate,
      expectedLeaveDate: v.expectedLeaveDate,
      reason: v.reason || null,
      status: 'submitted'
    });
    revalidatePath('/dashboard/hr/offboarding');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}

/** Chuyển sang bước tiếp theo trong quy trình offboarding. */
export async function advanceOffboarding(id: string): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  const [row] = await db
    .select({ status: offboardings.status })
    .from(offboardings)
    .where(eq(offboardings.id, id))
    .limit(1);
  if (!row) return { ok: false, error: 'Không tìm thấy hồ sơ.' };
  const idx = OFFBOARDING_FLOW.indexOf(row.status as (typeof OFFBOARDING_FLOW)[number]);
  if (idx < 0 || idx >= OFFBOARDING_FLOW.length - 1)
    return { ok: false, error: 'Đã ở bước cuối.' };
  await db
    .update(offboardings)
    .set({ status: OFFBOARDING_FLOW[idx + 1] })
    .where(eq(offboardings.id, id));
  revalidatePath('/dashboard/hr/offboarding');
  return { ok: true };
}
