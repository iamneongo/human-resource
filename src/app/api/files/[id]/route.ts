import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

import { db } from '@/db';
import { files } from '@/db/schema';

/** Phục vụ file lưu trong Neon (giải mã base64). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [row] = await db.select().from(files).where(eq(files.id, id)).limit(1);
  if (!row) {
    return new Response('Not found', { status: 404 });
  }
  const buffer = Buffer.from(row.data, 'base64');
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': row.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(row.filename)}"`,
      'Cache-Control': 'private, max-age=3600'
    }
  });
}
