/* eslint-disable no-console */
/**
 * Seed dữ liệu nhân sự THẬT từ file Excel công ty (sheet "Ds lđ hàng ngày-Gốc").
 *   bun run src/db/seed-real.ts "<đường dẫn .xlsx>"
 *
 * Xóa sạch dữ liệu tổ chức/nhân sự cũ rồi nạp lại. Idempotent.
 */
import 'dotenv/config';
import * as XLSX from 'xlsx';
import { sql } from 'drizzle-orm';

import { db } from './index';
import { departments, employeeProfiles, employees, positions } from './schema';

const FILE =
  process.argv[2] ||
  'C:/Users/Asus/Downloads/Triển khai Phân hệ HRM/DANH SACH NHAN SU_TOAN CONG TY_NAM 2026 29.06.xlsx';
const SHEET = 'Ds lđ hàng ngày-Gốc';

/* ------------------------- helpers chuẩn hóa ------------------------- */
function fmt(d: Date): string | null {
  if (isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  if (y < 1900 || y > 2100) return null; // loại giá trị rác
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function excelToISO(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') {
    // Excel serial hợp lệ nằm trong khoảng ~ [1, 80000]
    if (v < 1 || v > 80000) return null;
    return fmt(new Date(Math.round((v - 25569) * 86400 * 1000)));
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const [, dd, mm, yy] = m;
    const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
    if (year < 1900 || year > 2100) return null;
    const mo = Number(mm);
    const da = Number(dd);
    if (mo < 1 || mo > 12 || da < 1 || da > 31) return null;
    return `${year}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
  }
  const d = new Date(s);
  return fmt(d);
}

function normGender(v: unknown): 'male' | 'female' | 'other' | undefined {
  const s = String(v ?? '')
    .trim()
    .toLowerCase();
  if (s.startsWith('nam')) return 'male';
  if (s.startsWith('n')) return 'female'; // Nữ
  return undefined;
}

const str = (v: unknown) => {
  const s = String(v ?? '')
    .replace(/\r?\n/g, ' ')
    .trim();
  return s || null;
};

async function main() {
  console.log('Đọc file:', FILE);
  const wb = XLSX.readFile(FILE);
  const ws = wb.Sheets[SHEET];
  if (!ws) throw new Error(`Không thấy sheet "${SHEET}"`);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    blankrows: false,
    defval: ''
  });

  // Chỉ số cột (theo header thật)
  const C = {
    name: 1,
    msnv: 2,
    phongBan: 3,
    boPhan: 4,
    section: 6,
    chucVu: 9,
    chucDanh: 10,
    dob: 13,
    gender: 14,
    birthPlace: 15,
    cccd: 16,
    cccdDate: 17,
    cccdPlace: 18,
    seniority: 19,
    hire: 20,
    probEnd: 21,
    eduLevel: 41,
    major: 42,
    permanent: 43,
    phone: 49,
    resignDate: 50,
    resignReason: 51,
    nationality: 52
  };

  const data = rows.slice(2).filter((r) => str(r[C.msnv]) && str(r[C.name]));
  console.log('Số dòng NV:', data.length);

  /* --------- Xóa sạch dữ liệu cũ (cascade) --------- */
  console.log('Xóa dữ liệu tổ chức/nhân sự cũ...');
  await db.execute(
    sql`TRUNCATE TABLE employees, departments, positions, cost_centers RESTART IDENTITY CASCADE`
  );

  /* --------- Cây tổ chức: khối (Bộ phận) -> phòng ban --------- */
  const blockNames = [...new Set(data.map((r) => str(r[C.boPhan])).filter(Boolean))] as string[];
  const blockRows = await db
    .insert(departments)
    .values(
      blockNames.map((name, i) => ({
        code: `BLK${String(i + 1).padStart(3, '0')}`,
        name,
        type: 'block' as const
      }))
    )
    .returning({ id: departments.id, name: departments.name });
  const blockMap = new Map(blockRows.map((b) => [b.name, b.id]));

  // phòng ban gắn parent = khối của dòng đầu tiên gặp
  const deptFirstBlock = new Map<string, string | null>();
  for (const r of data) {
    const p = str(r[C.phongBan]);
    if (p && !deptFirstBlock.has(p)) deptFirstBlock.set(p, str(r[C.boPhan]));
  }
  const deptNames = [...deptFirstBlock.keys()];
  const deptRows = await db
    .insert(departments)
    .values(
      deptNames.map((name, i) => ({
        code: `PB${String(i + 1).padStart(3, '0')}`,
        name,
        type: 'department' as const,
        parentId: blockMap.get(deptFirstBlock.get(name) ?? '') ?? null
      }))
    )
    .returning({ id: departments.id, name: departments.name });
  const deptMap = new Map(deptRows.map((d) => [d.name, d.id]));

  /* --------- Chức vụ --------- */
  const posNames = [...new Set(data.map((r) => str(r[C.chucVu])).filter(Boolean))] as string[];
  const posRows = await db
    .insert(positions)
    .values(
      posNames.map((title, i) => ({
        code: `POS${String(i + 1).padStart(4, '0')}`,
        title
      }))
    )
    .returning({ id: positions.id, title: positions.title });
  const posMap = new Map(posRows.map((p) => [p.title, p.id]));

  /* --------- Nhân viên (dedupe theo MSNV) --------- */
  const seen = new Set<string>();
  const empValues: (typeof employees.$inferInsert)[] = [];
  const profileByCode = new Map<string, Omit<typeof employeeProfiles.$inferInsert, 'employeeId'>>();

  for (const r of data) {
    const code = str(r[C.msnv])!;
    if (seen.has(code)) continue;
    seen.add(code);
    const resignDate = excelToISO(r[C.resignDate]);
    empValues.push({
      employeeCode: code,
      fullName: str(r[C.name])!,
      dateOfBirth: excelToISO(r[C.dob]),
      gender: normGender(r[C.gender]),
      soCccd: str(r[C.cccd]),
      phone: str(r[C.phone]),
      hireDate: excelToISO(r[C.hire]),
      seniorityDate: excelToISO(r[C.seniority]),
      probationEndDate: excelToISO(r[C.probEnd]),
      resignDate,
      resignReason: str(r[C.resignReason]),
      status: resignDate ? 'terminated' : 'active',
      departmentId: deptMap.get(str(r[C.phongBan]) ?? '') ?? null,
      positionId: posMap.get(str(r[C.chucVu]) ?? '') ?? null
    });
    profileByCode.set(code, {
      birthPlace: str(r[C.birthPlace]),
      cccdIssueDate: excelToISO(r[C.cccdDate]),
      cccdIssuePlace: str(r[C.cccdPlace]),
      nationality: str(r[C.nationality]),
      permanentAddress: str(r[C.permanent]),
      educationLevel: str(r[C.eduLevel]),
      major: str(r[C.major]),
      jobTitle: str(r[C.chucDanh])
    });
  }

  console.log('Insert', empValues.length, 'nhân viên...');
  // insert theo lô 500
  const inserted: { id: string; employeeCode: string }[] = [];
  for (let i = 0; i < empValues.length; i += 500) {
    const chunk = empValues.slice(i, i + 500);
    const res = await db
      .insert(employees)
      .values(chunk)
      .returning({ id: employees.id, employeeCode: employees.employeeCode });
    inserted.push(...res);
  }

  console.log('Insert hồ sơ chi tiết...');
  const profileValues = inserted.map((e) => ({
    employeeId: e.id,
    ...profileByCode.get(e.employeeCode)!
  }));
  for (let i = 0; i < profileValues.length; i += 500) {
    await db.insert(employeeProfiles).values(profileValues.slice(i, i + 500));
  }

  console.log(
    `✓ Hoàn tất: ${inserted.length} NV, ${deptRows.length} phòng ban, ${blockRows.length} khối, ${posRows.length} chức vụ.`
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
