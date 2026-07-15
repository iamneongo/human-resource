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
            Chỉ admin mới được mời thêm thành viên và quản lý workspace nội bộ hiện tại.
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
          triggerLabel='Mời thành viên'
          title='Mời thành viên vào workspace'
          description='Thành viên được mời sẽ đăng nhập bằng OTP email và vào thẳng workspace hiện tại.'
          action={inviteWorkspaceMember}
          fields={[
            {
              name: 'email',
              label: 'Email thành viên',
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
            }
          ]}
          defaults={{ role: 'admin' }}
          successMessage='Đã gửi lời mời thành viên'
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
            title='Lời mời chờ tham gia'
            value={String(directory.summary.pendingInvitations)}
            helper='Sẽ chuyển sang đã tham gia sau khi đăng nhập OTP lần đầu.'
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
            <CardTitle>Lời mời đã gửi</CardTitle>
          </CardHeader>
          <CardContent className='overflow-x-auto'>
            <Table className='min-w-[880px]'>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[280px]'>Email</TableHead>
                  <TableHead className='w-[180px]'>Vai trò</TableHead>
                  <TableHead className='w-[160px]'>Trạng thái</TableHead>
                  <TableHead className='w-[180px]'>Lần gửi cuối</TableHead>
                  <TableHead className='w-[180px]'>Đã tham gia lúc</TableHead>
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
                      Chưa có lời mời nào. Bạn có thể mời ngay thành viên từ nút phía trên.
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
          <div className='text-muted-foreground text-sm'>Chưa đăng nhập lần đầu</div>
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
            ? 'Đã tham gia'
            : invitation.status === 'revoked'
              ? 'Đã thu hồi'
              : 'Chờ tham gia'}
        </Badge>
      </TableCell>
      <TableCell>{formatDate(invitation.updatedAt, { month: '2-digit' })}</TableCell>
      <TableCell>
        {invitation.acceptedAt ? formatDate(invitation.acceptedAt, { month: '2-digit' }) : '—'}
      </TableCell>
    </TableRow>
  );
}
