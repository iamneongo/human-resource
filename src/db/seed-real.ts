/* eslint-disable no-console */
import 'dotenv/config';

import * as XLSX from 'xlsx';
import { sql } from 'drizzle-orm';

import { db } from './index';
import { departments, employeeProfiles, employees, positions } from './schema';

const FILE = process.argv[2] || 'C:/Users/Asus/Downloads/DS NHÂN SỰ THÁNG 06.xlsx';
const FALLBACK_SHEETS = ['master data ', 'master data', 'Ds lđ hàng ngày-Gốc'];
const MATERNITY_SHEETS = ['nghỉ thai sản'];

type HeaderMap = Record<string, number>;

type NormalizedRow = {
  employeeCode: string;
  fullName: string;
  departmentName: string | null;
  blockName: string | null;
  positionTitle: string | null;
  jobTitle: string | null;
  dateOfBirth: string | null;
  gender: 'male' | 'female' | 'other' | undefined;
  birthPlace: string | null;
  soCccd: string | null;
  cccdIssueDate: string | null;
  cccdIssuePlace: string | null;
  hireDate: string | null;
  seniorityDate: string | null;
  probationEndDate: string | null;
  permanentAddress: string | null;
  phone: string | null;
  companyName: string | null;
  resignDate: string | null;
  resignReason: string | null;
};

