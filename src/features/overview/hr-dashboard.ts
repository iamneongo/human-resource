'use server';

import { count, eq } from 'drizzle-orm';

import { db } from '@/db';
import { contracts, departments, employees, payrollRuns, payslips } from '@/db/schema';

export type HrDashboardData = {
  byDept: { name: string; value: number }[];
  byStatus: { status: string; label: string; value: number }[];
  byGender: { gender: string; label: string; value: number }[];
  byContractType: { type: string; label: string; value: number }[];
  headcountByYear: { year: string; hires: number; total: number }[];
  payrollByPeriod: { period: string; net: number; gross: number }[];
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Đang làm việc',
  probation: 'Thử việc',
  on_leave: 'Nghỉ phép',
  terminated: 'Đã nghỉ'
};

const GENDER_LABEL: Record<string, string> = {
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác'
};

const CONTRACT_TYPE_LABEL: Record<string, string> = {
  probation: 'Thử việc',
  fixed_term: 'Xác định thời hạn',
  term_1y: 'HĐLĐ 1 năm',
  term_3y: 'HĐLĐ 3 năm',
  indefinite: 'Không xác định thời hạn',
  until_retirement: 'Đến nghỉ hưu',
  seasonal: 'Thời vụ'
};

export async function hrDashboardData(): Promise<HrDashboardData> {
  try {
    const [byDept, byStatus, byGender, byContractType, hireRows, payslipRows] = await Promise.all([
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
        .select({ gender: employees.gender, value: count() })
        .from(employees)
        .groupBy(employees.gender),
      db
        .select({ type: contracts.type, value: count() })
        .from(contracts)
        .where(eq(contracts.status, 'active'))
        .groupBy(contracts.type),
      db.select({ hireDate: employees.hireDate }).from(employees),
      db
        .select({
          period: payrollRuns.period,
          net: payslips.netPay,
          gross: payslips.grossPay
        })
        .from(payslips)
        .leftJoin(payrollRuns, eq(payslips.payrollRunId, payrollRuns.id))
    ]);

    // Tuyển dụng & tổng nhân sự cộng dồn theo năm
    const hiresByYear = new Map<string, number>();
    for (const r of hireRows) {
      if (!r.hireDate) continue;
      const year = String(r.hireDate).slice(0, 4);
      if (!year) continue;
      hiresByYear.set(year, (hiresByYear.get(year) ?? 0) + 1);
    }
    const sortedYears = Array.from(hiresByYear.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    let running = 0;
    const headcountByYear = sortedYears.map(([year, hires]) => {
      running += hires;
      return { year, hires, total: running };
    });

    const payrollMap = new Map<string, { net: number; gross: number }>();
    for (const r of payslipRows) {
      const key = r.period ?? '—';
      const acc = payrollMap.get(key) ?? { net: 0, gross: 0 };
      acc.net += Number(r.net);
      acc.gross += Number(r.gross);
      payrollMap.set(key, acc);
    }

    return {
      byDept: byDept
        .map((r) => ({
          name: r.name ?? 'Chưa phân bổ',
          value: Number(r.value)
        }))
        .sort((a, b) => b.value - a.value),
      byStatus: byStatus.map((r) => ({
        status: r.status,
        label: STATUS_LABEL[r.status] ?? r.status,
        value: Number(r.value)
      })),
      byGender: byGender.map((r) => ({
        gender: r.gender ?? 'other',
        label: GENDER_LABEL[r.gender ?? 'other'] ?? 'Khác',
        value: Number(r.value)
      })),
      byContractType: byContractType
        .map((r) => ({
          type: r.type,
          label: CONTRACT_TYPE_LABEL[r.type] ?? r.type,
          value: Number(r.value)
        }))
        .sort((a, b) => b.value - a.value),
      headcountByYear,
      payrollByPeriod: Array.from(payrollMap.entries())
        .map(([period, v]) => ({ period, ...v }))
        .sort((a, b) => a.period.localeCompare(b.period))
    };
  } catch {
    return {
      byDept: [],
      byStatus: [],
      byGender: [],
      byContractType: [],
      headcountByYear: [],
      payrollByPeriod: []
    };
  }
}
