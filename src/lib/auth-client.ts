'use client';

import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import type { auth } from './auth';

export const authClient = createAuthClient({
  baseURL: '/api/auth',
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
