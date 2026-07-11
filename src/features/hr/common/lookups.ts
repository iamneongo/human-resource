'use server';

import { asc } from 'drizzle-orm';

import { db } from '@/db';
import { departments, employees, positions } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

export type Option = { value: string; label: string };

/** Danh sách nhân viên (id + tên) cho dropdown. */
export async function employeeOptions(): Promise<Option[]> {
  await requireRole('manager');
  const rows = await db
    .select({
      id: employees.id,
      code: employees.employeeCode,
      name: employees.fullName
    })
    .from(employees)
    .orderBy(asc(employees.employeeCode));
  return rows.map((r) => ({ value: r.id, label: `${r.code} · ${r.name}` }));
}

export async function departmentOptions(): Promise<Option[]> {
  await requireRole('manager');
  const rows = await db
    .select({ id: departments.id, name: departments.name })
    .from(departments)
    .orderBy(asc(departments.name));
  return rows.map((r) => ({ value: r.id, label: r.name }));
}

export async function positionOptions(): Promise<Option[]> {
  await requireRole('manager');
  const rows = await db
    .select({ id: positions.id, title: positions.title })
    .from(positions)
    .orderBy(asc(positions.title));
  return rows.map((r) => ({ value: r.id, label: r.title }));
}
