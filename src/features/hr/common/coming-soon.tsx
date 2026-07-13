import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Icons } from '@/components/icons';

export function ComingSoon({
  title = 'Sắp ra mắt',
  description = 'Tính năng này đang được phát triển và sẽ sớm có mặt.'
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Card className='border-dashed'>
      <CardContent className='flex flex-col items-center justify-center gap-4 py-16 text-center'>
        <div className='bg-muted flex size-14 items-center justify-center rounded-full'>
          <Icons.sparkles className='text-muted-foreground size-7' />
        </div>
        <div className='space-y-1'>
          <div className='flex items-center justify-center gap-2'>
            <h3 className='text-lg font-semibold'>{title}</h3>
            <Badge variant='secondary'>Coming soon</Badge>
          </div>
          <p className='text-muted-foreground mx-auto max-w-md text-sm'>{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
