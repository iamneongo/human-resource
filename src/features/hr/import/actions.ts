'use server';

import { revalidatePath } from 'next/cache';
import { inArray } from 'drizzle-orm';

import { db } from '@/db';
import { departments, employeeProfiles, employees, positions } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

import { type EmployeeImportRow, toGender, toISODate } from './normalize';

export type ImportResult =
  | { ok: true; inserted: number; skipped: number; errors: string[] }
  | { ok: false; error: string };

/**
 * Import danh sách nhân viên từ dữ liệu đã map cột.
 * Bỏ qua mã trùng, tự tạo phòng ban/chức vụ còn thiếu.
 */
export async function importEmployees(rows: EmployeeImportRow[]): Promise<ImportResult> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Bạn không có quyền import.' };
  }
  if (!Array.isArray(rows) || rows.length === 0)
    return { ok: false, error: 'Không có dữ liệu để import.' };
  if (rows.length > 5000) return { ok: false, error: 'Tối đa 5000 dòng mỗi lần import.' };

  const errors: string[] = [];

  // Lọc dòng hợp lệ (bắt buộc mã + tên)
  const valid = rows.filter((r, i) => {
    if (!r.employeeCode?.trim() || !r.fullName?.trim()) {
      errors.push(`Dòng ${i + 1}: thiếu mã hoặc họ tên.`);
      return false;
    }
    return true;
  });
  if (valid.length === 0) return { ok: false, error: 'Tất cả dòng đều thiếu mã hoặc họ tên.' };

  // Bỏ mã đã tồn tại
  const codes = valid.map((r) => r.employeeCode!.trim());
  const existing = await db
    .select({ code: employees.employeeCode })
    .from(employees)
    .where(inArray(employees.employeeCode, codes));
  const existingSet = new Set(existing.map((e) => e.code));

  // Resolve/tạo phòng ban & chức vụ
  const deptNames = [
    ...new Set(valid.map((r) => r.department?.trim()).filter(Boolean))
  ] as string[];
  const posNames = [...new Set(valid.map((r) => r.position?.trim()).filter(Boolean))] as string[];

  const deptMap = await ensureLookup(deptNames, 'dept');
  const posMap = await ensureLookup(posNames, 'pos');

  const toInsert: (typeof employees.$inferInsert)[] = [];
  const profiles = new Map<string, Omit<typeof employeeProfiles.$inferInsert, 'employeeId'>>();
  const seen = new Set<string>();
  let skipped = 0;

  for (const r of valid) {
    const code = r.employeeCode!.trim();
    if (existingSet.has(code) || seen.has(code)) {
      skipped++;
      continue;
    }
    seen.add(code);
    toInsert.push({
      employeeCode: code,
      fullName: r.fullName!.trim(),
      dateOfBirth: toISODate(r.dateOfBirth),
      gender: toGender(r.gender),
      soCccd: r.soCccd?.trim() || null,
      phone: r.phone?.trim() || null,
      email: r.email?.trim() || null,
      hireDate: toISODate(r.hireDate),
      seniorityDate: toISODate(r.seniorityDate),
      status: 'active',
      departmentId: r.department ? (deptMap.get(r.department.trim()) ?? null) : null,
      positionId: r.position ? (posMap.get(r.position.trim()) ?? null) : null
    });
    profiles.set(code, {
      birthPlace: r.birthPlace?.trim() || null,
      permanentAddress: r.permanentAddress?.trim() || null
    });
  }

  if (toInsert.length === 0) return { ok: true, inserted: 0, skipped, errors };

  try {
    const inserted: { id: string; employeeCode: string }[] = [];
    for (let i = 0; i < toInsert.length; i += 500) {
      const res = await db
        .insert(employees)
        .values(toInsert.slice(i, i + 500))
        .returning({ id: employees.id, employeeCode: employees.employeeCode });
      inserted.push(...res);
    }
    const profileRows = inserted
      .map((e) => {
        const p = profiles.get(e.employeeCode);
        return p ? { employeeId: e.id, ...p } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    for (let i = 0; i < profileRows.length; i += 500) {
      await db.insert(employeeProfiles).values(profileRows.slice(i, i + 500));
    }
    revalidatePath('/dashboard/hr/employees');
    return { ok: true, inserted: inserted.length, skipped, errors };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi import' };
  }
}

/** Lấy map name->id, tạo mới bản ghi còn thiếu. */
async function ensureLookup(names: string[], kind: 'dept' | 'pos') {
  const map = new Map<string, string>();
  if (names.length === 0) return map;

  if (kind === 'dept') {
    const rows = await db.select({ id: departments.id, name: departments.name }).from(departments);
    for (const r of rows) map.set(r.name, r.id);
    const missing = names.filter((n) => !map.has(n));
    if (missing.length) {
      const created = await db
        .insert(departments)
        .values(
          missing.map((name, i) => ({
            code: `IMP-D-${Date.now()}-${i}`,
            name,
            type: 'department' as const
          }))
        )
        .returning({ id: departments.id, name: departments.name });
      for (const r of created) map.set(r.name, r.id);
    }
  } else {
    const rows = await db.select({ id: positions.id, title: positions.title }).from(positions);
    for (const r of rows) map.set(r.title, r.id);
    const missing = names.filter((n) => !map.has(n));
    if (missing.length) {
      const created = await db
        .insert(positions)
        .values(missing.map((title, i) => ({ code: `IMP-P-${Date.now()}-${i}`, title })))
        .returning({ id: positions.id, title: positions.title });
      for (const r of created) map.set(r.title, r.id);
    }
  }
  return map;
}
