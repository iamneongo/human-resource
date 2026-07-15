import type { Metadata } from 'next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PayslipDetailCard } from '@/features/hr/payroll/payslip-detail-card';
import { getPublicPayslipByAccessCode } from '@/features/hr/payroll/payslips';

export const metadata: Metadata = {
  title: 'Tra cứu phiếu lương'
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getCode(value: string | string[] | undefined) {
  if (typeof value === 'string') {
    return value.trim().toUpperCase();
  }

  if (Array.isArray(value)) {
    return value[0]?.trim().toUpperCase() ?? '';
  }

  return '';
}

export default async function PublicPayslipLookupPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const code = getCode(searchParams?.code);
  const payslip = code ? await getPublicPayslipByAccessCode(code) : null;
  const showNotFound = Boolean(code) && !payslip;

  return (
    <main className='from-background via-background to-muted/30 min-h-screen bg-gradient-to-b'>
      <div className='mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 sm:px-6'>
        <div className='grid w-full gap-6 lg:grid-cols-[360px_minmax(0,1fr)]'>
          <Card className='py-0'>
            <CardHeader className='border-b py-6'>
              <CardTitle className='text-2xl'>Tra cứu phiếu lương</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4 py-6'>
              <form className='space-y-3'>
                <label htmlFor='code' className='text-sm font-medium'>
                  Nhập mã phiếu lương
                </label>
                <Input
                  id='code'
                  name='code'
                  defaultValue={code}
                  placeholder='Ví dụ: PL-202607-NV0001'
                  autoComplete='off'
                  className='h-11'
                />
                <Button type='submit' className='w-full'>
                  Xem phiếu lương
                </Button>
              </form>

              <div className='text-muted-foreground text-sm'>
                Nhân viên chỉ cần mã do bộ phận HR cung cấp, không cần đăng nhập hệ thống.
              </div>

              {showNotFound ? (
                <div className='rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
                  Không tìm thấy phiếu lương phù hợp với mã này hoặc phiếu chưa được phát hành.
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className='py-0'>
            <CardHeader className='border-b py-6'>
              <CardTitle>{payslip ? 'Chi tiết phiếu lương' : 'Chưa có dữ liệu'}</CardTitle>
            </CardHeader>
            <CardContent className='py-6'>
              {payslip ? (
                <PayslipDetailCard row={payslip} showStatusBadge={false} />
              ) : (
                <div className='text-muted-foreground flex min-h-[320px] items-center justify-center rounded-xl border border-dashed text-center text-sm'>
                  Nhập mã phiếu lương để xem thông tin chi tiết.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
