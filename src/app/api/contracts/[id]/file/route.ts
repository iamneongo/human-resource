import { and, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

import { db } from '@/db';
import { contracts, files } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole('manager');

  const { id } = await params;
  const [row] = await db
    .select({
      contractId: contracts.id,
      filename: contracts.fileName,
      mimeType: contracts.fileMimeType,
      fileId: contracts.fileId,
      data: files.data
    })
    .from(contracts)
    .leftJoin(files, eq(contracts.fileId, files.id))
    .where(and(eq(contracts.id, id)))
    .limit(1);

  if (!row?.fileId || !row.data || !row.mimeType || !row.filename) {
    return new Response('Not found', { status: 404 });
  }

  const download = req.nextUrl.searchParams.get('download') === '1';
  const buffer = Buffer.from(row.data, 'base64');
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': row.mimeType,
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(
        row.filename
      )}"`,
      'Cache-Control': 'private, no-store'
    }
  });
}
