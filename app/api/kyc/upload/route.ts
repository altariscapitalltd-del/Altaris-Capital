import { NextRequest } from 'next/server'
import { handleUpload } from '@vercel/blob/client'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const result = await handleUpload({
    request,
    body,
    token: process.env.BLOB_READ_WRITE_TOKEN,
    onBeforeGenerateToken: async (pathname) => ({
      allowedContentTypes: ['image/jpeg', 'image/png', 'image/heic', 'image/heif'],
      maximumSizeInBytes: 10 * 1024 * 1024,
      validUntil: Date.now() + 60 * 60 * 1000,
      addRandomSuffix: false,
      allowOverwrite: true,
    }),
  })
  return Response.json(result)
}
