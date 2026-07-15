'use server';

import { randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { and, desc, eq, isNotNull, ne } from 'drizzle-orm';

import { db } from '@/db';
import { departments, employees, payrollRuns, payslips } from '@/db/schema';
import { getCurrentEmployeeId, requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

type PayslipBreakdown = {
  snapshotType?: string;
  monthlyBaseSalary?: number;
  salaryPerDay?: number;
  workedDays?: number;
  workedHours?: number;
  paidHours?: number;
  salaryByAttendance?: number;
  fixedAllowance?: number;
  overtimeHours?: number;
  overtimePay?: number;
  otherAdjustments?: number;
  manualDays?: number;
  timesheetDays?: number;
};

type PayslipRow = {
  id: string;
  payrollRunId: string;
  employeeId: string;
  period: string | null;
  runStatus: string | null;
  employeeName: string | null;
  employeeCode: string | null;
  departmentId: string | null;
  departmentName: string | null;
  isPreview: boolean;
  baseSalary: string;
  allowances: string;
  overtimePay: string;
  grossPay: string;
  insuranceDeduction: string;
  taxDeduction: string;
  otherDeduction: string;
  netPay: string;
  breakdown: Record<string, number | string> | null;
  publicAccessCode: string | null;
  sentAt: Date | null;
};

function getBreakdown(value: unknown): PayslipBreakdown {
  return value && typeof value === 'object' ? (value as PayslipBreakdown) : {};
}

function normalizeAccessCode(code: string) {
  return code.trim().toUpperCase();
}

async function generateUniquePayslipAccessCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = normalizeAccessCode(`PL-${randomUUID().replace(/-/g, '').slice(0, 10)}`);
    const [existing] = await db
      .select({ id: payslips.id })
      .from(payslips)
      .where(eq(payslips.publicAccessCode, code))
      .limit(1);

    if (!existing) {
      return code;
    }
  }

  return normalizeAccessCode(`PL-${Date.now().toString(36)}-${randomUUID().slice(0, 4)}`);
}

function toPayslipView(row: PayslipRow) {
  const breakdown = getBreakdown(row.breakdown);
  return {
    ...row,
    monthlyBaseSalary: breakdown.monthlyBaseSalary ?? Number(row.baseSalary),
    salaryPerDay: breakdown.salaryPerDay ?? 0,
    workedDays: breakdown.workedDays ?? 0,
    workedHours: breakdown.workedHours ?? 0,
    paidHours: breakdown.paidHours ?? 0,
    salaryByAttendance: breakdown.salaryByAttendance ?? Number(row.baseSalary),
    fixedAllowance: breakdown.fixedAllowance ?? Number(row.allowances),
    overtimeHours: breakdown.overtimeHours ?? 0,
    otherAdjustments: breakdown.otherAdjustments ?? 0,
    manualDays: breakdown.manualDays ?? 0,
    timesheetDays: breakdown.timesheetDays ?? 0,
    snapshotType: breakdown.snapshotType ?? (row.isPreview ? 'preview' : 'locked')
  };
}

