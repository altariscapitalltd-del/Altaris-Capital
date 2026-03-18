import { NextRequest } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'

export async function GET(_req: NextRequest, { params }: { params: { name: string } }) {
  const filePath = path.join(process.cwd(), 'uploads', 'kyc', params.name)
  const buffer = await readFile(filePath)
  return new Response(buffer)
}