function fmt(value: Date): string | null {
  if (Number.isNaN(value.getTime())) return null;
  const year = value.getUTCFullYear();
  if (year < 1900 || year > 2100) return null;
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function excelToISO(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    if (value < 1 || value > 80000) return null;
    return fmt(new Date(Math.round((value - 25569) * 86400 * 1000)));
  }

  const input = String(value).trim();
  const parts = input.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (parts) {
    const [, dd, mm, yy] = parts;
    const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
    const month = Number(mm);
    const day = Number(dd);
    if (year < 1900 || year > 2100) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return fmt(new Date(input));
}

function str(value: unknown) {
  const normalized = String(value ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized || null;
}

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normGender(value: unknown): 'male' | 'female' | 'other' | undefined {
  const normalized = normalizeHeader(value);
  if (normalized.startsWith('nam')) return 'male';
  if (normalized.startsWith('nu')) return 'female';
  return undefined;
}

function findSheet(workbook: XLSX.WorkBook, names: string[]) {
  for (const name of names) {
    const found = workbook.SheetNames.find(
      (sheetName) => normalizeHeader(sheetName) === normalizeHeader(name)
    );
    if (found) return found;
  }

  return null;
}

function detectHeaderRow(rows: unknown[][]) {
  let bestIndex = -1;
  let bestScore = -1;

  rows.forEach((row, index) => {
    const normalized = row.map(normalizeHeader);
    let score = 0;
    if (normalized.includes('danh so') || normalized.includes('msnv')) score += 2;
    if (normalized.includes('ho ten')) score += 2;
    if (normalized.includes('phong ban')) score += 2;
    if (normalized.some((value) => value.includes('ngay thoi viec') || value.includes('nghi viec')))
      score += 2;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  if (bestIndex < 0) {
    throw new Error('Không tìm được dòng header trong file Excel.');
  }

  return bestIndex;
}

function buildHeaderMap(headerRow: unknown[]) {
  const map: HeaderMap = {};
  headerRow.forEach((cell, index) => {
    const key = normalizeHeader(cell);
    if (key) map[key] = index;
  });
  return map;
}

function pickColumn(headerMap: HeaderMap, aliases: string[], required = false) {
  for (const alias of aliases) {
    const normalized = normalizeHeader(alias);
    if (normalized in headerMap) return headerMap[normalized];
  }

  if (required) {
    throw new Error(`Thiếu cột bắt buộc: ${aliases.join(' / ')}`);
  }

  return undefined;
}

function readCell(row: unknown[], index: number | undefined) {
  if (index == null) return null;
  return row[index];
}

function toMaternityCodes(workbook: XLSX.WorkBook) {
  const codes = new Set<string>();

  for (const name of MATERNITY_SHEETS) {
    const sheetName = findSheet(workbook, [name]);
    if (!sheetName) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      blankrows: false,
      defval: ''
    });
    const headerIndex = detectHeaderRow(rows);
    const headerMap = buildHeaderMap(rows[headerIndex] ?? []);
    const codeIndex = pickColumn(headerMap, ['danh so', 'msnv'], true)!;

    for (const row of rows.slice(headerIndex + 1)) {
      const code = str(readCell(row, codeIndex));
      if (code) codes.add(code);
    }
  }

  return codes;
}

function readWorkbook(file: string) {
  const workbook = XLSX.readFile(file);
  const sheetName = findSheet(workbook, FALLBACK_SHEETS);
  if (!sheetName) {
    throw new Error(
      `Không tìm thấy sheet nguồn. Các sheet đang có: ${workbook.SheetNames.join(', ')}`
    );
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    blankrows: false,
    defval: ''
  });
  const headerIndex = detectHeaderRow(rows);
  const headerMap = buildHeaderMap(rows[headerIndex] ?? []);

  const column = {
    employeeCode: pickColumn(headerMap, ['danh so', 'msnv'], true)!,
    fullName: pickColumn(headerMap, ['ho ten'], true)!,
    departmentName: pickColumn(headerMap, ['phong ban'], true)!,
    blockName: pickColumn(headerMap, ['bo phan']),
    positionTitle: pickColumn(headerMap, ['chuc vu']),
    jobTitle: pickColumn(headerMap, ['chuc danh cong viec']),
    dateOfBirth: pickColumn(headerMap, ['ngay thang nam sinh']),
    gender: pickColumn(headerMap, ['gioi tinh']),
    birthPlace: pickColumn(headerMap, ['noi sinh']),
    soCccd: pickColumn(headerMap, ['so cmnd/cccd/cc', 'so cmnd/cccd/cccd']),
    cccdIssueDate: pickColumn(headerMap, ['ngay, thang, nam cap cmnd/cccd']),
    cccdIssuePlace: pickColumn(headerMap, ['noi cap cmnd/cccd']),
    hireDate: pickColumn(headerMap, ['ngay vao lam']),
    permanentAddress: pickColumn(headerMap, ['thuong tru']),
    phone: pickColumn(headerMap, ['so dien thoai']),
    companyName: pickColumn(headerMap, ['ten cong ty']),
    resignDate: pickColumn(headerMap, ['ngay thoi viec/nghi viec'], true)!
  };

  const maternityCodes = toMaternityCodes(workbook);
  const dataRows = rows
    .slice(headerIndex + 1)
    .filter(
      (row) => str(readCell(row, column.employeeCode)) && str(readCell(row, column.fullName))
    );

  const normalizedRows: NormalizedRow[] = dataRows.map((row) => {
    const resignDate = excelToISO(readCell(row, column.resignDate));
    const hireDate = excelToISO(readCell(row, column.hireDate));

    return {
      employeeCode: str(readCell(row, column.employeeCode))!,
      fullName: str(readCell(row, column.fullName))!,
      departmentName: str(readCell(row, column.departmentName)),
      blockName: str(readCell(row, column.blockName)),
      positionTitle: str(readCell(row, column.positionTitle)),
      jobTitle: str(readCell(row, column.jobTitle)),
      dateOfBirth: excelToISO(readCell(row, column.dateOfBirth)),
      gender: normGender(readCell(row, column.gender)),
      birthPlace: str(readCell(row, column.birthPlace)),
      soCccd: str(readCell(row, column.soCccd)),
      cccdIssueDate: excelToISO(readCell(row, column.cccdIssueDate)),
      cccdIssuePlace: str(readCell(row, column.cccdIssuePlace)),
      hireDate,
      seniorityDate: hireDate,
      probationEndDate: null,
      permanentAddress: str(readCell(row, column.permanentAddress)),
      phone: str(readCell(row, column.phone)),
      companyName: str(readCell(row, column.companyName)),
      resignDate,
      resignReason: resignDate ? 'Theo danh sách tháng 06/2026' : null
    };
  });

  return {
    sheetName,
    rows: normalizedRows,
    maternityCodes
  };
}

async function main() {
  console.log(`Đọc file Excel: ${FILE}`);
  const { sheetName, rows, maternityCodes } = readWorkbook(FILE);
  console.log(`Sheet nguồn: ${sheetName}`);
  console.log(`Tổng dòng hợp lệ: ${rows.length}`);

  const uniqueRows = new Map<string, NormalizedRow>();
  for (const row of rows) {
    if (!uniqueRows.has(row.employeeCode)) {
      uniqueRows.set(row.employeeCode, row);
    }
  }

  const employeesFromExcel = [...uniqueRows.values()];
  const terminatedCount = employeesFromExcel.filter((row) => row.resignDate).length;
  const onLeaveCount = employeesFromExcel.filter(
    (row) => !row.resignDate && maternityCodes.has(row.employeeCode)
  ).length;
  const activeCount = employeesFromExcel.length - terminatedCount - onLeaveCount;

  console.log(
    `Sau khi lọc trùng: ${employeesFromExcel.length} nhân sự | active=${activeCount} | on_leave=${onLeaveCount} | terminated=${terminatedCount}`
  );

  console.log('Xóa dữ liệu tổ chức / nhân sự cũ...');
  await db.execute(
    sql`TRUNCATE TABLE employees, departments, positions, cost_centers RESTART IDENTITY CASCADE`
  );

  const blockNames = [
    ...new Set(employeesFromExcel.map((row) => row.blockName).filter(Boolean))
  ] as string[];
  const blockRows = await db
    .insert(departments)
    .values(
      blockNames.map((name, index) => ({
        code: `BLK${String(index + 1).padStart(3, '0')}`,
        name,
        type: 'block' as const
      }))
    )
    .returning({ id: departments.id, name: departments.name });
  const blockMap = new Map(blockRows.map((row) => [row.name, row.id]));

  const departmentToBlock = new Map<string, string | null>();
  for (const row of employeesFromExcel) {
    if (row.departmentName && !departmentToBlock.has(row.departmentName)) {
      departmentToBlock.set(row.departmentName, row.blockName);
    }
  }

  const departmentNames = [...departmentToBlock.keys()];
  const departmentRows = await db
    .insert(departments)
    .values(
      departmentNames.map((name, index) => ({
        code: `PB${String(index + 1).padStart(3, '0')}`,
        name,
        type: 'department' as const,
        parentId: blockMap.get(departmentToBlock.get(name) ?? '') ?? null
      }))
    )
    .returning({ id: departments.id, name: departments.name });
  const departmentMap = new Map(departmentRows.map((row) => [row.name, row.id]));

  const positionNames = [
    ...new Set(employeesFromExcel.map((row) => row.positionTitle).filter(Boolean))
  ] as string[];
  const positionRows = await db
    .insert(positions)
    .values(
      positionNames.map((title, index) => ({
        code: `POS${String(index + 1).padStart(4, '0')}`,
        title
      }))
    )
    .returning({ id: positions.id, title: positions.title });
  const positionMap = new Map(positionRows.map((row) => [row.title, row.id]));

  const employeeValues: (typeof employees.$inferInsert)[] = employeesFromExcel.map((row) => ({
    employeeCode: row.employeeCode,
    fullName: row.fullName,
    dateOfBirth: row.dateOfBirth,
    gender: row.gender,
    soCccd: row.soCccd,
    phone: row.phone,
    hireDate: row.hireDate,
    seniorityDate: row.seniorityDate,
    probationEndDate: row.probationEndDate,
    resignDate: row.resignDate,
    resignReason: row.resignReason,
    status: row.resignDate
      ? 'terminated'
      : maternityCodes.has(row.employeeCode)
        ? 'on_leave'
        : 'active',
    departmentId: departmentMap.get(row.departmentName ?? '') ?? null,
    positionId: positionMap.get(row.positionTitle ?? '') ?? null
  }));

  const insertedEmployees: { id: string; employeeCode: string }[] = [];
  for (let index = 0; index < employeeValues.length; index += 500) {
    const batch = employeeValues.slice(index, index + 500);
    const inserted = await db
      .insert(employees)
      .values(batch)
      .returning({ id: employees.id, employeeCode: employees.employeeCode });
    insertedEmployees.push(...inserted);
  }

  const profileMap = new Map(
    employeesFromExcel.map((row) => [
      row.employeeCode,
      {
        birthPlace: row.birthPlace,
        cccdIssueDate: row.cccdIssueDate,
        cccdIssuePlace: row.cccdIssuePlace,
        nationality: 'Việt Nam',
        permanentAddress: row.permanentAddress,
        educationLevel: null,
        major: null,
        jobTitle: row.jobTitle
      }
    ])
  );

  const profileValues = insertedEmployees.map((employee) => ({
    employeeId: employee.id,
    ...profileMap.get(employee.employeeCode)!
  }));

  for (let index = 0; index < profileValues.length; index += 500) {
    await db.insert(employeeProfiles).values(profileValues.slice(index, index + 500));
  }

  console.log(
    `Hoàn tất import: ${insertedEmployees.length} nhân sự, ${departmentRows.length} phòng ban, ${blockRows.length} khối, ${positionRows.length} chức vụ.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
