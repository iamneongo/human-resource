import { NavGroup } from '@/types';

/**
 * HRM navigation - cấu trúc theo kiểu ứng dụng.
 * Visibility ở đây chỉ để UX; phân quyền thực thi server-side qua `requireRole()`.
 */
export const navGroups: NavGroup[] = [
  {
    label: 'Tổng quan',
    items: [
      {
        title: 'Bảng điều khiển',
        url: '/dashboard/overview',
        icon: 'dashboard',
        shortcut: ['d', 'd'],
        isActive: false,
        items: []
      }
    ]
  },
  {
    label: 'Nghiệp vụ',
    items: [
      {
        title: 'Nhân sự',
        url: '#',
        icon: 'employee',
        isActive: false,
        items: [
          { title: 'Hồ sơ nhân viên', url: '/dashboard/hr/employees' },
          { title: 'Hợp đồng lao động', url: '/dashboard/hr/contracts' },
          { title: 'Điều chuyển / Bổ nhiệm', url: '/dashboard/hr/assignments' },
          { title: 'Lương & Phúc lợi', url: '/dashboard/hr/salary-info' },
          { title: 'Tài sản cấp phát', url: '/dashboard/hr/assets' },
          { title: 'Khen thưởng / Kỷ luật', url: '/dashboard/hr/rewards' },
          { title: 'Thôi việc (Offboarding)', url: '/dashboard/hr/offboarding', disabled: true },
          { title: 'Báo cáo nhân sự', url: '/dashboard/hr/reports', disabled: true }
        ]
      },
      {
        title: 'Chấm công',
        url: '#',
        icon: 'calendar',
        isActive: false,
        items: [
          { title: 'Ca làm việc', url: '/dashboard/attendance/shifts' },
          { title: 'Thiết bị chấm công', url: '/dashboard/attendance/devices', disabled: true },
          { title: 'Bảng công (Timesheet)', url: '/dashboard/attendance/timesheets' },
          { title: 'Làm thêm giờ (OT)', url: '/dashboard/attendance/overtime' },
          { title: 'Nghỉ phép', url: '/dashboard/attendance/leaves' },
          { title: 'Số dư phép', url: '/dashboard/attendance/leave-balances' },
          { title: 'Xử lý bất thường', url: '/dashboard/attendance/adjustments' }
        ]
      },
      {
        title: 'Tiền lương',
        url: '#',
        icon: 'billing',
        isActive: false,
        items: [
          { title: 'Thang bảng lương', url: '/dashboard/payroll/salary-scales' },
          { title: 'Công thức lương', url: '/dashboard/payroll/formulas' },
          { title: 'BHXH & Thuế', url: '/dashboard/payroll/insurance-tax' },
          { title: 'Biến động lương', url: '/dashboard/payroll/adjustments' },
          { title: 'Chốt bảng lương', url: '/dashboard/payroll/runs' },
          { title: 'Phiếu lương', url: '/dashboard/payroll/payslips' },
          { title: 'Báo cáo lương', url: '/dashboard/payroll/reports' }
        ]
      },
      {
        title: 'Hiệu suất',
        url: '#',
        icon: 'trendingUp',
        isActive: false,
        items: [
          { title: 'Mô tả công việc (JD)', url: '/dashboard/performance/jd', disabled: true },
          {
            title: 'Khung năng lực',
            url: '/dashboard/performance/competencies',
            disabled: true
          },
          { title: 'KPI / OKR', url: '/dashboard/performance/kpis', disabled: true },
          { title: 'Chu kỳ đánh giá', url: '/dashboard/performance/cycles', disabled: true },
          { title: 'Báo cáo hiệu suất', url: '/dashboard/performance/reports', disabled: true }
        ]
      }
    ]
  },
  {
    label: 'Quản trị',
    items: [
      {
        title: 'Cơ cấu tổ chức',
        url: '#',
        icon: 'workspace',
        isActive: false,
        access: { role: 'admin' },
        items: [
          { title: 'Sơ đồ tổ chức', url: '/dashboard/org/chart' },
          { title: 'Phòng ban', url: '/dashboard/org/departments' },
          { title: 'Chức vụ', url: '/dashboard/org/positions' },
          { title: 'Liên kết tài khoản', url: '/dashboard/org/accounts' }
        ]
      },
      {
        title: 'Import nhân viên',
        url: '/dashboard/org/import',
        icon: 'upload',
        isActive: false,
        items: []
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
