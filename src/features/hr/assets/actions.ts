'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { assets, employees } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

export async function listAssets() {
  await requireRole('manager');
  return db
    .select({
      id: assets.id,
      name: assets.name,
      type: assets.type,
      assetCode: assets.assetCode,
      issueDate: assets.issueDate,
      returnDate: assets.returnDate,
      status: assets.status,
      employeeName: employees.fullName
    })
    .from(assets)
    .leftJoin(employees, eq(assets.employeeId, employees.id))
    .orderBy(desc(assets.createdAt))
    .limit(200);
}

const TYPES = ['laptop', 'device', 'uniform', 'other'] as const;

export async function createAsset(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.name || !v.type) return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  if (!TYPES.includes(v.type as (typeof TYPES)[number]))
    return { ok: false, error: 'Loại tài sản không hợp lệ.' };
  try {
    await db.insert(assets).values({
      employeeId: v.employeeId || null,
      name: v.name,
      type: v.type as (typeof TYPES)[number],
      assetCode: v.assetCode || null,
      issueDate: v.issueDate || null,
      status: v.employeeId ? 'assigned' : 'returned'
    });
    revalidatePath('/dashboard/hr/assets');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}
