/* eslint-disable no-console */
/**
 * Seed dữ liệu ngành thủy sản: phòng ban, chức vụ, ca làm việc
 *   bun run src/db/seeds/aquaculture.ts
 *
 * Script chỉ INSERT nếu chưa tồn tại (dựa trên code).
 * Không xoá dữ liệu hiện có.
 */
import 'dotenv/config';

import { db } from '../index';
import { costCenters, departments, positions, shifts } from '../schema';
import { eq } from 'drizzle-orm';

async function upsertDept(
  code: string,
  name: string,
  type: 'block' | 'department' | 'section' | 'workshop',
  costCenterId?: string
) {
  const existing = await db
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.code, code))
    .limit(1);
  if (existing.length > 0) {
    console.log(`  [skip] Phòng ban ${code} đã tồn tại`);
    return existing[0].id;
  }
  const [row] = await db
    .insert(departments)
    .values({ code, name, type, costCenterId })
    .returning({ id: departments.id });
  console.log(`  [+] Phòng ban ${code} - ${name}`);
  return row.id;
}

async function upsertPosition(code: string, title: string, departmentId: string | null) {
  const existing = await db
    .select({ id: positions.id })
    .from(positions)
    .where(eq(positions.code, code))
    .limit(1);
  if (existing.length > 0) {
    console.log(`  [skip] Chức vụ ${code} đã tồn tại`);
    return existing[0].id;
  }
  const [row] = await db
    .insert(positions)
    .values({ code, title, departmentId })
    .returning({ id: positions.id });
  console.log(`  [+] Chức vụ ${code} - ${title}`);
  return row.id;
}

async function upsertShift(
  code: string,
  name: string,
  type: 'office' | 'split' | 'night' | 'rotating',
  startTime: string,
  endTime: string,
  breakMinutes: number,
  standardHours: string
) {
  const existing = await db
    .select({ id: shifts.id })
    .from(shifts)
    .where(eq(shifts.code, code))
    .limit(1);
  if (existing.length > 0) {
    console.log(`  [skip] Ca ${code} đã tồn tại`);
    return;
  }
  await db
    .insert(shifts)
    .values({ code, name, type, startTime, endTime, breakMinutes, standardHours });
  console.log(`  [+] Ca ${code} - ${name} (${startTime}–${endTime})`);
}

