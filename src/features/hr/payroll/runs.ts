'use server';

import { revalidatePath } from 'next/cache';
import { and, desc, eq, gte, inArray, lt } from 'drizzle-orm';

import { db } from '@/db';
import {
  employees,
  insuranceTaxConfigs,
  manualAttendanceEntries,
  overtimeRequests,
  payrollRuns,
  payslips,
  salaryAdjustments,
  salaryInfos,
  shifts,
  timesheets
} from '@/db/schema';
import { requireRole } from '@/lib/rbac';

import { computePayslip, type TaxBracket } from './calc';
import { DEFAULT_TAX_BRACKETS } from './constants';

type Result = { ok: true } | { ok: false; error: string };

const STANDARD_MONTH_HOURS = 208;
const STANDARD_MONTH_WORKDAYS = 26;

type GeneratedPayslip = {
  employeeId: string;
  isPreview: boolean;
  baseSalary: string;
  allowances: string;
  overtimePay: string;
  grossPay: string;
  insuranceDeduction: string;
  taxDeduction: string;
  otherDeduction: string;
  netPay: string;
  breakdown: Record<string, number | string>;
};

export async function listPayrollRuns() {
  await requireRole('hr');
  return db.select().from(payrollRuns).orderBy(desc(payrollRuns.period)).limit(100);
}

export async function createPayrollRun(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.period || !/^\d{4}-\d{2}$/.test(v.period)) {
    return { ok: false, error: 'Kỳ lương phải có dạng YYYY-MM.' };
  }

  try {
    await db.insert(payrollRuns).values({
      period: v.period,
      name: v.name || `Bảng lương ${v.period}`,
      status: 'draft'
    });
    revalidatePath('/dashboard/payroll/runs');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}

function getPeriodRange(period: string) {
  const [year, month] = period.split('-').map(Number);
  const periodStart = `${period}-01`;
  const nextMonth =
    month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  return { periodStart, nextMonth };
}

