/** Chuẩn hóa dùng chung cho import (không phụ thuộc DB). */

export function toISODate(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') {
    if (v < 1 || v > 80000) return null;
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return fmt(d);
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const [, dd, mm, yy] = m;
    const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
    const mo = Number(mm);
    const da = Number(dd);
    if (year < 1900 || year > 2100 || mo < 1 || mo > 12 || da < 1 || da > 31) return null;
    return `${year}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
  }
  return fmt(new Date(s));
}

function fmt(d: Date): string | null {
  if (isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  if (y < 1900 || y > 2100) return null;
  return `${y}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function toGender(v: unknown): 'male' | 'female' | 'other' | undefined {
  const s = String(v ?? '')
    .trim()
    .toLowerCase();
  if (!s) return undefined;
  if (s.startsWith('nam') || s === 'male' || s === 'm') return 'male';
  if (s.startsWith('nữ') || s.startsWith('nu') || s === 'female' || s === 'f') return 'female';
  return 'other';
}

/** Các field hệ thống có thể map khi import nhân viên. */
export const EMPLOYEE_IMPORT_FIELDS = [
  { key: 'employeeCode', label: 'Mã nhân viên', required: true },
  { key: 'fullName', label: 'Họ và tên', required: true },
  { key: 'department', label: 'Phòng ban' },
  { key: 'position', label: 'Chức vụ' },
  { key: 'dateOfBirth', label: 'Ngày sinh' },
  { key: 'gender', label: 'Giới tính' },
  { key: 'soCccd', label: 'Số CMND/CCCD' },
  { key: 'phone', label: 'Số điện thoại' },
  { key: 'email', label: 'Email' },
  { key: 'hireDate', label: 'Ngày vào làm' },
  { key: 'seniorityDate', label: 'Ngày theo dõi thâm niên' },
  { key: 'birthPlace', label: 'Nơi sinh' },
  { key: 'permanentAddress', label: 'Thường trú' }
] as const;

export type EmployeeImportRow = Partial<
  Record<(typeof EMPLOYEE_IMPORT_FIELDS)[number]['key'], string>
>;
