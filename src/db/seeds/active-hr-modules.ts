/* eslint-disable no-console */
/**
 * Seed dữ liệu đẹp cho các phân hệ HR đang active:
 * - Hồ sơ / hợp đồng / điều chuyển / lương / tài sản / khen thưởng
 * - Ca làm việc / bảng công / OT / nghỉ phép / số dư phép / điều chỉnh công
 * - Thang bảng lương / công thức / cấu hình BHXH-TNCN / biến động lương / kỳ lương / phiếu lương
 *
 * Script lấy chính tập nhân sự hiện có trong DB làm gốc để sinh dữ liệu liên quan.
 *
 * Chạy:
 *   bun run src/db/seeds/active-hr-modules.ts
 */
import 'dotenv/config';

import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';

import { db } from '../index';
import {
  assets,
  attendanceAdjustments,
  attendanceDevices,
  attendanceRaw,
  attendanceWeekLocks,
  contracts,
  costCenters,
  departments,
  employeeDocuments,
  employees,
  insuranceTaxConfigs,
  jobAssignments,
  leaveBalances,
  leaveRequests,
  manualAttendanceAudits,
  manualAttendanceEntries,
  overtimeRequests,
  payrollFormulas,
  payrollRuns,
  payslips,
  positions,
  rewardsDisciplines,
  salaryAdjustments,
  salaryInfos,
  salaryScales,
  shifts,
  timesheets
} from '../schema';
import { DEFAULT_TAX_BRACKETS } from '@/features/hr/payroll/constants';

type EmployeeSeedRow = {
  id: string;
  employeeCode: string;
  fullName: string;
  status: 'active' | 'probation' | 'on_leave' | 'terminated';
  hireDate: string | null;
  probationEndDate: string | null;
  departmentId: string | null;
  positionId: string | null;
  managerId: string | null;
};

type ShiftSeed = {
  id: string;
  code: string;
  name: string;
  type: 'office' | 'split' | 'night' | 'rotating';
  standardHours: number;
};

const MANUAL_UPDATED_BY = 'seed-active-hr';
const ACTOR_USER_ID = 'seed-active-hr';
const BATCH_SIZE = 500;

function formatDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(input: Date, days: number) {
  const next = new Date(input);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(input: Date, months: number) {
  const next = new Date(input);
  next.setMonth(next.getMonth() + months);
  return next;
}

function startOfMonth(input: Date) {
  return new Date(input.getFullYear(), input.getMonth(), 1);
}

function endOfMonth(input: Date) {
  return new Date(input.getFullYear(), input.getMonth() + 1, 0);
}

function startOfWeekMonday(input: Date) {
  const next = new Date(input);
  const day = next.getDay() || 7;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - day + 1);
  return next;
}

