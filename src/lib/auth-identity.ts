const INTERNAL_LOGIN_DOMAIN = '@local.test';

export function normalizeAuthIdentifier(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return '';
  }

  return normalized.includes('@') ? normalized : `${normalized}${INTERNAL_LOGIN_DOMAIN}`;
}

export function getAccountLabelFromEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (normalized.endsWith(INTERNAL_LOGIN_DOMAIN)) {
    return normalized.slice(0, -INTERNAL_LOGIN_DOMAIN.length);
  }

  return normalized;
}
