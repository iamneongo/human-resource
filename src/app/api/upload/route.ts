import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db';
import { files } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ['application/pdf', ['.pdf']],
  ['application/msword', ['.doc']],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', ['.docx']]
]);

function hasAllowedExtension(filename: string) {
  const lower = filename.toLowerCase();
  return Array.from(ALLOWED_TYPES.values()).some((extensions) =>
    extensions.some((extension) => lower.endsWith(extension))
  );
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('hr');
  } catch {
    return NextResponse.json(
      { error: 'Bạn không có quyền upload hồ sơ hợp đồng.' },
      { status: 403 }
    );
  }

  const form = await req.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Không có file.' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type) || !hasAllowedExtension(file.name)) {
    return NextResponse.json({ error: 'Chỉ chấp nhận file PDF, DOC hoặc DOCX.' }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'File phải lớn hơn 0 và không vượt quá 8MB.' },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');

  const [row] = await db
    .insert(files)
    .values({
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      data: base64
    })
    .returning({
      id: files.id,
      filename: files.filename,
      mimeType: files.mimeType,
      size: files.size
    });

  return NextResponse.json({
    fileId: row.id,
    filename: row.filename,
    mimeType: row.mimeType,
    size: row.size
  });
}
