import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import {
  getWorkspaceDirectory,
  inviteWorkspaceMember,
  type WorkspaceInvitation,
  type WorkspaceMember
} from '@/features/workspaces/actions';
import { formatDate } from '@/lib/format';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = {
  title: 'HRM: Thành viên workspace'
};

const roleOptions = [
  { value: 'admin', label: 'Admin - Toàn quyền dữ liệu' },
  { value: 'hr', label: 'HR - Vận hành nhân sự' },
  { value: 'manager', label: 'Manager - Theo dõi và phê duyệt' },
  { value: 'employee', label: 'Employee - Truy cập cơ bản' }
];

export default async function TeamPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'admin')) {
    return (
      <PageContainer
        pageTitle='Thành viên workspace'
        access={false}
        accessFallback={
          <div className='text-muted-foreground max-w-xl text-center text-base'>
            Chỉ admin mới được tạo tài khoản và quản lý workspace nội bộ hiện tại.
          </div>
        }
      >
        <div />
      </PageContainer>
    );
  }

  const directory = await getWorkspaceDirectory();

  return (
    <PageContainer
      pageTitle='Thành viên workspace'
      pageHeaderAction={
        <EntityFormDialog
          triggerLabel='Tạo tài khoản thành viên'
          title='Tạo hoặc cấp lại tài khoản nội bộ'
          description='Admin cấp email đăng nhập, vai trò và mật khẩu tạm cho thành viên nội bộ.'
          action={inviteWorkspaceMember}
          fields={[
            {
              name: 'email',
              label: 'Email tài khoản',
              type: 'email',
              required: true,
              placeholder: 'ten@congty.com'
            },
            {
              name: 'role',
              label: 'Vai trò',
              type: 'select',
              required: true,
              options: roleOptions
            },
            {
              name: 'temporaryPassword',
              label: 'Mật khẩu tạm',
              type: 'password',
              required: true,
              placeholder: 'Nhập mật khẩu ban đầu'
            }
          ]}
          defaults={{ role: 'admin' }}
          successMessage='Đã cấp tài khoản nội bộ'
        />
      }
    >
      <div className='space-y-6'>
        <div className='grid gap-3 md:grid-cols-3'>
          <SummaryCard
            title='Thành viên đang hoạt động'
            value={String(directory.summary.totalMembers)}
            helper='Tất cả đang dùng chung một workspace nội bộ.'
          />
          <SummaryCard
            title='Admin hiện tại'
            value={String(directory.summary.adminMembers)}
            helper='Nhóm này có toàn quyền xem và thao tác dữ liệu.'
          />
          <SummaryCard
            title='Tài khoản đã cấp'
            value={String(directory.summary.acceptedInvitations)}
            helper='Có thể đăng nhập ngay bằng tài khoản và mật khẩu tạm.'
          />
        </div>

        <Card>
          <CardHeader className='pb-4'>
            <CardTitle>Danh sách thành viên</CardTitle>
          </CardHeader>
          <CardContent className='overflow-x-auto'>
            <Table className='min-w-[760px]'>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[280px]'>Thành viên</TableHead>
                  <TableHead className='w-[180px]'>Vai trò</TableHead>
                  <TableHead className='w-[180px]'>Ngày tham gia</TableHead>
                  <TableHead className='w-[140px]'>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {directory.members.length > 0 ? (
                  directory.members.map((member) => <MemberRow key={member.id} member={member} />)
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className='text-muted-foreground py-10 text-center'>
                      Chưa có thành viên nào trong workspace.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-4'>
            <CardTitle>Lịch sử cấp tài khoản</CardTitle>
          </CardHeader>
          <CardContent className='overflow-x-auto'>
            <Table className='min-w-[880px]'>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[280px]'>Email</TableHead>
                  <TableHead className='w-[180px]'>Vai trò</TableHead>
                  <TableHead className='w-[160px]'>Trạng thái</TableHead>
                  <TableHead className='w-[180px]'>Lần cập nhật cuối</TableHead>
                  <TableHead className='w-[180px]'>Đã kích hoạt lúc</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {directory.invitations.length > 0 ? (
                  directory.invitations.map((invitation) => (
                    <InvitationRow key={invitation.id} invitation={invitation} />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className='text-muted-foreground py-10 text-center'>
                      Chưa có tài khoản nào được cấp. Bạn có thể tạo ngay từ nút phía trên.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function SummaryCard({ title, value, helper }: { title: string; value: string; helper: string }) {
  return (
    <Card className='shadow-sm'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-semibold'>{value}</div>
        <p className='text-muted-foreground mt-1 text-xs leading-5'>{helper}</p>
      </CardContent>
    </Card>
  );
}

function MemberRow({ member }: { member: WorkspaceMember }) {
  return (
    <TableRow>
      <TableCell>
        <div className='font-medium'>{member.name || 'Tài khoản nội bộ'}</div>
        <div className='text-muted-foreground text-sm'>{member.email}</div>
      </TableCell>
      <TableCell>
        <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>{member.role}</Badge>
      </TableCell>
      <TableCell>{formatDate(member.createdAt, { month: '2-digit' })}</TableCell>
      <TableCell>
        <Badge variant='outline'>Đang hoạt động</Badge>
      </TableCell>
    </TableRow>
  );
}

function InvitationRow({ invitation }: { invitation: WorkspaceInvitation }) {
  return (
    <TableRow>
      <TableCell>
        <div className='font-medium'>{invitation.email}</div>
        {invitation.memberName ? (
          <div className='text-muted-foreground text-sm'>Đã gắn với {invitation.memberName}</div>
        ) : (
          <div className='text-muted-foreground text-sm'>Chưa gắn thành viên</div>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={invitation.role === 'admin' ? 'default' : 'secondary'}>
          {invitation.role}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge
          variant={
            invitation.status === 'accepted'
              ? 'secondary'
              : invitation.status === 'revoked'
                ? 'destructive'
                : 'outline'
          }
        >
          {invitation.status === 'accepted'
            ? 'Đã cấp'
            : invitation.status === 'revoked'
              ? 'Đã thu hồi'
              : 'Chờ xử lý'}
        </Badge>
      </TableCell>
      <TableCell>{formatDate(invitation.updatedAt, { month: '2-digit' })}</TableCell>
      <TableCell>
        {invitation.acceptedAt ? formatDate(invitation.acceptedAt, { month: '2-digit' }) : '—'}
      </TableCell>
    </TableRow>
  );
}
