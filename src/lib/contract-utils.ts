export type ContractExpiryStatus = 'ok' | 'warning' | 'expired' | 'indefinite';

export function getContractExpiryStatus(endDate: string | null | undefined): ContractExpiryStatus {
  if (!endDate) return 'indefinite';
  const daysLeft = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 30) return 'warning';
  return 'ok';
}

export function daysUntilExpiry(endDate: string | null | undefined): number | null {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
}