function setTime(date: string, time: string, plusMinutes = 0) {
  const base = new Date(`${date}T${time}:00+07:00`);
  base.setMinutes(base.getMinutes() + plusMinutes);
  return base;
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function chunk<T>(items: T[], size = BATCH_SIZE) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function buildInlineDemoFile(name: string) {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(`Demo file: ${name}`)}`;
}

async function insertBatches<T>(label: string, table: any, values: T[]) {
  if (!values.length) {
    console.log(`  [skip] ${label}: 0 bản ghi`);
    return;
  }

  for (const batch of chunk(values)) {
    await db.insert(table).values(batch as any);
  }

  console.log(`  [+] ${label}: ${values.length} bản ghi`);
}

async function clearActiveTables() {
  console.log('Dọn dữ liệu active cũ...');

  await db.delete(payslips);
  await db.delete(payrollRuns);
  await db.delete(salaryAdjustments);
  await db.delete(insuranceTaxConfigs);
  await db.delete(payrollFormulas);
  await db.delete(salaryScales);

  await db.delete(manualAttendanceAudits);
  await db.delete(manualAttendanceEntries);
  await db.delete(attendanceWeekLocks);
  await db.delete(attendanceAdjustments);
  await db.delete(leaveBalances);
  await db.delete(leaveRequests);
  await db.delete(overtimeRequests);
  await db.delete(timesheets);
  await db.delete(attendanceRaw);
  await db.delete(attendanceDevices);
  await db.delete(shifts);

  await db.delete(rewardsDisciplines);
  await db.delete(assets);
  await db.delete(salaryInfos);
  await db.delete(jobAssignments);
  await db.delete(contracts);
}

async function ensureBaseEmployees() {
  const existingEmployees = await db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      fullName: employees.fullName,
      status: employees.status,
      hireDate: employees.hireDate,
      probationEndDate: employees.probationEndDate,
      departmentId: employees.departmentId,
      positionId: employees.positionId,
      managerId: employees.managerId
    })
    .from(employees)
    .orderBy(asc(employees.employeeCode));

  if (existingEmployees.length > 0) {
    console.log(`Dùng ${existingEmployees.length} nhân sự hiện có làm dữ liệu gốc.`);
    return existingEmployees;
  }

  console.log('Không có nhân sự sẵn có, tạo bộ dữ liệu nền tối thiểu...');

  const [existingCostCenter] = await db
    .select({ id: costCenters.id })
    .from(costCenters)
    .where(eq(costCenters.code, 'CC-HRM'))
    .limit(1);
  const costCenterId =
    existingCostCenter?.id ??
    (
      await db
        .insert(costCenters)
        .values({ code: 'CC-HRM', name: 'Khối vận hành nhân sự' })
        .returning({ id: costCenters.id })
    )[0]!.id;

  const departmentSeeds = [
    { code: 'OPS', name: 'Vận hành', type: 'department' as const },
    { code: 'HR', name: 'Nhân sự', type: 'department' as const },
    { code: 'FIN', name: 'Tài chính kế toán', type: 'department' as const },
    { code: 'SAL', name: 'Kinh doanh', type: 'department' as const }
  ];

  const departmentMap = new Map<string, string>();
  for (const department of departmentSeeds) {
    const [existingDepartment] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.code, department.code))
      .limit(1);
    const departmentId =
      existingDepartment?.id ??
      (
        await db
          .insert(departments)
          .values({ ...department, costCenterId })
          .returning({ id: departments.id })
      )[0]!.id;
    departmentMap.set(department.code, departmentId);
  }

  const positionSeeds = [
    { code: 'OPS-LEAD', title: 'Trưởng nhóm vận hành', departmentCode: 'OPS' },
    { code: 'OPS-STAFF', title: 'Chuyên viên vận hành', departmentCode: 'OPS' },
    { code: 'HR-LEAD', title: 'Trưởng phòng nhân sự', departmentCode: 'HR' },
    { code: 'HR-STAFF', title: 'Chuyên viên nhân sự', departmentCode: 'HR' },
    { code: 'FIN-LEAD', title: 'Kế toán trưởng', departmentCode: 'FIN' },
    { code: 'FIN-STAFF', title: 'Chuyên viên payroll', departmentCode: 'FIN' },
    { code: 'SAL-LEAD', title: 'Trưởng phòng kinh doanh', departmentCode: 'SAL' },
    { code: 'SAL-STAFF', title: 'Nhân viên kinh doanh', departmentCode: 'SAL' }
  ];

  const positionMap = new Map<string, string>();
  for (const position of positionSeeds) {
    const [existingPosition] = await db
      .select({ id: positions.id })
      .from(positions)
      .where(eq(positions.code, position.code))
      .limit(1);
    const positionId =
      existingPosition?.id ??
      (
        await db
          .insert(positions)
          .values({
            code: position.code,
            title: position.title,
            departmentId: departmentMap.get(position.departmentCode) ?? null
          })
          .returning({ id: positions.id })
      )[0]!.id;
    positionMap.set(position.code, positionId);
  }

  const employeeSeeds = Array.from({ length: 24 }, (_, index) => {
    const number = index + 1;
    const isLead = number % 6 === 1;
    const group = index % 4;
    const departmentCode = ['OPS', 'HR', 'FIN', 'SAL'][group]!;
    const positionCode = `${departmentCode}-${isLead ? 'LEAD' : 'STAFF'}`;
    const status =
      number % 11 === 0 ? 'on_leave' : number % 7 === 0 ? 'probation' : ('active' as const);
    const hireDate = addDays(new Date('2023-01-01T00:00:00+07:00'), index * 19);
    const fullName = [
      'Nguyễn Minh An',
      'Trần Khánh Linh',
      'Lê Hoàng Phúc',
      'Phạm Gia Hân',
      'Đỗ Hải Nam',
      'Bùi Thu Trang',
      'Vũ Nhật Quang',
      'Ngô Bảo Châu',
      'Phan Minh Đức',
      'Đặng Ngọc Mai',
      'Đinh Công Hậu',
      'Hoàng Mỹ Duyên'
    ][index % 12]!;

    return {
      employeeCode: `NV${String(number).padStart(4, '0')}`,
      fullName: `${fullName} ${Math.floor(index / 12) + 1}`,
      email: `nhansu${number}@example.com`,
      gender: (index % 3 === 0 ? 'male' : index % 3 === 1 ? 'female' : 'other') as
        | 'male'
        | 'female'
        | 'other',
      status,
      hireDate: formatDate(hireDate),
      seniorityDate: formatDate(hireDate),
      probationEndDate: status === 'probation' ? formatDate(addDays(hireDate, 60)) : null,
      departmentId: departmentMap.get(departmentCode) ?? null,
      positionId: positionMap.get(positionCode) ?? null,
      phone: `09${String(10000000 + number).slice(-8)}`
    };
  });

  await insertBatches('nhân sự nền', employees, employeeSeeds);

  return db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      fullName: employees.fullName,
      status: employees.status,
      hireDate: employees.hireDate,
      probationEndDate: employees.probationEndDate,
      departmentId: employees.departmentId,
      positionId: employees.positionId,
      managerId: employees.managerId
    })
    .from(employees)
    .orderBy(asc(employees.employeeCode));
}

async function seedShiftsAndDevices() {
  const createdShifts = await db
    .insert(shifts)
    .values([
      {
        code: 'HC',
        name: 'Hành chính',
        type: 'office',
        startTime: '08:00',
        endTime: '17:00',
        breakMinutes: 60,
        standardHours: '8'
      },
      {
        code: 'SX-A',
        name: 'Ca sản xuất A',
        type: 'split',
        startTime: '07:00',
        endTime: '15:30',
        breakMinutes: 30,
        standardHours: '8'
      },
      {
        code: 'SX-B',
        name: 'Ca sản xuất B',
        type: 'split',
        startTime: '13:30',
        endTime: '22:00',
        breakMinutes: 30,
        standardHours: '8'
      },
      {
        code: 'DEM',
        name: 'Ca đêm',
        type: 'night',
        startTime: '22:00',
        endTime: '06:00',
        breakMinutes: 30,
        standardHours: '7.5'
      }
    ])
    .returning({
      id: shifts.id,
      code: shifts.code,
      name: shifts.name,
      type: shifts.type,
      standardHours: shifts.standardHours
    });

  await db.insert(attendanceDevices).values([
    {
      code: 'HCM-HQ-01',
      name: 'Máy chấm công trụ sở',
      location: 'Trụ sở chính',
      ipAddress: '10.10.1.20',
      kind: 'faceid',
      isActive: true,
      lastSyncAt: new Date()
    },
    {
      code: 'HCM-WH-01',
      name: 'Máy chấm công kho',
      location: 'Kho vận',
      ipAddress: '10.10.2.15',
      kind: 'fingerprint',
      isActive: true,
      lastSyncAt: new Date()
    }
  ]);

  console.log(`  [+] shifts: ${createdShifts.length} bản ghi`);
  console.log('  [+] attendance devices: 2 bản ghi');

  return createdShifts.map((shift) => ({
    id: shift.id,
    code: shift.code,
    name: shift.name,
    type: shift.type,
    standardHours: Number(shift.standardHours)
  })) as ShiftSeed[];
}

function getDepartmentBucket(employeeCode: string, employeeIndex: number) {
  const lastNumber = Number(employeeCode.replace(/\D/g, '').slice(-2) || employeeIndex);
  if (lastNumber % 4 === 0) return 'ops';
  if (lastNumber % 4 === 1) return 'hr';
  if (lastNumber % 4 === 2) return 'finance';
  return 'sales';
}

function chooseShift(
  employee: EmployeeSeedRow,
  employeeIndex: number,
  shiftMap: Record<string, ShiftSeed>
) {
  const bucket = getDepartmentBucket(employee.employeeCode, employeeIndex);

  if (bucket === 'ops') return employeeIndex % 3 === 0 ? shiftMap['SX-B'] : shiftMap['SX-A'];
  if (bucket === 'sales') return employeeIndex % 5 === 0 ? shiftMap['DEM'] : shiftMap['HC'];
  return shiftMap['HC'];
}

function inferBaseSalary(employee: EmployeeSeedRow, employeeIndex: number) {
  const statusBoost =
    employee.status === 'active' ? 1.12 : employee.status === 'on_leave' ? 1.06 : 1;
  const base = 8_500_000 + (employeeIndex % 9) * 850_000;
  return Math.round(base * statusBoost);
}

function inferAllowance(employeeIndex: number) {
  return 800_000 + (employeeIndex % 4) * 350_000;
}

async function seedHrModules(employeesBase: EmployeeSeedRow[]) {
  const contractsValues: (typeof contracts.$inferInsert)[] = [];
  const assignmentsValues: (typeof jobAssignments.$inferInsert)[] = [];
  const salaryInfoValues: (typeof salaryInfos.$inferInsert)[] = [];
  const assetValues: (typeof assets.$inferInsert)[] = [];
  const rewardValues: (typeof rewardsDisciplines.$inferInsert)[] = [];
  const documentValues: (typeof employeeDocuments.$inferInsert)[] = [];

  const activeEmployees = employeesBase.filter((employee) => employee.status !== 'terminated');

  for (const [index, employee] of activeEmployees.entries()) {
    const hireDate =
      employee.hireDate ?? formatDate(addDays(new Date('2023-01-01T00:00:00+07:00'), index * 17));
    const baseSalary = inferBaseSalary(employee, index);
    const allowance = inferAllowance(index);
    const contractType =
      employee.status === 'probation'
        ? 'probation'
        : index % 6 === 0
          ? 'indefinite'
          : index % 3 === 0
            ? 'term_3y'
            : 'term_1y';
    const contractEndDate =
      contractType === 'indefinite'
        ? null
        : contractType === 'probation'
          ? (employee.probationEndDate ??
            formatDate(addDays(new Date(`${hireDate}T00:00:00+07:00`), 60)))
          : contractType === 'term_3y'
            ? formatDate(addMonths(new Date(`${hireDate}T00:00:00+07:00`), 36))
            : formatDate(addMonths(new Date(`${hireDate}T00:00:00+07:00`), 12));

    contractsValues.push({
      employeeId: employee.id,
      type: contractType,
      contractNumber: `HD-${employee.employeeCode}`,
      startDate: hireDate,
      endDate: contractEndDate,
      baseSalary: String(baseSalary),
      signNumber: `QD-${employee.employeeCode}`,
      signDate: hireDate,
      status: contractType === 'probation' ? 'active' : 'active'
    });

    assignmentsValues.push({
      employeeId: employee.id,
      departmentId: employee.departmentId,
      positionId: employee.positionId,
      costCenterId: null,
      type: 'hire',
      effectiveDate: hireDate,
      note: 'Seed theo nhân sự nền'
    });

    if (index % 9 === 0) {
      assignmentsValues.push({
        employeeId: employee.id,
        departmentId: employee.departmentId,
        positionId: employee.positionId,
        costCenterId: null,
        type: 'promotion',
        effectiveDate: formatDate(addMonths(new Date(`${hireDate}T00:00:00+07:00`), 8)),
        note: 'Điều chỉnh theo kỳ đánh giá nội bộ'
      });
    }

    salaryInfoValues.push({
      employeeId: employee.id,
      baseSalary: String(baseSalary),
      fixedAllowance: String(allowance),
      commercialInsurancePackage: index % 5 === 0 ? 'Premium Health' : 'Standard Care',
      otherBenefits: {
        mealAllowance: 650000,
        phoneAllowance: index % 3 === 0 ? 300000 : 150000,
        parkingSupport: 200000
      },
      effectiveFrom: hireDate
    });

    if (index % 2 === 0) {
      assetValues.push({
        employeeId: employee.id,
        name: index % 4 === 0 ? 'Laptop Dell Latitude' : 'Bộ đồng phục',
        type: index % 4 === 0 ? 'laptop' : 'uniform',
        assetCode: `${index % 4 === 0 ? 'LAP' : 'UNI'}-${employee.employeeCode}`,
        issueDate: hireDate,
        status: 'assigned',
        note: index % 4 === 0 ? 'Phục vụ công việc hàng ngày' : 'Đồng phục chính thức'
      });
    }

    if (index % 7 === 0) {
      rewardValues.push({
        employeeId: employee.id,
        type: 'reward',
        title: 'Thưởng hiệu suất quý',
        description: 'Hoàn thành vượt KPI và phối hợp đội nhóm tốt',
        decisionNumber: `KT-${employee.employeeCode}`,
        decisionDate: formatDate(addMonths(new Date(), -1)),
        formOrValue: `${2_000_000 + (index % 4) * 500_000}`
      });
    } else if (index % 19 === 0) {
      rewardValues.push({
        employeeId: employee.id,
        type: 'discipline',
        title: 'Nhắc nhở tuân thủ nội quy',
        description: 'Đi muộn nhiều lần trong tháng',
        decisionNumber: `KL-${employee.employeeCode}`,
        decisionDate: formatDate(addMonths(new Date(), -2)),
        formOrValue: 'Nhắc nhở bằng văn bản'
      });
    }

    documentValues.push(
      {
        employeeId: employee.id,
        type: 'id_card',
        name: 'CCCD gắn chip',
        fileUrl: buildInlineDemoFile(`${employee.employeeCode}-cccd.pdf`),
        issueDate: formatDate(addMonths(new Date(`${hireDate}T00:00:00+07:00`), -6)),
        expiryDate: index % 10 === 0 ? formatDate(addDays(new Date(), 20)) : null,
        note: index % 10 === 0 ? 'Case demo giấy tờ sắp hết hạn' : 'Hồ sơ cá nhân đã số hóa'
      },
      {
        employeeId: employee.id,
        type: 'degree',
        name: 'Bằng cấp chuyên môn',
        fileUrl: buildInlineDemoFile(`${employee.employeeCode}-degree.pdf`),
        issueDate: formatDate(addMonths(new Date(`${hireDate}T00:00:00+07:00`), -24)),
        expiryDate: null,
        note: 'Lưu bản scan dùng cho demo'
      }
    );

    if (index % 4 !== 0) {
      documentValues.push({
        employeeId: employee.id,
        type: 'social_insurance',
        name: 'Sổ BHXH',
        fileUrl: buildInlineDemoFile(`${employee.employeeCode}-bhxh.pdf`),
        issueDate: hireDate,
        expiryDate: null,
        note: 'Đủ bộ hồ sơ bắt buộc'
      });
    }

    if (index % 5 === 0) {
      documentValues.push({
        employeeId: employee.id,
        type: 'certificate',
        name: 'Chứng chỉ an toàn lao động',
        fileUrl: buildInlineDemoFile(`${employee.employeeCode}-atld.pdf`),
        issueDate: formatDate(addMonths(new Date(), -10)),
        expiryDate: formatDate(addDays(new Date(), 35)),
        note: 'Case demo chứng chỉ sắp hết hạn'
      });
    }
  }

  await insertBatches('contracts', contracts, contractsValues);
  await insertBatches('job assignments', jobAssignments, assignmentsValues);
  await insertBatches('salary infos', salaryInfos, salaryInfoValues);
  await insertBatches('employee documents', employeeDocuments, documentValues);
  await insertBatches('assets', assets, assetValues);
  await insertBatches('rewards / disciplines', rewardsDisciplines, rewardValues);
}

async function seedAttendanceModules(employeesBase: EmployeeSeedRow[], shiftSeeds: ShiftSeed[]) {
  const shiftMap = Object.fromEntries(shiftSeeds.map((shift) => [shift.code, shift])) as Record<
    string,
    ShiftSeed
  >;
  const activeEmployees = employeesBase.filter((employee) =>
    ['active', 'probation', 'on_leave'].includes(employee.status)
  );
  const approvers = activeEmployees.slice(0, Math.min(activeEmployees.length, 8));

  const leaveBalanceValues: (typeof leaveBalances.$inferInsert)[] = [];
  const leaveRequestValues: (typeof leaveRequests.$inferInsert)[] = [];
  const overtimeValues: (typeof overtimeRequests.$inferInsert)[] = [];
  const adjustmentValues: (typeof attendanceAdjustments.$inferInsert)[] = [];
  const manualEntryValues: (typeof manualAttendanceEntries.$inferInsert)[] = [];
  const manualAuditValues: (typeof manualAttendanceAudits.$inferInsert)[] = [];
  const timesheetValues: (typeof timesheets.$inferInsert)[] = [];
  const rawValues: (typeof attendanceRaw.$inferInsert)[] = [];

  const currentYear = new Date().getFullYear();
  const weekStart = startOfWeekMonday(new Date());
  const boardWeekDates = Array.from({ length: 7 }, (_, index) =>
    formatDate(addDays(weekStart, index))
  );
  const sixWeeksAgo = addDays(weekStart, -35);
  const lastWorkDay = addDays(new Date(), -1);

  for (const [employeeIndex, employee] of activeEmployees.entries()) {
    const selectedShift = chooseShift(employee, employeeIndex, shiftMap);
    const approverId =
      approvers[(employeeIndex + 2) % approvers.length]?.id ?? approvers[0]?.id ?? null;

    let approvedAnnualDays = 0;
    if (employeeIndex % 6 === 0) approvedAnnualDays += 1;
    if (employee.status === 'on_leave') approvedAnnualDays += 3;

    leaveBalanceValues.push({
      employeeId: employee.id,
      year: currentYear,
      entitledDays: employeeIndex % 5 === 0 ? '14' : '12',
      accruedDays: employee.status === 'probation' ? '6' : employeeIndex % 5 === 0 ? '14' : '12',
      usedDays: String(approvedAnnualDays)
    });

    if (employeeIndex % 6 === 0) {
      const leaveDate = formatDate(addDays(weekStart, (employeeIndex % 4) + 1));
      leaveRequestValues.push({
        employeeId: employee.id,
        type: 'annual',
        startDate: leaveDate,
        endDate: leaveDate,
        days: '1',
        reason: 'Nghỉ phép cá nhân theo kế hoạch',
        status: 'approved',
        approverId
      });
    }

    if (employee.status === 'on_leave') {
      const startDate = formatDate(addDays(weekStart, 1));
      const endDate = formatDate(addDays(weekStart, 3));
      leaveRequestValues.push({
        employeeId: employee.id,
        type: 'sick',
        startDate,
        endDate,
        days: '3',
        reason: 'Nghỉ điều trị ngắn hạn',
        status: 'approved',
        approverId
      });
    } else if (employeeIndex % 8 === 0) {
      const requestDate = formatDate(addDays(weekStart, 4));
      leaveRequestValues.push({
        employeeId: employee.id,
        type: 'annual',
        startDate: requestDate,
        endDate: requestDate,
        days: '1',
        reason: 'Đơn nghỉ đang chờ duyệt',
        status: 'pending',
        approverId
      });
    }

    if (employeeIndex % 5 === 0) {
      const workDate = formatDate(addDays(weekStart, 2));
      const fromTime = setTime(workDate, '18:00');
      const toTime = setTime(workDate, '20:30');
      overtimeValues.push({
        employeeId: employee.id,
        workDate,
        fromTime,
        toTime,
        kind: 'weekday',
        coefficient: '1.5',
        hours: '2.5',
        reason: 'Hỗ trợ hoàn tất báo cáo cuối ngày',
        status: employeeIndex % 10 === 0 ? 'pending' : 'approved',
        approverId
      });
    }

    if (employeeIndex % 9 === 0) {
      const workDate = formatDate(addDays(weekStart, 1));
      adjustmentValues.push({
        employeeId: employee.id,
        workDate,
        reason: 'Bổ sung chấm công do quên check-out',
        requestedCheckIn: setTime(workDate, '08:10'),
        requestedCheckOut: setTime(workDate, '17:35'),
        status: employeeIndex % 18 === 0 ? 'approved' : 'pending',
        approverId
      });
    }

    if (employeeIndex % 7 === 0) {
      const workDate = boardWeekDates[employeeIndex % 5]!;
      manualEntryValues.push({
        employeeId: employee.id,
        workDate,
        shiftId: selectedShift.id,
        morning: true,
        afternoon: employeeIndex % 14 !== 0,
        source: 'manual',
        note: 'Điều chỉnh công seed để minh họa bảng tuần',
        updatedBy: MANUAL_UPDATED_BY
      });
      manualAuditValues.push({
        employeeId: employee.id,
        workDate,
        shiftId: selectedShift.id,
        morning: true,
        afternoon: employeeIndex % 14 !== 0,
        note: 'Điều chỉnh công seed để minh họa bảng tuần',
        action: 'created',
        actorUserId: ACTOR_USER_ID,
        actorEmployeeId: approverId
      });
    }

    for (let cursor = new Date(sixWeeksAgo); cursor <= lastWorkDay; cursor = addDays(cursor, 1)) {
      if (isWeekend(cursor)) continue;

      const workDate = formatDate(cursor);
      const dayOfWeek = cursor.getDay();
      const isOnApprovedLeave = leaveRequestValues.some(
        (leave) =>
          leave.employeeId === employee.id &&
          leave.status === 'approved' &&
          leave.startDate <= workDate &&
          leave.endDate >= workDate
      );

      if (isOnApprovedLeave) {
        timesheetValues.push({
          employeeId: employee.id,
          workDate,
          shiftId: selectedShift.id,
          checkIn: null,
          checkOut: null,
          workedHours: '0',
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          status: 'leave'
        });
        continue;
      }

      const absentPattern = (employeeIndex + cursor.getDate()) % 37 === 0;
      if (absentPattern) {
        timesheetValues.push({
          employeeId: employee.id,
          workDate,
          shiftId: selectedShift.id,
          checkIn: null,
          checkOut: null,
          workedHours: '0',
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          status: 'absent'
        });
        continue;
      }

      const lateMinutes =
        (employeeIndex + cursor.getDate()) % 6 === 0 ? 10 + (employeeIndex % 4) * 5 : 0;
      const earlyLeaveMinutes = (employeeIndex + cursor.getDate()) % 11 === 0 ? 15 : 0;
      const workedHours = Math.max(
        selectedShift.standardHours - lateMinutes / 60 - earlyLeaveMinutes / 60,
        4
      );
      const checkIn = setTime(
        workDate,
        selectedShift.code === 'DEM'
          ? '22:00'
          : selectedShift.code === 'SX-A'
            ? '07:00'
            : selectedShift.code === 'SX-B'
              ? '13:30'
              : '08:00',
        lateMinutes
      );
      const baseEndTime =
        selectedShift.code === 'DEM'
          ? '06:00'
          : selectedShift.code === 'SX-A'
            ? '15:30'
            : selectedShift.code === 'SX-B'
              ? '22:00'
              : '17:00';
      const checkOut = setTime(
        workDate,
        baseEndTime,
        -earlyLeaveMinutes + (selectedShift.code === 'DEM' ? 24 * 60 : 0)
      );

      timesheetValues.push({
        employeeId: employee.id,
        workDate,
        shiftId: selectedShift.id,
        checkIn,
        checkOut,
        workedHours: workedHours.toFixed(2),
        lateMinutes,
        earlyLeaveMinutes,
        status: 'present'
      });

      rawValues.push(
        {
          employeeId: employee.id,
          deviceId: null,
          punchAt: checkIn,
          direction: 'in'
        },
        {
          employeeId: employee.id,
          deviceId: null,
          punchAt: checkOut,
          direction: 'out'
        }
      );
    }
  }

  await insertBatches('leave balances', leaveBalances, leaveBalanceValues);
  await insertBatches('leave requests', leaveRequests, leaveRequestValues);
  await insertBatches('overtime requests', overtimeRequests, overtimeValues);
  await insertBatches('attendance adjustments', attendanceAdjustments, adjustmentValues);
  await insertBatches('manual attendance entries', manualAttendanceEntries, manualEntryValues);
  await insertBatches('manual attendance audits', manualAttendanceAudits, manualAuditValues);
  await insertBatches('timesheets', timesheets, timesheetValues);
  await insertBatches('attendance raw', attendanceRaw, rawValues);

  const lockStart = formatDate(addDays(weekStart, -14));
  const lockEnd = formatDate(addDays(weekStart, -8));
  await db.insert(attendanceWeekLocks).values({
    weekStart: lockStart,
    weekEnd: lockEnd,
    lockedAt: new Date(),
    lockedBy: ACTOR_USER_ID,
    note: 'Khoá tuần lịch sử để minh hoạ'
  });
  console.log('  [+] attendance week locks: 1 bản ghi');
}

async function seedPayrollModules(employeesBase: EmployeeSeedRow[]) {
  const allActiveEmployees = employeesBase.filter((employee) =>
    ['active', 'probation', 'on_leave'].includes(employee.status)
  );

  await insertBatches('salary scales', salaryScales, [
    {
      code: 'B1-1',
      grade: 'B1',
      step: 1,
      minSalary: '7000000',
      maxSalary: '9000000',
      coefficient: '1.00'
    },
    {
      code: 'B1-2',
      grade: 'B1',
      step: 2,
      minSalary: '9000000',
      maxSalary: '11000000',
      coefficient: '1.15'
    },
    {
      code: 'B2-1',
      grade: 'B2',
      step: 1,
      minSalary: '11000000',
      maxSalary: '13500000',
      coefficient: '1.30'
    },
    {
      code: 'B2-2',
      grade: 'B2',
      step: 2,
      minSalary: '13500000',
      maxSalary: '16000000',
      coefficient: '1.45'
    },
    {
      code: 'B3-1',
      grade: 'B3',
      step: 1,
      minSalary: '16000000',
      maxSalary: '19000000',
      coefficient: '1.65'
    },
    {
      code: 'B3-2',
      grade: 'B3',
      step: 2,
      minSalary: '19000000',
      maxSalary: '23000000',
      coefficient: '1.90'
    }
  ]);

  await insertBatches('payroll formulas', payrollFormulas, [
    {
      code: 'BASE_WORKDAY',
      name: 'Lương theo công thực tế',
      expression: '(base / 26) * workedDays',
      description: 'Tính lương theo ngày công thực tế trong kỳ',
      isActive: true
    },
    {
      code: 'OT_WEEKDAY',
      name: 'OT ngày thường',
      expression: 'otHours * hourlyRate * 1.5',
      description: 'OT ngày thường hệ số 150%',
      isActive: true
    },
    {
      code: 'NET_PAY',
      name: 'Thực lĩnh',
      expression: 'gross - insurance - tax - otherDeduction',
      description: 'Công thức thực lĩnh cuối cùng',
      isActive: true
    }
  ]);

  await insertBatches('insurance tax configs', insuranceTaxConfigs, [
    {
      effectiveFrom: formatDate(new Date('2024-01-01T00:00:00+07:00')),
      socialInsuranceRate: '0.08',
      healthInsuranceRate: '0.015',
      unemploymentRate: '0.01',
      personalDeduction: '11000000',
      dependentDeduction: '4400000',
      taxBrackets: DEFAULT_TAX_BRACKETS
    },
    {
      effectiveFrom: formatDate(new Date('2025-01-01T00:00:00+07:00')),
      socialInsuranceRate: '0.08',
      healthInsuranceRate: '0.015',
      unemploymentRate: '0.01',
      personalDeduction: '11000000',
      dependentDeduction: '4400000',
      taxBrackets: DEFAULT_TAX_BRACKETS
    }
  ]);

  const salaryRows = await db
    .select({
      employeeId: salaryInfos.employeeId,
      baseSalary: salaryInfos.baseSalary,
      fixedAllowance: salaryInfos.fixedAllowance,
      effectiveFrom: salaryInfos.effectiveFrom
    })
    .from(salaryInfos)
    .orderBy(desc(salaryInfos.effectiveFrom));

  const salaryMap = new Map<string, { baseSalary: number; fixedAllowance: number }>();
  for (const row of salaryRows) {
    if (!salaryMap.has(row.employeeId)) {
      salaryMap.set(row.employeeId, {
        baseSalary: Number(row.baseSalary),
        fixedAllowance: Number(row.fixedAllowance)
      });
    }
  }

  const currentMonth = startOfMonth(new Date());
  const previousMonths = [3, 2, 1].map((offset) => startOfMonth(addMonths(currentMonth, -offset)));
  const previewMonth = currentMonth;

  const adjustmentValues: (typeof salaryAdjustments.$inferInsert)[] = [];
  for (const [index, employee] of allActiveEmployees.entries()) {
    if (index % 4 === 0) {
      adjustmentValues.push({
        employeeId: employee.id,
        type: 'bonus',
        amount: String(1_000_000 + (index % 3) * 500_000),
        effectiveMonth: formatDate(previousMonths[0]!),
        note: 'Thưởng hiệu suất theo tháng'
      });
    }
    if (index % 9 === 0) {
      adjustmentValues.push({
        employeeId: employee.id,
        type: 'allowance',
        amount: '350000',
        effectiveMonth: formatDate(previousMonths[1]!),
        note: 'Phụ cấp dự án ngắn hạn'
      });
    }
    if (index % 15 === 0) {
      adjustmentValues.push({
        employeeId: employee.id,
        type: 'penalty',
        amount: '-250000',
        effectiveMonth: formatDate(previousMonths[2]!),
        note: 'Khấu trừ vi phạm nội quy'
      });
    }
  }
  await insertBatches('salary adjustments', salaryAdjustments, adjustmentValues);

  const payrollRunValues: (typeof payrollRuns.$inferInsert)[] = [
    ...previousMonths.map((periodDate, index) => ({
      period: formatDate(periodDate).slice(0, 7),
      name: `Bảng lương ${formatDate(periodDate).slice(0, 7)}`,
      status: (index === 0 ? 'paid' : index === 1 ? 'approved' : 'locked') as
        | 'paid'
        | 'approved'
        | 'locked',
      lockedAt: new Date(),
      approvedAt: index < 2 ? new Date() : null,
      note: 'Seed payroll lịch sử'
    })),
    {
      period: formatDate(previewMonth).slice(0, 7),
      name: `Preview bảng lương ${formatDate(previewMonth).slice(0, 7)}`,
      status: 'previewed',
      note: 'Seed preview kỳ hiện tại'
    }
  ];

  const createdRuns = await db.insert(payrollRuns).values(payrollRunValues).returning({
    id: payrollRuns.id,
    period: payrollRuns.period,
    status: payrollRuns.status
  });

  const adjustmentRows = await db
    .select({
      employeeId: salaryAdjustments.employeeId,
      type: salaryAdjustments.type,
      amount: salaryAdjustments.amount,
      effectiveMonth: salaryAdjustments.effectiveMonth
    })
    .from(salaryAdjustments);

  const overtimeRows = await db
    .select({
      employeeId: overtimeRequests.employeeId,
      workDate: overtimeRequests.workDate,
      hours: overtimeRequests.hours,
      status: overtimeRequests.status
    })
    .from(overtimeRequests)
    .where(eq(overtimeRequests.status, 'approved'));

  const payslipValues: (typeof payslips.$inferInsert)[] = [];
  for (const run of createdRuns) {
    const periodStart = new Date(`${run.period}-01T00:00:00+07:00`);
    const daysInMonth = endOfMonth(periodStart).getDate();
    const isPreview = run.status === 'previewed';

    for (const [index, employee] of allActiveEmployees.entries()) {
      const salary = salaryMap.get(employee.id) ?? {
        baseSalary: inferBaseSalary(employee, index),
        fixedAllowance: inferAllowance(index)
      };
      const workedDays =
        employee.status === 'on_leave'
          ? 18
          : employee.status === 'probation'
            ? 22
            : 24 - (index % 3);
      const salaryPerDay = salary.baseSalary / daysInMonth;
      const salaryByAttendance = Math.round(salaryPerDay * workedDays);
      const overtimeHours = overtimeRows
        .filter((row) => row.employeeId === employee.id && row.workDate.startsWith(run.period))
        .reduce((sum, row) => sum + Number(row.hours ?? 0), 0);
      const overtimePay = Math.round((salary.baseSalary / 208) * overtimeHours * 1.5);
      const monthAdjustments = adjustmentRows.filter(
        (row) => row.employeeId === employee.id && row.effectiveMonth.startsWith(run.period)
      );
      const positiveAdjustments = monthAdjustments
        .map((row) => Number(row.amount))
        .filter((amount) => amount > 0)
        .reduce((sum, amount) => sum + amount, 0);
      const negativeAdjustments = Math.abs(
        monthAdjustments
          .map((row) => Number(row.amount))
          .filter((amount) => amount < 0)
          .reduce((sum, amount) => sum + amount, 0)
      );
      const grossPay =
        salaryByAttendance + salary.fixedAllowance + overtimePay + positiveAdjustments;
      const insuranceDeduction = Math.round(grossPay * 0.105);
      const taxableIncome = Math.max(grossPay - insuranceDeduction - 11_000_000, 0);
      const taxDeduction = Math.round(taxableIncome * 0.05);
      const netPay = grossPay - insuranceDeduction - taxDeduction - negativeAdjustments;

      payslipValues.push({
        payrollRunId: run.id,
        employeeId: employee.id,
        isPreview,
        baseSalary: String(salaryByAttendance),
        allowances: String(salary.fixedAllowance + positiveAdjustments),
        overtimePay: String(overtimePay),
        grossPay: String(grossPay),
        insuranceDeduction: String(insuranceDeduction),
        taxDeduction: String(taxDeduction),
        otherDeduction: String(negativeAdjustments),
        netPay: String(netPay),
        breakdown: {
          snapshotType: isPreview ? 'preview' : 'locked',
          monthlyBaseSalary: salary.baseSalary,
          salaryPerDay: Math.round(salaryPerDay),
          workedDays,
          workedHours: workedDays * 8,
          paidHours: workedDays * 8,
          salaryByAttendance,
          fixedAllowance: salary.fixedAllowance,
          overtimeHours,
          overtimePay,
          otherAdjustments: positiveAdjustments - negativeAdjustments,
          manualDays: index % 7 === 0 ? 1 : 0,
          timesheetDays: workedDays - (index % 7 === 0 ? 1 : 0)
        },
        publicAccessCode: isPreview
          ? null
          : `PL-${run.period.replace('-', '')}-${employee.employeeCode}`,
        sentAt: isPreview ? null : new Date()
      });
    }
  }

  await insertBatches('payslips', payslips, payslipValues);
}

async function main() {
  console.log('\n=== Seed active HR modules ===\n');

  await clearActiveTables();

  const baseEmployees = await ensureBaseEmployees();
  await seedHrModules(baseEmployees);
  const shiftSeeds = await seedShiftsAndDevices();
  await seedAttendanceModules(baseEmployees, shiftSeeds);
  await seedPayrollModules(baseEmployees);

  console.log('\n✓ Hoàn tất seed dữ liệu cho các phân hệ active.\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
