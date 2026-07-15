'use client';

import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import type { auth } from './auth';

function resolveAuthClientBaseUrl(): string {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');

  if (configuredAppUrl) {
    return `${configuredAppUrl}/api/auth`;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/auth`;
  }

  return 'http://localhost:3000/api/auth';
}

export const authClient = createAuthClient({
  baseURL: resolveAuthClientBaseUrl(),
  plugins: [
    inferAdditionalFields<typeof auth>({
      user: {
        role: {
          type: 'string'
        }
      }
    })
  ]
});