async function generatePayslipRows(runId: string, isPreview: boolean): Promise<GeneratedPayslip[]> {
  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, runId)).limit(1);
  if (!run) throw new Error('Không tìm thấy kỳ lương.');

  const { periodStart, nextMonth } = getPeriodRange(run.period);

  const [cfg] = await db
    .select()
    .from(insuranceTaxConfigs)
    .orderBy(desc(insuranceTaxConfigs.effectiveFrom))
    .limit(1);

  const insuranceRate = cfg
    ? Number(cfg.socialInsuranceRate) +
      Number(cfg.healthInsuranceRate) +
      Number(cfg.unemploymentRate)
    : 0.105;
  const personalDeduction = cfg ? Number(cfg.personalDeduction) : 11_000_000;
  const dependentDeduction = cfg ? Number(cfg.dependentDeduction) : 4_400_000;
  const brackets = (cfg?.taxBrackets as TaxBracket[] | undefined) ?? DEFAULT_TAX_BRACKETS;

  const emps = await db
    .select({ id: employees.id })
    .from(employees)
    .where(inArray(employees.status, ['active', 'probation', 'on_leave']));
  if (emps.length === 0) {
    throw new Error('Không có nhân viên để tính lương.');
  }
  const empIds = emps.map((e) => e.id);

  const [salaries, attendanceRows, manualRows, ots, adjustments] = await Promise.all([
    db
      .select()
      .from(salaryInfos)
      .where(inArray(salaryInfos.employeeId, empIds))
      .orderBy(desc(salaryInfos.effectiveFrom)),
    db
      .select({
        employeeId: timesheets.employeeId,
        workDate: timesheets.workDate,
        workedHours: timesheets.workedHours,
        status: timesheets.status,
        standardHours: shifts.standardHours
      })
      .from(timesheets)
      .leftJoin(shifts, eq(timesheets.shiftId, shifts.id))
      .where(
        and(
          inArray(timesheets.employeeId, empIds),
          gte(timesheets.workDate, periodStart),
          lt(timesheets.workDate, nextMonth)
        )
      ),
    db
      .select({
        employeeId: manualAttendanceEntries.employeeId,
        workDate: manualAttendanceEntries.workDate,
        morning: manualAttendanceEntries.morning,
        afternoon: manualAttendanceEntries.afternoon,
        standardHours: shifts.standardHours
      })
      .from(manualAttendanceEntries)
      .leftJoin(shifts, eq(manualAttendanceEntries.shiftId, shifts.id))
      .where(
        and(
          inArray(manualAttendanceEntries.employeeId, empIds),
          gte(manualAttendanceEntries.workDate, periodStart),
          lt(manualAttendanceEntries.workDate, nextMonth)
        )
      ),
    db
      .select()
      .from(overtimeRequests)
      .where(
        and(
          inArray(overtimeRequests.employeeId, empIds),
          eq(overtimeRequests.status, 'approved'),
          gte(overtimeRequests.workDate, periodStart),
          lt(overtimeRequests.workDate, nextMonth)
        )
      ),
    db
      .select()
      .from(salaryAdjustments)
      .where(
        and(
          inArray(salaryAdjustments.employeeId, empIds),
          gte(salaryAdjustments.effectiveMonth, periodStart),
          lt(salaryAdjustments.effectiveMonth, nextMonth)
        )
      )
  ]);

  const latestSalary = new Map<string, { base: number; allowance: number }>();
  for (const s of salaries) {
    if (!latestSalary.has(s.employeeId)) {
      latestSalary.set(s.employeeId, {
        base: Number(s.baseSalary),
        allowance: Number(s.fixedAllowance)
      });
    }
  }

  const manualByEmployeeDate = new Map<
    string,
    { workedHours: number; workdays: number; paidHours: number }
  >();
  for (const row of manualRows) {
    const standardHours = Number(row.standardHours ?? 8) || 8;
    const parts = Number(row.morning) + Number(row.afternoon);
    const paidHours = (standardHours * parts) / 2;
    manualByEmployeeDate.set(`${row.employeeId}:${row.workDate}`, {
      workedHours: paidHours,
      workdays: parts / 2,
      paidHours
    });
  }

  const attendanceSummary = new Map<
    string,
    {
      workdays: number;
      workedHours: number;
      paidHours: number;
      manualDays: number;
      timesheetDays: number;
    }
  >();

  for (const row of attendanceRows) {
    const manual = manualByEmployeeDate.get(`${row.employeeId}:${row.workDate}`);
    const current = attendanceSummary.get(row.employeeId) ?? {
      workdays: 0,
      workedHours: 0,
      paidHours: 0,
      manualDays: 0,
      timesheetDays: 0
    };

    if (manual) {
      current.workdays += manual.workdays;
      current.workedHours += manual.workedHours;
      current.paidHours += manual.paidHours;
      current.manualDays += manual.workdays;
      attendanceSummary.set(row.employeeId, current);
      continue;
    }

    if (row.status === 'absent') {
      attendanceSummary.set(row.employeeId, current);
      continue;
    }

    const workedHours = Number(row.workedHours ?? 0);
    const standardHours = Number(row.standardHours ?? 8) || 8;
    const paidHours = workedHours > 0 ? workedHours : row.status === 'present' ? standardHours : 0;
    const workdays = paidHours / standardHours;

    current.workdays += workdays;
    current.workedHours += workedHours;
    current.paidHours += paidHours;
    current.timesheetDays += workdays;
    attendanceSummary.set(row.employeeId, current);
  }

  for (const [key, manual] of manualByEmployeeDate.entries()) {
    const [employeeId] = key.split(':');
    const alreadyCounted = attendanceRows.some(
      (row) => `${row.employeeId}:${row.workDate}` === key
    );
    if (alreadyCounted) continue;

    const current = attendanceSummary.get(employeeId) ?? {
      workdays: 0,
      workedHours: 0,
      paidHours: 0,
      manualDays: 0,
      timesheetDays: 0
    };
    current.workdays += manual.workdays;
    current.workedHours += manual.workedHours;
    current.paidHours += manual.paidHours;
    current.manualDays += manual.workdays;
    attendanceSummary.set(employeeId, current);
  }

  const generated: GeneratedPayslip[] = [];
  for (const emp of emps) {
    const sal = latestSalary.get(emp.id) ?? { base: 0, allowance: 0 };
    const attendance = attendanceSummary.get(emp.id) ?? {
      workdays: 0,
      workedHours: 0,
      paidHours: 0,
      manualDays: 0,
      timesheetDays: 0
    };

    const salaryPerDay = STANDARD_MONTH_WORKDAYS > 0 ? sal.base / STANDARD_MONTH_WORKDAYS : 0;
    const salaryByAttendance = salaryPerDay * attendance.workdays;
    const hourlyRate = sal.base / STANDARD_MONTH_HOURS;

    const employeeOtRows = ots.filter((o) => o.employeeId === emp.id);
    const overtimeHours = employeeOtRows.reduce((sum, o) => sum + Number(o.hours ?? 0), 0);
    const overtimePay = employeeOtRows.reduce(
      (sum, o) => sum + Number(o.hours ?? 0) * Number(o.coefficient) * hourlyRate,
      0
    );

    const employeeAdjustments = adjustments.filter((a) => a.employeeId === emp.id);
    const otherAdjustments = employeeAdjustments.reduce((sum, a) => {
      const amount = Number(a.amount);
      return sum + (a.type === 'penalty' || a.type === 'cut' ? -amount : amount);
    }, 0);

    const computed = computePayslip({
      baseSalary: salaryByAttendance,
      allowances: sal.allowance,
      overtimePay,
      otherAdjustments,
      insuranceRate,
      insuranceCap: 46_800_000,
      personalDeduction,
      dependentDeduction,
      dependents: 0,
      taxBrackets: brackets
    });

    generated.push({
      employeeId: emp.id,
      isPreview,
      baseSalary: String(Math.round(salaryByAttendance)),
      allowances: String(sal.allowance),
      overtimePay: String(Math.round(overtimePay)),
      grossPay: String(computed.grossPay),
      insuranceDeduction: String(computed.insuranceDeduction),
      taxDeduction: String(computed.taxDeduction),
      otherDeduction: String(computed.otherDeduction),
      netPay: String(computed.netPay),
      breakdown: {
        snapshotType: isPreview ? 'preview' : 'locked',
        monthlyBaseSalary: Math.round(sal.base),
        salaryPerDay: Math.round(salaryPerDay),
        workedDays: Number(attendance.workdays.toFixed(2)),
        workedHours: Number(attendance.workedHours.toFixed(2)),
        paidHours: Number(attendance.paidHours.toFixed(2)),
        salaryByAttendance: Math.round(salaryByAttendance),
        fixedAllowance: Math.round(sal.allowance),
        overtimeHours: Number(overtimeHours.toFixed(2)),
        overtimePay: Math.round(overtimePay),
        otherAdjustments: Math.round(otherAdjustments),
        manualDays: Number(attendance.manualDays.toFixed(2)),
        timesheetDays: Number(attendance.timesheetDays.toFixed(2))
      }
    });
  }

  return generated;
}