function getPayslipRows() {
  return db
    .select({
      id: payslips.id,
      payrollRunId: payslips.payrollRunId,
      employeeId: payslips.employeeId,
      period: payrollRuns.period,
      runStatus: payrollRuns.status,
      employeeName: employees.fullName,
      employeeCode: employees.employeeCode,
      departmentId: employees.departmentId,
      departmentName: departments.name,
      isPreview: payslips.isPreview,
      baseSalary: payslips.baseSalary,
      allowances: payslips.allowances,
      overtimePay: payslips.overtimePay,
      grossPay: payslips.grossPay,
      insuranceDeduction: payslips.insuranceDeduction,
      taxDeduction: payslips.taxDeduction,
      otherDeduction: payslips.otherDeduction,
      netPay: payslips.netPay,
      breakdown: payslips.breakdown,
      publicAccessCode: payslips.publicAccessCode,
      sentAt: payslips.sentAt
    })
    .from(payslips)
    .leftJoin(employees, eq(payslips.employeeId, employees.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(payrollRuns, eq(payslips.payrollRunId, payrollRuns.id));
}

export async function listPayslips(runId?: string) {
  await requireRole('hr');
  const query = getPayslipRows().orderBy(desc(payrollRuns.period)).limit(500);

  const rows = runId ? await query.where(eq(payslips.payrollRunId, runId)) : await query;
  return rows.map(toPayslipView);
}

export async function listMyPublishedPayslips(runId?: string) {
  await requireRole('employee');
  const employeeId = await getCurrentEmployeeId();
  if (!employeeId) {
    return [];
  }

  const rows = await getPayslipRows()
    .where(
      and(
        eq(payslips.employeeId, employeeId),
        eq(payslips.isPreview, false),
        isNotNull(payslips.sentAt),
        runId ? eq(payslips.payrollRunId, runId) : undefined
      )
    )
    .orderBy(desc(payrollRuns.period))
    .limit(100);

  return rows.map(toPayslipView);
}

export async function sendPayslip(id: string): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Bạn không có quyền phát hành phiếu lương.' };
  }

  const [row] = await db
    .select({
      isPreview: payslips.isPreview,
      publicAccessCode: payslips.publicAccessCode
    })
    .from(payslips)
    .where(eq(payslips.id, id))
    .limit(1);

  if (!row) return { ok: false, error: 'Không tìm thấy phiếu lương.' };
  if (row.isPreview) {
    return { ok: false, error: 'Không thể phát hành nội bộ cho phiếu lương preview.' };
  }

  await db
    .update(payslips)
    .set({
      sentAt: new Date(),
      publicAccessCode: row.publicAccessCode ?? (await generateUniquePayslipAccessCode())
    })
    .where(eq(payslips.id, id));

  revalidatePath('/dashboard/payroll/payslips');
  return { ok: true };
}

export async function getPublicPayslipByAccessCode(code: string) {
  const normalizedCode = normalizeAccessCode(code);
  if (!normalizedCode) {
    return null;
  }

  const [row] = await getPayslipRows()
    .where(
      and(
        eq(payslips.publicAccessCode, normalizedCode),
        eq(payslips.isPreview, false),
        isNotNull(payslips.sentAt)
      )
    )
    .limit(1);

  return row ? toPayslipView(row) : null;
}

export async function payrollReport() {
  await requireRole('hr');
  const rows = await db
    .select({
      period: payrollRuns.period,
      gross: payslips.grossPay,
      insurance: payslips.insuranceDeduction,
      tax: payslips.taxDeduction,
      net: payslips.netPay,
      breakdown: payslips.breakdown
    })
    .from(payslips)
    .leftJoin(payrollRuns, eq(payslips.payrollRunId, payrollRuns.id))
    .where(ne(payslips.isPreview, true));

  const byPeriod = new Map<
    string,
    {
      gross: number;
      insurance: number;
      tax: number;
      net: number;
      workdays: number;
      overtimeHours: number;
      count: number;
    }
  >();

  for (const row of rows) {
    const key = row.period ?? '—';
    const breakdown = getBreakdown(row.breakdown);
    const current = byPeriod.get(key) ?? {
      gross: 0,
      insurance: 0,
      tax: 0,
      net: 0,
      workdays: 0,
      overtimeHours: 0,
      count: 0
    };
    current.gross += Number(row.gross);
    current.insurance += Number(row.insurance);
    current.tax += Number(row.tax);
    current.net += Number(row.net);
    current.workdays += Number(breakdown.workedDays ?? 0);
    current.overtimeHours += Number(breakdown.overtimeHours ?? 0);
    current.count += 1;
    byPeriod.set(key, current);
  }

  return Array.from(byPeriod.entries())
    .map(([period, value]) => ({ id: period, period, ...value }))
    .toSorted((a, b) => b.period.localeCompare(a.period));
}
