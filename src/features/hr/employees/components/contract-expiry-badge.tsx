import { Badge } from '@/components/ui/badge';
import { getContractExpiryStatus, daysUntilExpiry } from '@/lib/contract-utils';

export function ContractExpiryBadge({ endDate }: { endDate: string | null | undefined }) {
  const status = getContractExpiryStatus(endDate);
  const days = daysUntilExpiry(endDate);

  if (status === 'indefinite') {
    return (
      <Badge variant='outline' className='text-xs'>
        Không XĐ thời hạn
      </Badge>
    );
  }
  if (status === 'expired') {
    return <Badge className='bg-red-600 text-white text-xs'>Hết hạn</Badge>;
  }
  if (status === 'warning') {
    return <Badge className='bg-amber-500 text-white text-xs'>Còn {days} ngày</Badge>;
  }
  return <Badge className='bg-green-600 text-white text-xs'>Còn {days} ngày</Badge>;
}
