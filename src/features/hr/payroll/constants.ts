export const DEFAULT_TAX_BRACKETS: Array<{ upTo: number | null; rate: number }> = [
  { upTo: 5_000_000, rate: 0.05 },
  { upTo: 10_000_000, rate: 0.1 },
  { upTo: 18_000_000, rate: 0.15 },
  { upTo: 32_000_000, rate: 0.2 },
  { upTo: 52_000_000, rate: 0.25 },
  { upTo: 80_000_000, rate: 0.3 },
  { upTo: null, rate: 0.35 }
];

export const PAYROLL_RUN_STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp',
  previewed: 'Đã preview',
  calculating: 'Đang tính',
  locked: 'Đã chốt',
  approving: 'Chờ duyệt',
  approved: 'Đã duyệt',
  paid: 'Đã chi trả'
};

export const SALARY_ADJUSTMENT_LABEL: Record<string, string> = {
  raise: 'Tăng lương',
  cut: 'Giảm lương',
  allowance: 'Phụ cấp',
  bonus: 'Thưởng',
  penalty: 'Phạt',
  other: 'Khác'
};
