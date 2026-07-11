'use server';

import { revalidatePath } from 'next/cache';
import { asc } from 'drizzle-orm';

import { db } from '@/db';
import { shifts } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

export async function listShifts() {
  await requireRole('manager');
  return db.select().from(shifts).orderBy(asc(shifts.code)).limit(200);
}

const TYPES = ['office', 'split', 'night', 'rotating'] as const;

export async function createShift(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.code || !v.name || !v.startTime || !v.endTime)
    return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  if (!TYPES.includes(v.type as (typeof TYPES)[number]))
    return { ok: false, error: 'Loại ca không hợp lệ.' };
  try {
    await db.insert(shifts).values({
      code: v.code,
      name: v.name,
      type: v.type as (typeof TYPES)[number],
      startTime: v.startTime,
      endTime: v.endTime,
      breakMinutes: v.breakMinutes ? Number(v.breakMinutes) : 0,
      standardHours: v.standardHours || '8'
    });
    revalidatePath('/dashboard/attendance/shifts');
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Lỗi';
    if (msg.includes('code')) return { ok: false, error: 'Mã ca đã tồn tại.' };
    return { ok: false, error: msg };
  }
}
