'use server';

import { revalidatePath } from 'next/cache';
import { asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { attendanceDevices } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

export async function listDevices() {
  await requireRole('manager');
  return db
    .select()
    .from(attendanceDevices)
    .orderBy(asc(attendanceDevices.code))
    .limit(200);
}

export async function createDevice(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.code || !v.name) return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  try {
    await db.insert(attendanceDevices).values({
      code: v.code,
      name: v.name,
      location: v.location || null,
      ipAddress: v.ipAddress || null,
      kind: v.kind || null
    });
    revalidatePath('/dashboard/attendance/devices');
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Lỗi';
    if (msg.includes('code')) return { ok: false, error: 'Mã thiết bị đã tồn tại.' };
    return { ok: false, error: msg };
  }
}

/** Mock: đồng bộ dữ liệu thô từ thiết bị (cập nhật thời điểm đồng bộ). */
export async function syncDevice(id: string): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  await db
    .update(attendanceDevices)
    .set({ lastSyncAt: new Date() })
    .where(eq(attendanceDevices.id, id));
  revalidatePath('/dashboard/attendance/devices');
  return { ok: true };
}
