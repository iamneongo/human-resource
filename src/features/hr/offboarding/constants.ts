export const OFFBOARDING_FLOW = [
  'submitted',
  'approving',
  'asset_handover',
  'work_handover',
  'settled',
  'completed'
] as const;

export type OffboardingStatus = (typeof OFFBOARDING_FLOW)[number];