async function main() {
  console.log('\n=== Seed dữ liệu ngành Thủy sản ===\n');

  // --- Cost Centers ---
  console.log('Cost Centers:');
  const [ccSX] = await db
    .insert(costCenters)
    .values({ code: 'CC-SX', name: 'Khối Sản xuất' })
    .onConflictDoNothing()
    .returning({ id: costCenters.id });
  const [ccQL] = await db
    .insert(costCenters)
    .values({ code: 'CC-QL', name: 'Khối Quản lý' })
    .onConflictDoNothing()
    .returning({ id: costCenters.id });
  const ccSXId = ccSX?.id;
  const ccQLId = ccQL?.id;

  // --- Departments ---
  console.log('\nPhòng ban:');
  const ntsDeptId = await upsertDept('NTS', 'Nuôi trồng thủy sản', 'department', ccSXId);
  const cbDeptId = await upsertDept('CB', 'Chế biến thủy sản', 'workshop', ccSXId);
  const qcDeptId = await upsertDept('QC', 'Kiểm soát chất lượng', 'department', ccSXId);
  const logDeptId = await upsertDept('LOG', 'Logistics & Xuất khẩu', 'department', ccSXId);
  const btDeptId = await upsertDept('BT', 'Bảo trì thiết bị', 'section', ccSXId);
  const labDeptId = await upsertDept('LAB', 'Phòng thí nghiệm', 'department', ccSXId);
  const klDeptId = await upsertDept('KL', 'Kho lạnh', 'workshop', ccSXId);
  const hcDeptId = await upsertDept('HC', 'Hành chính nhân sự', 'department', ccQLId);
  const ktDeptId = await upsertDept('KT', 'Kế toán tài chính', 'department', ccQLId);
  const kdDeptId = await upsertDept('KD', 'Kinh doanh & Thị trường', 'department', ccQLId);

  // --- Positions ---
  console.log('\nChức vụ:');
  // Lãnh đạo
  await upsertPosition('GD', 'Giám đốc', null);
  await upsertPosition('PGD-SX', 'Phó Giám đốc Sản xuất', null);
  await upsertPosition('PGD-KD', 'Phó Giám đốc Kinh doanh', null);

  // Nuôi trồng
  await upsertPosition('TT-NTS', 'Trưởng phòng Nuôi trồng', ntsDeptId);
  await upsertPosition('TP-NTS', 'Tổ phó Nuôi trồng', ntsDeptId);
  await upsertPosition('KTV-NTS', 'Kỹ thuật viên nuôi trồng', ntsDeptId);
  await upsertPosition('CN-NTS', 'Công nhân nuôi trồng', ntsDeptId);

  // Chế biến
  await upsertPosition('QD-CB', 'Quản đốc Chế biến', cbDeptId);
  await upsertPosition('TT-CB', 'Tổ trưởng Chế biến', cbDeptId);
  await upsertPosition('CN-CB', 'Công nhân Chế biến', cbDeptId);
  await upsertPosition('CN-DONG', 'Công nhân Đóng gói', cbDeptId);

  // Kiểm soát chất lượng
  await upsertPosition('TT-QC', 'Trưởng phòng QC', qcDeptId);
  await upsertPosition('KSV-QC', 'Kiểm soát viên QC', qcDeptId);
  await upsertPosition('KTV-QC', 'Kỹ thuật viên QC', qcDeptId);

  // Logistics
  await upsertPosition('TT-LOG', 'Trưởng phòng Logistics', logDeptId);
  await upsertPosition('NV-XK', 'Chuyên viên Xuất khẩu', logDeptId);
  await upsertPosition('NV-LOG', 'Nhân viên Logistics', logDeptId);
  await upsertPosition('LX-NANG', 'Lái xe nâng', logDeptId);

  // Bảo trì
  await upsertPosition('TT-BT', 'Tổ trưởng Bảo trì', btDeptId);
  await upsertPosition('KTV-BT', 'Kỹ thuật viên Bảo trì', btDeptId);

  // Phòng thí nghiệm
  await upsertPosition('TT-LAB', 'Trưởng phòng Thí nghiệm', labDeptId);
  await upsertPosition('KTV-LAB', 'Kỹ thuật viên Xét nghiệm', labDeptId);

  // Kho lạnh
  await upsertPosition('TP-KL', 'Trưởng Kho lạnh', klDeptId);
  await upsertPosition('NV-KL', 'Nhân viên Kho lạnh', klDeptId);
  await upsertPosition('BV', 'Bảo vệ', klDeptId);

  // Hành chính nhân sự
  await upsertPosition('TT-HC', 'Trưởng phòng Hành chính', hcDeptId);
  await upsertPosition('NV-NS', 'Nhân viên Nhân sự', hcDeptId);
  await upsertPosition('NV-HC', 'Nhân viên Hành chính', hcDeptId);

  // Kế toán
  await upsertPosition('KT-TRUONG', 'Kế toán trưởng', ktDeptId);
  await upsertPosition('NV-KT', 'Nhân viên Kế toán', ktDeptId);

  // Kinh doanh
  await upsertPosition('TT-KD', 'Trưởng phòng Kinh doanh', kdDeptId);
  await upsertPosition('NV-KD', 'Nhân viên Kinh doanh', kdDeptId);

  // --- Shifts ---
  console.log('\nCa làm việc:');
  await upsertShift('HC', 'Hành chính', 'office', '08:00', '17:00', 60, '8');
  await upsertShift('CB-S', 'Ca sáng Chế biến', 'split', '06:00', '14:00', 30, '7.5');
  await upsertShift('CB-C', 'Ca chiều Chế biến', 'split', '14:00', '22:00', 30, '7.5');
  await upsertShift('KL-D', 'Ca đêm Kho lạnh', 'night', '22:00', '06:00', 30, '7.5');
  await upsertShift('NTS-S', 'Ca sáng Nuôi trồng', 'split', '05:30', '13:30', 30, '7.5');
  await upsertShift('NTS-C', 'Ca chiều Nuôi trồng', 'split', '13:30', '21:30', 30, '7.5');

  console.log('\n=== Hoàn thành! ===\n');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
