import { Arimo, Geist_Mono } from 'next/font/google';

import { cn } from '@/lib/utils';

/**
 * Font chính: Arimo (metric-compatible với Arial), hỗ trợ tiếng Việt.
 * Mono giữ Geist Mono cho mã/biểu thức.
 */
const fontSans = Arimo({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans'
});

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono'
});

export const fontVariables = cn(fontSans.variable, fontMono.variable);
