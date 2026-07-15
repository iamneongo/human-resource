import type { DriveStep } from 'driver.js';

export type TourDefinition = {
  id: string;
  label: string;
  pathMatch: (pathname: string) => boolean;
  description: string;
  steps: DriveStep[];
};

function byPrefix(prefix: string) {
  return (pathname: string) => pathname.startsWith(prefix);
}

export const TOUR_DEFINITIONS: TourDefinition[] = [
  {
    id: 'app-shell',
    label: 'Làm quen giao diện',
    description: 'Đi một vòng nhanh qua điều hướng chính và các điểm bạn dùng mỗi ngày.',
    pathMatch: byPrefix('/dashboard'),
    steps: [
      {
        element: '[data-tour="nav-sidebar"]',
        popover: {
          title: 'Menu chính',
          description:
            'Bạn đổi module ở đây. Nhân sự, chấm công và tiền lương nằm trong cùng một nhịp điều hướng.'
        }
      },
      {
        element: '[data-tour="header-breadcrumbs"]',
        popover: {
          title: 'Vị trí hiện tại',
          description:
            'Breadcrumb cho bạn biết đang đứng ở màn nào. Khi demo nhiều module liên tiếp, chỗ này giúp người xem không bị lạc.'
        }
      },
      {
        element: '[data-tour="header-search"]',
        popover: {
          title: 'Tìm nhanh',
          description: 'Dùng để mở nhanh màn cần demo mà không phải tìm lại trong menu.'
        }
      },
      {
        element: '[data-tour="header-tour-launcher"]',
        popover: {
          title: 'Mở tour theo màn',
          description:
            'Bạn bấm vào đây để chạy tour của màn đang xem hoặc gọi lại tour giao diện chung.'
        }
      },
      {
        element: '[data-tour="sidebar-profile-menu"]',
        popover: {
          title: 'Tài khoản của bạn',
          description: 'Mở hồ sơ cá nhân, phiếu lương của tôi hoặc đăng xuất từ menu này.'
        }
      }
    ]
  },
  {
    id: 'employees',
    label: 'Hồ sơ nhân viên',
    description: 'Giới thiệu danh sách nhân sự, bộ lọc và chỉ báo hồ sơ số hóa.',
    pathMatch: byPrefix('/dashboard/hr/employees'),
    steps: [
      {
        element: '[data-tour="employees-create"]',
        popover: {
          title: 'Thêm nhân sự',
          description: 'HR bắt đầu từ đây khi tạo hồ sơ mới.'
        }
      },
      {
        element: '[data-tour="employees-summary"]',
        popover: {
          title: 'Tóm tắt nhanh',
          description:
            'Bốn ô này cho bạn biết quy mô danh sách, mức độ đủ hồ sơ và các case cần trình bày.'
        }
      },
      {
        element: '[data-tour="employees-departments"]',
        popover: {
          title: 'Phân bố theo bộ phận',
          description:
            'Bạn nhìn nhanh được phòng ban nào đang đông người nhất trong tập dữ liệu demo.'
        }
      },
      {
        element: '[data-tour="employees-filters"]',
        popover: {
          title: 'Bộ lọc nghiệp vụ',
          description:
            'Lọc theo bộ phận, trạng thái nhân sự và tình trạng hồ sơ để đi đúng case cần xem.'
        }
      },
      {
        element: '[data-tour="employees-table"]',
        popover: {
          title: 'Danh sách hồ sơ',
          description: 'Bạn mở chi tiết từng nhân sự từ bảng này.'
        }
      }
    ]
  },
  {
    id: 'contracts',
    label: 'Hợp đồng lao động',
    description: 'Đi qua flow tạo hợp đồng, đính file và theo dõi vòng đời.',
    pathMatch: byPrefix('/dashboard/hr/contracts'),
    steps: [
      {
        element: '[data-tour="contracts-create"]',
        popover: {
          title: 'Tạo hợp đồng',
          description: 'Flow này dẫn HR từ khởi tạo hợp đồng sang bước đính file.'
        }
      },
      {
        element: '[data-tour="contracts-summary"]',
        popover: {
          title: 'Tổng quan hợp đồng',
          description:
            'Các ô này giúp bạn kể câu chuyện về hợp đồng đang hiệu lực, sắp hết hạn và hợp đồng thiếu file.'
        }
      },
      {
        element: '[data-tour="contracts-table"]',
        popover: {
          title: 'Danh sách hợp đồng',
          description:
            'Bạn theo dõi loại hợp đồng, hiệu lực, file đính kèm và thao tác nhanh ngay tại đây.'
        }
      }
    ]
  },
  {
    id: 'timesheets',
    label: 'Bảng chấm công thủ công',
    description: 'Giải thích cách sửa công tuần, đọc cảnh báo và khóa tuần công.',
    pathMatch: byPrefix('/dashboard/attendance/timesheets'),
    steps: [
      {
        element: '[data-tour="timesheets-summary"]',
        popover: {
          title: 'Tóm tắt tuần công',
          description:
            'Bạn nhìn nhanh được tuần nào đang mở, có bao nhiêu nhân sự và bao nhiêu ngày đang có cảnh báo.'
        }
      },
      {
        element: '[data-tour="timesheets-controls"]',
        popover: {
          title: 'Điều hướng tuần và tìm nhân sự',
          description: 'Đổi tuần, nhảy đến tuần bất kỳ và lọc người cần sửa công từ cụm này.'
        }
      },
      {
        element: '[data-tour="timesheets-legend"]',
        popover: {
          title: 'Cách đọc ô công',
          description:
            'S là sáng, C là chiều. Badge cho bạn biết công tay, công máy và loại cảnh báo đang bám vào ô đó.'
        }
      },
      {
        element: '[data-tour="timesheets-table"]',
        popover: {
          title: 'Lưới công theo tuần',
          description:
            'Bạn sửa công theo dòng, lưu từng dòng và theo dõi trạng thái chưa lưu ngay trong bảng.'
        }
      }
    ]
  },
  {
    id: 'leaves',
    label: 'Nghỉ phép',
    description: 'Đi qua tạo đơn, lọc đơn, duyệt đơn và xem tác động tới số dư phép.',
    pathMatch: byPrefix('/dashboard/attendance/leaves'),
    steps: [
      {
        element: '[data-tour="leaves-create"]',
        popover: {
          title: 'Tạo đơn nghỉ',
          description: 'Nhân viên hoặc HR bắt đầu ở đây khi cần tạo đơn mới.'
        }
      },
      {
        element: '[data-tour="leaves-summary"]',
        popover: {
          title: 'Tóm tắt vận hành',
          description:
            'Các ô này cho bạn biết lượng đơn chờ duyệt, đơn đã duyệt và các case phép năm.'
        }
      },
      {
        element: '[data-tour="leaves-filters"]',
        popover: {
          title: 'Bộ lọc đơn nghỉ',
          description: 'Manager dùng cụm này để lọc theo nhân sự, bộ phận, loại phép và trạng thái.'
        }
      },
      {
        element: '[data-tour="leaves-table"]',
        popover: {
          title: 'Danh sách đơn nghỉ',
          description: 'Bạn duyệt, từ chối, hủy hoặc mở xem nhanh chi tiết đơn từ bảng này.'
        }
      }
    ]
  },
  {
    id: 'payroll-runs',
    label: 'Kỳ lương',
    description: 'Đi qua luồng nháp, preview, chốt và duyệt kỳ lương.',
    pathMatch: byPrefix('/dashboard/payroll/runs'),
    steps: [
      {
        element: '[data-tour="payroll-runs-create"]',
        popover: {
          title: 'Tạo kỳ lương',
          description: 'HR tạo kỳ lương mới từ đây trước khi preview dữ liệu công và lương.'
        }
      },
      {
        element: '[data-tour="payroll-runs-table"]',
        popover: {
          title: 'Danh sách kỳ lương',
          description: 'Bạn theo dõi trạng thái từng kỳ và chạy hành động kế tiếp ngay trong bảng.'
        }
      }
    ]
  },
  {
    id: 'payslips-hr',
    label: 'Phiếu lương cho HR',
    description: 'Giải thích bảng phiếu lương, lọc kỳ lương và phát hành nội bộ.',
    pathMatch: byPrefix('/dashboard/payroll/payslips'),
    steps: [
      {
        element: '[data-tour="payslips-summary"]',
        popover: {
          title: 'Tổng quan phiếu lương',
          description: 'Bạn tách rõ bản preview, bản chính thức và số phiếu đã phát hành từ đây.'
        }
      },
      {
        element: '[data-tour="payslips-filters"]',
        popover: {
          title: 'Bộ lọc phiếu lương',
          description: 'Lọc theo kỳ, bộ phận và nhân sự để đi thẳng vào nhóm cần đối chiếu.'
        }
      },
      {
        element: '[data-tour="payslips-table"]',
        popover: {
          title: 'Bảng phiếu lương',
          description: 'Bạn xem breakdown, cấp mã tra cứu ngoài app và phát hành nội bộ tại đây.'
        }
      }
    ]
  },
  {
    id: 'staffing-tracking',
    label: 'Định biên và tracking ngày',
    description: 'Giới thiệu bộ lọc ngày, forecast lương và bảng chênh lệch định biên.',
    pathMatch: byPrefix('/dashboard/attendance/staffing-tracking'),
    steps: [
      {
        element: '[data-tour="staffing-create"]',
        popover: {
          title: 'Khai báo định biên',
          description: 'HR nhập số người chuẩn theo ngày, bộ phận và ca ở đây.'
        }
      },
      {
        element: '[data-tour="staffing-filters"]',
        popover: {
          title: 'Bộ lọc tracking',
          description: 'Bạn thay ngày, bộ phận hoặc ca để xem đúng lát cắt cần demo.'
        }
      },
      {
        element: '[data-tour="staffing-summary"]',
        popover: {
          title: 'Tổng quan nhanh',
          description:
            'Bạn đọc ngay tổng định biên, số thực tế và forecast chi phí lương theo ngày.'
        }
      },
      {
        element: '[data-tour="staffing-table"]',
        popover: {
          title: 'Bảng tracking',
          description:
            'Mỗi dòng là một ngày, một bộ phận, một ca. Bạn thấy ngay chênh lệch và cảnh báo.'
        }
      }
    ]
  },
  {
    id: 'my-payslips',
    label: 'Phiếu lương của tôi',
    description: 'Đi qua màn nhân viên tự xem phiếu lương đã phát hành.',
    pathMatch: byPrefix('/dashboard/profile/payslips'),
    steps: [
      {
        element: '[data-tour="my-payslips-summary"]',
        popover: {
          title: 'Phiếu đã phát hành',
          description: 'Màn này chỉ hiện các phiếu chính thức mà HR đã phát hành nội bộ cho bạn.'
        }
      },
      {
        element: '[data-tour="my-payslips-filters"]',
        popover: {
          title: 'Lọc theo kỳ lương',
          description: 'Bạn chọn nhanh kỳ muốn xem mà không phải kéo cả danh sách.'
        }
      },
      {
        element: '[data-tour="my-payslips-table"]',
        popover: {
          title: 'Danh sách phiếu lương của tôi',
          description:
            'Bạn mở chi tiết phiếu lương từ đây. Màn này không lẫn dữ liệu của người khác.'
        }
      }
    ]
  }
];

export function getAvailableTours(pathname: string) {
  return TOUR_DEFINITIONS.filter((tour) => tour.pathMatch(pathname));
}

export function getTourById(id: string) {
  return TOUR_DEFINITIONS.find((tour) => tour.id === id) ?? null;
}
