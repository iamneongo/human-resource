import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'Không có file.' }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Chưa cấu hình BLOB_READ_WRITE_TOKEN.' }, { status: 500 });
  }

  const blob = await put(`contracts/${Date.now()}-${file.name}`, file, {
    access: 'public'
  });

  return NextResponse.json({ url: blob.url });
}
