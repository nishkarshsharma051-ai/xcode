import { del, list } from '@vercel/blob';
import path from 'node:path';

export async function GET() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ blobEnabled: false, blobs: [] });
  }

  try {
    const blobs = [];
    let cursor;
    let hasMore = true;

    while (hasMore) {
      const page = await list({ limit: 1000, cursor });
      for (const blob of page.blobs) {
        const name = path.posix.basename(blob.pathname);
        const ext = path.posix.extname(name).toLowerCase().replace(/^\./, '') || 'file';
        blobs.push({
          name,
          path: blob.pathname,
          url: blob.url,
          downloadUrl: blob.downloadUrl,
          size: blob.size,
          modifiedAt: blob.uploadedAt.toISOString(),
          ext,
          source: 'blob',
        });
      }
      cursor = page.cursor;
      hasMore = Boolean(page.hasMore && cursor);
    }

    return Response.json(
      { blobEnabled: true, blobs },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to list files.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: 'Blob storage is not configured.' },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return Response.json({ error: 'Missing url query parameter.' }, { status: 400 });
  }

  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.blob.vercel-storage.com')) {
      return Response.json({ error: 'Invalid blob URL.' }, { status: 400 });
    }

    await del(targetUrl);
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to delete file.' },
      { status: 400 },
    );
  }
}

