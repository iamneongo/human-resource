import { Geist, Geist_Mono } from 'next/font/google';

import { cn } from '@/lib/utils';

/**
 * Trimmed to 2 Google fonts (Geist + Geist Mono) for reliable dev/build.
 * The template originally loaded 14 fonts; fetching all of them at compile
 * time repeatedly failed against fonts.gstatic.com in this environment and
 * crashed both `next dev` and `next build`. Theme presets that reference
 * other --font-* variables simply fall back to the browser default.
 */
const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans'
});

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono'
});

export const fontVariables = cn(fontSans.variable, fontMono.variable);
