import PageContainer from '@/components/layout/page-container';
import { AttendanceBoard } from '@/features/hr/attendance/attendance-board';
import { getAttendanceBoardData } from '@/features/hr/attendance/board';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Bảng chấm công thủ công' };

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TimesheetsPage(props: PageProps) {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return (
      <PageContainer
        pageTitle='Bảng chấm công thủ công'
        access={false}
        accessFallback={
          <div className='text-muted-foreground text-center text-lg'>
            Bạn cần vai trò quản lý trở lên để xem bảng chấm công thủ công.
          </div>
        }
      >
        <div />
      </PageContainer>
    );
  }

  const searchParams = await props.searchParams;
  const weekStartValue = searchParams?.weekStart;
  const weekStart =
    typeof weekStartValue === 'string'
      ? weekStartValue
      : Array.isArray(weekStartValue)
        ? weekStartValue[0]
        : undefined;

  const boardData = await getAttendanceBoardData(weekStart);
  const canEdit = roleAtLeast(role, 'hr');

  return (
    <PageContainer
      pageTitle='Bảng chấm công thủ công'
      pageDescription='Nhập công theo tuần bằng lưới sáng/chiều. Công thủ công có thể override dữ liệu timesheet trong cùng ngày và sẽ ảnh hưởng tới tracking định biên ngày cũng như preview payroll khi chạy lại kỳ lương.'
    >
      <AttendanceBoard {...boardData} canEdit={canEdit} />
    </PageContainer>
  );
}
