'use server';

import { revalidatePath } from 'next/cache';
import { and, desc, eq, gte, inArray, lt } from 'drizzle-orm';

import { db } from '@/db';
import {
  employees,
  insuranceTaxConfigs,
  overtimeRequests,
  payrollRuns,
  payslips,
  salaryAdjustments,
  salaryInfos
} from '@/db/schema';
import { requireRole } from '@/lib/rbac';

import { computePayslip, type TaxBracket } from './calc';
import { DEFAULT_TAX_BRACKETS } from './constants';

type Result = { ok: true } | { ok: false; error: string };

const STANDARD_MONTH_HOURS = 208; // 26 ngày x 8 giờ

export async function listPayrollRuns() {
  await requireRole('hr');
  return db
    .select()
    .from(payrollRuns)
    .orderBy(desc(payrollRuns.period))
    .limit(100);
}

/** Tạo kỳ lương mới (trạng thái nháp). period dạng 'YYYY-MM'. */
export async function createPayrollRun(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.period || !/^\d{4}-\d{2}$/.test(v.period))
    return { ok: false, error: 'Kỳ lương phải có dạng YYYY-MM.' };
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

/**
 * Engine: tính & chốt bảng lương cho 1 kỳ.
 * Tập hợp lương cơ bản + phụ cấp + OT đã duyệt + biến động lương,
 * trừ BHXH và thuế TNCN lũy tiến, sinh payslip cho từng nhân viên.
 */
export async function computeAndLockRun(runId: string): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }

  const [run] = await db
    .select()
    .from(payrollRuns)
    .where(eq(payrollRuns.id, runId))
    .limit(1);
  if (!run) return { ok: false, error: 'Không tìm thấy kỳ lương.' };
  if (run.status !== 'draft')
    return { ok: false, error: 'Kỳ lương đã được chốt.' };

  const [year, month] = run.period.split('-').map(Number);
  const periodStart = `${run.period}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  // Cấu hình BHXH/thuế mới nhất.
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

  // Nhân viên đang làm việc.
  const emps = await db
    .select({ id: employees.id })
    .from(employees)
    .where(inArray(employees.status, ['active', 'probation', 'on_leave']));
  if (emps.length === 0)
    return { ok: false, error: 'Không có nhân viên để tính lương.' };
  const empIds = emps.map((e) => e.id);

  // Lương mới nhất, OT đã duyệt trong kỳ, biến động lương trong tháng.
  const [salaries, ots, adjustments] = await Promise.all([
    db
      .select()
      .from(salaryInfos)
      .where(inArray(salaryInfos.employeeId, empIds))
      .orderBy(desc(salaryInfos.effectiveFrom)),
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

  // Lấy bản ghi lương mới nhất theo effectiveFrom cho mỗi NV.
  const latestSalary = new Map<string, { base: number; allowance: number }>();
  for (const s of salaries) {
    const prev = latestSalary.get(s.employeeId);
    // salaries chưa sort; giữ bản có effectiveFrom lớn nhất.
    if (!prev) {
      latestSalary.set(s.employeeId, {
        base: Number(s.baseSalary),
        allowance: Number(s.fixedAllowance)
      });
    }
  }

  const rows = await db.transaction(async (tx) => {
    // Xoá payslip cũ của kỳ (nếu chạy lại).
    await tx.delete(payslips).where(eq(payslips.payrollRunId, runId));

    const created: string[] = [];
    for (const emp of emps) {
      const sal = latestSalary.get(emp.id) ?? { base: 0, allowance: 0 };
      const hourlyRate = sal.base / STANDARD_MONTH_HOURS;

      const overtimePay = ots
        .filter((o) => o.employeeId === emp.id)
        .reduce(
          (sum, o) =>
            sum + Number(o.hours ?? 0) * Number(o.coefficient) * hourlyRate,
          0
        );

      const otherAdjustments = adjustments
        .filter((a) => a.employeeId === emp.id)
        .reduce((sum, a) => {
          const amt = Number(a.amount);
          return sum + (a.type === 'penalty' || a.type === 'cut' ? -amt : amt);
        }, 0);

      const r = computePayslip({
        baseSalary: sal.base,
        allowances: sal.allowance,
        overtimePay,
        otherAdjustments,
        insuranceRate,
        // Trần đóng BHXH/BHYT = 20× lương cơ sở (2.34tr → 46.8tr).
        insuranceCap: 46_800_000,
        personalDeduction,
        dependentDeduction,
        dependents: 0,
        taxBrackets: brackets
      });

      await tx.insert(payslips).values({
        payrollRunId: runId,
        employeeId: emp.id,
        baseSalary: String(sal.base),
        allowances: String(sal.allowance),
        overtimePay: String(Math.round(overtimePay)),
        grossPay: String(r.grossPay),
        insuranceDeduction: String(r.insuranceDeduction),
        taxDeduction: String(r.taxDeduction),
        otherDeduction: String(r.otherDeduction),
        netPay: String(r.netPay),
        breakdown: {
          overtimePay: Math.round(overtimePay),
          otherAdjustments: Math.round(otherAdjustments)
        }
      });
      created.push(emp.id);
    }

    await tx
      .update(payrollRuns)
      .set({ status: 'locked', lockedAt: new Date() })
      .where(eq(payrollRuns.id, runId));

    return created;
  });

  revalidatePath('/dashboard/payroll/runs');
  revalidatePath('/dashboard/payroll/payslips');
  return rows.length > 0
    ? { ok: true }
    : { ok: false, error: 'Không sinh được phiếu lương.' };
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
  if (run.status !== 'locked')
    return { ok: false, error: 'Chỉ duyệt được bảng lương đã chốt.' };
  await db
    .update(payrollRuns)
    .set({ status: 'approved', approvedAt: new Date() })
    .where(eq(payrollRuns.id, runId));
  revalidatePath('/dashboard/payroll/runs');
  return { ok: true };
}