async function replaceRunPayslips(runId: string, rows: GeneratedPayslip[]) {
  await db.transaction(async (tx) => {
    await tx.delete(payslips).where(eq(payslips.payrollRunId, runId));
    if (rows.length === 0) return;

    await tx.insert(payslips).values(
      rows.map((row) => ({
        payrollRunId: runId,
        employeeId: row.employeeId,
        isPreview: row.isPreview,
        baseSalary: row.baseSalary,
        allowances: row.allowances,
        overtimePay: row.overtimePay,
        grossPay: row.grossPay,
        insuranceDeduction: row.insuranceDeduction,
        taxDeduction: row.taxDeduction,
        otherDeduction: row.otherDeduction,
        netPay: row.netPay,
        breakdown: row.breakdown
      }))
    );
  });
}

export async function previewPayrollRun(runId: string): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }

  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, runId)).limit(1);
  if (!run) return { ok: false, error: 'Không tìm thấy kỳ lương.' };
  if (!inArrayValue(run.status, ['draft', 'previewed'])) {
    return { ok: false, error: 'Chỉ preview được kỳ lương ở trạng thái nháp hoặc đã preview.' };
  }

  try {
    const rows = await generatePayslipRows(runId, true);
    await replaceRunPayslips(runId, rows);
    await db.update(payrollRuns).set({ status: 'previewed' }).where(eq(payrollRuns.id, runId));

    revalidatePath('/dashboard/payroll/runs');
    revalidatePath('/dashboard/payroll/payslips');
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không preview được bảng lương.'
    };
  }
}

function inArrayValue<T extends string>(value: string, list: readonly T[]): value is T {
  return (list as readonly string[]).includes(value);
}

export async function computeAndLockRun(runId: string): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }

  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, runId)).limit(1);
  if (!run) return { ok: false, error: 'Không tìm thấy kỳ lương.' };
  if (!inArrayValue(run.status, ['draft', 'previewed'])) {
    return { ok: false, error: 'Kỳ lương đã được chốt.' };
  }

  try {
    const rows = await generatePayslipRows(runId, false);
    await replaceRunPayslips(runId, rows);
    await db
      .update(payrollRuns)
      .set({ status: 'locked', lockedAt: new Date() })
      .where(eq(payrollRuns.id, runId));

    revalidatePath('/dashboard/payroll/runs');
    revalidatePath('/dashboard/payroll/payslips');
    revalidatePath('/dashboard/payroll/reports');
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không chốt được bảng lương.'
    };
  }
}

export async function approvePayrollRun(runId: string): Promise<Result> {
  try {
    await requireRole('admin');
  } catch {
    return { ok: false, error: 'Chỉ Admin/Giám đốc được duyệt bảng lương.' };
  }

  const [run] = await db
    .select({ status: payrollRuns.status })
    .from(payrollRuns)
    .where(eq(payrollRuns.id, runId))
    .limit(1);
  if (!run) return { ok: false, error: 'Không tìm thấy kỳ lương.' };
  if (run.status !== 'locked') {
    return { ok: false, error: 'Chỉ duyệt được bảng lương đã chốt.' };
  }

  await db
    .update(payrollRuns)
    .set({ status: 'approved', approvedAt: new Date() })
    .where(eq(payrollRuns.id, runId));
  revalidatePath('/dashboard/payroll/runs');
  return { ok: true };
}
