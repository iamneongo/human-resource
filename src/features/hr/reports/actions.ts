'use server';

import { count, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { departments, employees } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

export async function hrReport() {
  await requireRole('manager');

  const [byStatus, byDept, totals] = await Promise.all([
    db
      .select({ status: employees.status, total: count() })
      .from(employees)
      .groupBy(employees.status),
    db
      .select({ department: departments.name, total: count() })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .groupBy(departments.name),
    db
      .select({
        total: count(),
        terminated: sql<number>`count(*) filter (where ${employees.status} = 'terminated')`,
        active: sql<number>`count(*) filter (where ${employees.status} = 'active')`
      })
      .from(employees)
  ]);

  const t = totals[0] ?? { total: 0, terminated: 0, active: 0 };
  const turnoverRate =
    Number(t.total) > 0
      ? (Number(t.terminated) / Number(t.total)) * 100
      : 0;

  return {
    total: Number(t.total),
    active: Number(t.active),
    terminated: Number(t.terminated),
    turnoverRate,
    byStatus: byStatus.map((r) => ({ ...r, total: Number(r.total) })),
    byDept: byDept.map((r) => ({
      department: r.department ?? 'Chưa phân bổ',
      total: Number(r.total)
    }))
  };
}
