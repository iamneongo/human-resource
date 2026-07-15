'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

type BreadcrumbItem = {
  title: string;
  link: string;
};

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Trang chủ',
  overview: 'Bảng điều khiển',
  hr: 'Nhân sự',
  employees: 'Hồ sơ nhân viên',
  contracts: 'Hợp đồng lao động',
  assignments: 'Điều chuyển / Bổ nhiệm',
  'salary-info': 'Lương & phúc lợi',
  assets: 'Tài sản',
  rewards: 'Khen thưởng / Kỷ luật',
  offboarding: 'Thôi việc',
  reports: 'Báo cáo',
  attendance: 'Chấm công',
  shifts: 'Ca làm việc',
  devices: 'Thiết bị chấm công',
  timesheets: 'Bảng công',
  overtime: 'Làm thêm giờ',
  leaves: 'Nghỉ phép',
  'leave-balances': 'Số dư phép',
  adjustments: 'Điều chỉnh',
  payroll: 'Tiền lương',
  'salary-scales': 'Thang bảng lương',
  formulas: 'Công thức lương',
  'insurance-tax': 'BHXH & Thuế',
  runs: 'Chốt bảng lương',
  payslips: 'Phiếu lương',
  performance: 'Hiệu suất',
  jd: 'Mô tả công việc',
  competencies: 'Khung năng lực',
  kpis: 'KPI / OKR',
  cycles: 'Chu kỳ đánh giá',
  workspaces: 'Workspace',
  team: 'Thành viên workspace',
  org: 'Cơ cấu tổ chức',
  chart: 'Sơ đồ tổ chức',
  departments: 'Phòng ban',
  positions: 'Chức vụ',
  profile: 'Hồ sơ cá nhân',
  notifications: 'Thông báo'
};

function labelFor(segment: string): string {
  return SEGMENT_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function useBreadcrumbs() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      return {
        title: labelFor(segment),
        link: path
      } satisfies BreadcrumbItem;
    });
  }, [pathname]);

  return breadcrumbs;
}
