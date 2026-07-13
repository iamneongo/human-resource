import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type BadgeDef = { label: string; className?: string };

const MAP: Record<string, BadgeDef> = {
  // Employee status
  active: { label: 'Đang làm việc', className: 'bg-green-600 text-white hover:bg-green-700' },
  probation: { label: 'Thử việc', className: 'bg-blue-500 text-white hover:bg-blue-600' },
  on_leave: { label: 'Nghỉ phép', className: 'bg-amber-500 text-white hover:bg-amber-600' },
  terminated: { label: 'Đã nghỉ', className: 'bg-red-600 text-white hover:bg-red-700' },

  // Contract status
  'contract:active': { label: 'Hiệu lực', className: 'bg-green-600 text-white hover:bg-green-700' },
  'contract:expired': { label: 'Hết hạn', className: 'bg-red-600 text-white hover:bg-red-700' },
  'contract:terminated': {
    label: 'Chấm dứt',
    className: 'bg-gray-600 text-white hover:bg-gray-700'
  },

  // Payroll run status
  draft: { label: 'Nháp', className: 'bg-gray-200 text-gray-800' },
  calculating: { label: 'Đang tính', className: 'bg-blue-100 text-blue-800' },
  locked: { label: 'Đã chốt', className: 'bg-amber-100 text-amber-800' },
  approving: { label: 'Chờ duyệt', className: 'bg-orange-100 text-orange-800' },
  approved: { label: 'Đã duyệt', className: 'bg-green-100 text-green-800' },
  paid: { label: 'Đã chi trả', className: 'bg-emerald-600 text-white hover:bg-emerald-700' },

  // Leave / OT / Adjustment request status
  pending: { label: 'Chờ duyệt', className: 'bg-amber-100 text-amber-800' },
  approved_req: { label: 'Đã duyệt', className: 'bg-green-100 text-green-800' },
  rejected: { label: 'Từ chối', className: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Đã huỷ', className: 'bg-gray-200 text-gray-600' },

  // Asset status
  assigned: { label: 'Đang cấp', className: 'bg-blue-100 text-blue-800' },
  returned: { label: 'Đã trả', className: 'bg-gray-200 text-gray-700' },
  lost: { label: 'Mất/Hỏng', className: 'bg-red-100 text-red-800' },

  // Reward / Discipline
  reward: { label: 'Khen thưởng', className: 'bg-yellow-100 text-yellow-800' },
  discipline: { label: 'Kỷ luật', className: 'bg-red-100 text-red-800' }
};

export function StatusBadge({ status, prefix }: { status: string; prefix?: string }) {
  const key = prefix ? `${prefix}:${status}` : status;
  const def = MAP[key] ?? MAP[status];
  if (!def) return <span className='text-muted-foreground text-xs'>{status}</span>;
  return <Badge className={cn('text-xs font-medium', def.className)}>{def.label}</Badge>;
}
