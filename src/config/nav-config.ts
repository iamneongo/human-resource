import { NavGroup } from '@/types';

/**
 * HRM navigation. Visibility here is UX-only; real authorization is enforced
 * server-side via `requireRole()` in each page/server action.
 */
export const navGroups: NavGroup[] = [
  {
    label: 'Tổng quan',
    items: [
      {
        title: 'Dashboard',
        url: '/dashboard/overview',
        icon: 'dashboard',
        shortcut: ['d', 'd'],
        isActive: false,
        items: []
      }
    ]
  },
  {
    label: 'Nhân sự',
    items: [
      {
        title: 'HR-01 · Quản lý Nhân sự',
        url: '#',
        icon: 'employee',
        isActive: true,
        items: [
          { title: 'Hồ sơ nhân viên', url: '/dashboard/hr/employees', icon: 'employee' },
          { title: 'Hợp đồng lao động', url: '/dashboard/hr/contracts', icon: 'page' },
          { title: 'Điều chuyển / Bổ nhiệm', url: '/dashboard/hr/assignments', icon: 'teams' },
          { title: 'Lương & Phúc lợi', url: '/dashboard/hr/salary-info', icon: 'billing' },
          { title: 'Tài sản cấp phát', url: '/dashboard/hr/assets', icon: 'product' },
          { title: 'Khen thưởng / Kỷ luật', url: '/dashboard/hr/rewards', icon: 'badgeCheck' },
          { title: 'Thôi việc (Offboarding)', url: '/dashboard/hr/offboarding', icon: 'logout' },
          { title: 'Báo cáo nhân sự', url: '/dashboard/hr/reports', icon: 'trendingUp' }
        ]
      },
      {
        title: 'HR-02 · Chấm công',
        url: '#',
        icon: 'calendar',
        isActive: false,
        items: [
          { title: 'Cấu hình ca làm việc', url: '/dashboard/attendance/shifts', icon: 'clock' },
          { title: 'Thiết bị chấm công', url: '/dashboard/attendance/devices', icon: 'laptop' },
          { title: 'Bảng công (Timesheet)', url: '/dashboard/attendance/timesheets', icon: 'calendar' },
          { title: 'Làm thêm giờ (OT)', url: '/dashboard/attendance/overtime', icon: 'clock' },
          { title: 'Nghỉ phép', url: '/dashboard/attendance/leaves', icon: 'page' },
          { title: 'Số dư phép', url: '/dashboard/attendance/leave-balances', icon: 'checks' },
          { title: 'Xử lý bất thường', url: '/dashboard/attendance/adjustments', icon: 'alertCircle' }
        ]
      },
      {
        title: 'HR-03 · Tính lương',
        url: '#',
        icon: 'billing',
        isActive: false,
        items: [
          { title: 'Thang bảng lương', url: '/dashboard/payroll/salary-scales', icon: 'billing' },
          { title: 'Công thức lương', url: '/dashboard/payroll/formulas', icon: 'code' },
          { title: 'BHXH & Thuế', url: '/dashboard/payroll/insurance-tax', icon: 'settings' },
          { title: 'Biến động lương', url: '/dashboard/payroll/adjustments', icon: 'adjustments' },
          { title: 'Chốt bảng lương', url: '/dashboard/payroll/runs', icon: 'lock' },
          { title: 'Phiếu lương', url: '/dashboard/payroll/payslips', icon: 'fileTypePdf' },
          { title: 'Báo cáo lương', url: '/dashboard/payroll/reports', icon: 'trendingUp' }
        ]
      },
      {
        title: 'HR-04 · Hiệu suất',
        url: '#',
        icon: 'trendingUp',
        isActive: false,
        items: [
          { title: 'Mô tả công việc (JD)', url: '/dashboard/performance/jd', icon: 'page' },
          { title: 'Khung năng lực', url: '/dashboard/performance/competencies', icon: 'badgeCheck' },
          { title: 'KPI / OKR', url: '/dashboard/performance/kpis', icon: 'trendingUp' },
          { title: 'Chu kỳ đánh giá', url: '/dashboard/performance/cycles', icon: 'calendar' },
          { title: 'Báo cáo hiệu suất', url: '/dashboard/performance/reports', icon: 'trendingUp' }
        ]
      },
      {
        title: 'HR-05 · Đào tạo (L&D)',
        url: '#',
        icon: 'sparkles',
        isActive: false,
        items: [
          { title: 'Nhu cầu đào tạo (TNA)', url: '/dashboard/training/needs', icon: 'help' },
          { title: 'Kế hoạch đào tạo', url: '/dashboard/training/plans', icon: 'calendar' },
          { title: 'Khóa học & Nội dung', url: '/dashboard/training/courses', icon: 'media' },
          { title: 'Ghi danh học viên', url: '/dashboard/training/enrollments', icon: 'teams' },
          { title: 'Theo dõi học tập', url: '/dashboard/training/progress', icon: 'checks' },
          { title: 'Ngân sách đào tạo', url: '/dashboard/training/budget', icon: 'billing' },
          { title: 'Lộ trình nghề nghiệp', url: '/dashboard/training/career-paths', icon: 'trendingUp' }
        ]
      }
    ]
  },
  {
    label: 'Hệ thống',
    items: [
      {
        title: 'Cơ cấu tổ chức',
        url: '/dashboard/org',
        icon: 'workspace',
        isActive: false,
        items: [],
        access: { role: 'admin' }
      },
      {
        title: 'Hồ sơ cá nhân',
        url: '/dashboard/profile',
        icon: 'profile',
        shortcut: ['m', 'm'],
        isActive: false,
        items: []
      }
    ]
  }
];
