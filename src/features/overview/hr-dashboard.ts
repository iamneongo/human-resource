'use server';

import { count, eq } from 'drizzle-orm';

import { db } from '@/db';
import { departments, employees, payrollRuns, payslips } from '@/db/schema';

export type HrDashboardData = {
  byDept: { name: string; value: number }[];
  byStatus: { status: string; label: string; value: number }[];
  payrollByPeriod: { period: string; net: number; gross: number }[];
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Đang làm việc',
  probation: 'Thử việc',
  on_leave: 'Nghỉ phép',
  terminated: 'Đã nghỉ'
};

export async function hrDashboardData(): Promise<HrDashboardData> {
  try {
    const [byDept, byStatus, payslipRows] = await Promise.all([
      db
        .select({ name: departments.name, value: count() })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .groupBy(departments.name),
      db
        .select({ status: employees.status, value: count() })
        .from(employees)
        .groupBy(employees.status),
      db
        .select({
          period: payrollRuns.period,
          net: payslips.netPay,
          gross: payslips.grossPay
        })
        .from(payslips)
        .leftJoin(payrollRuns, eq(payslips.payrollRunId, payrollRuns.id))
    ]);

    const payrollMap = new Map<string, { net: number; gross: number }>();
    for (const r of payslipRows) {
      const key = r.period ?? '—';
      const acc = payrollMap.get(key) ?? { net: 0, gross: 0 };
      acc.net += Number(r.net);
      acc.gross += Number(r.gross);
      payrollMap.set(key, acc);
    }

    return {
      byDept: byDept.map((r) => ({
        name: r.name ?? 'Chưa phân bổ',
        value: Number(r.value)
      })),
      byStatus: byStatus.map((r) => ({
        status: r.status,
        label: STATUS_LABEL[r.status] ?? r.status,
        value: Number(r.value)
      })),
      payrollByPeriod: Array.from(payrollMap.entries())
        .map(([period, v]) => ({ period, ...v }))
        .sort((a, b) => a.period.localeCompare(b.period))
    };
  } catch {
    return { byDept: [], byStatus: [], payrollByPeriod: [] };
  }
}
