'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { employees, payrollRuns, payslips } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

export async function listPayslips(runId?: string) {
  await requireRole('hr');
  const q = db
    .select({
      id: payslips.id,
      period: payrollRuns.period,
      employeeName: employees.fullName,
      employeeCode: employees.employeeCode,
      grossPay: payslips.grossPay,
      insuranceDeduction: payslips.insuranceDeduction,
      taxDeduction: payslips.taxDeduction,
      netPay: payslips.netPay,
      sentAt: payslips.sentAt
    })
    .from(payslips)
    .leftJoin(employees, eq(payslips.employeeId, employees.id))
    .leftJoin(payrollRuns, eq(payslips.payrollRunId, payrollRuns.id))
    .orderBy(desc(payrollRuns.period))
    .limit(500);
  if (runId) return q.where(eq(payslips.payrollRunId, runId));
  return q;
}

/** Mock: gửi phiếu lương (đánh dấu đã gửi). */
export async function sendPayslip(id: string): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  await db
    .update(payslips)
    .set({ sentAt: new Date() })
    .where(eq(payslips.id, id));
  revalidatePath('/dashboard/payroll/payslips');
  return { ok: true };
}

/** Báo cáo lương: tổng quỹ lương, BHXH, thuế theo kỳ gần nhất. */
export async function payrollReport() {
  await requireRole('hr');
  const rows = await db
    .select({
      period: payrollRuns.period,
      gross: payslips.grossPay,
      insurance: payslips.insuranceDeduction,
      tax: payslips.taxDeduction,
      net: payslips.netPay
    })
    .from(payslips)
    .leftJoin(payrollRuns, eq(payslips.payrollRunId, payrollRuns.id));

  const byPeriod = new Map<
    string,
    { gross: number; insurance: number; tax: number; net: number; count: number }
  >();
  for (const r of rows) {
    const key = r.period ?? '—';
    const acc = byPeriod.get(key) ?? { gross: 0, insurance: 0, tax: 0, net: 0, count: 0 };
    acc.gross += Number(r.gross);
    acc.insurance += Number(r.insurance);
    acc.tax += Number(r.tax);
    acc.net += Number(r.net);
    acc.count += 1;
    byPeriod.set(key, acc);
  }
  return Array.from(byPeriod.entries())
    .map(([period, v]) => ({ id: period, period, ...v }))
    .toSorted((a, b) => b.period.localeCompare(a.period));
}
