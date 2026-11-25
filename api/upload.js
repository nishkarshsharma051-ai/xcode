import { handleUpload } from '@vercel/blob/client';

export async function POST(request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: 'Blob storage is not configured (missing BLOB_READ_WRITE_TOKEN).' },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowOverwrite: true,
        maximumSizeInBytes: 500 * 1024 * 1024,
      }),
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize upload.' },
      { status: 400 },
    );
  }
}

