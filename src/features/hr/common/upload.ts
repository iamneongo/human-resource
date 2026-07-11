'use server';

import { db } from '@/db';
import { files } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

type UploadResult =
  | { ok: true; url: string; filename: string }
  | { ok: false; error: string };

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

/** Tải file lên và lưu trong Neon (base64). Trả về URL tải xuống. */
export async function uploadFile(input: {
  filename: string;
  mimeType: string;
  base64: string;
}): Promise<UploadResult> {
  try {
    await requireRole('employee');
  } catch {
    return { ok: false, error: 'Bạn cần đăng nhập để tải lên.' };
  }
  const { filename, mimeType, base64 } = input;
  if (!filename || !base64) return { ok: false, error: 'File không hợp lệ.' };

  const size = Math.floor((base64.length * 3) / 4);
  if (size > MAX_BYTES)
    return { ok: false, error: 'File vượt quá 8MB.' };

  try {
    const [row] = await db
      .insert(files)
      .values({ filename, mimeType: mimeType || 'application/octet-stream', size, data: base64 })
      .returning({ id: files.id });
    return { ok: true, url: `/api/files/${row.id}`, filename };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi tải lên' };
  }
}
