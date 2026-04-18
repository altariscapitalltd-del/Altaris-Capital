import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { trigger, adminChannel } from '@/lib/pusher'
import { notifyUser } from '@/lib/push'

const MAX_KYC_BYTES = 10 * 1024 * 1024
const ALLOWED_KYC_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf'])
const ALLOWED_KYC_EXT = new Set(['.jpg', '.jpeg', '.png', '.pdf'])

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const kyc = await prisma.kycSubmission.findUnique({ where: { userId: user.id } })
  const status = kyc?.status ?? user.kycStatus ?? 'NOT_SUBMITTED'
  return NextResponse.json({ kyc, status })
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const existing = await prisma.kycSubmission.findUnique({ where: { userId: user.id } })
    if (existing?.status === 'PENDING_REVIEW') {
      return NextResponse.json({ error: 'Your KYC is already under review.' }, { status: 400 })
    }
    if (existing?.status === 'APPROVED') {
      return NextResponse.json({ error: 'KYC already approved.' }, { status: 400 })
    }

    const formData = await req.formData()
    const firstName    = (formData.get('firstName') as string) || ''
    const lastName     = (formData.get('lastName') as string) || ''
    const fullName     = [firstName, lastName].filter(Boolean).join(' ') || (formData.get('fullName') as string) || ''
    const dateOfBirth  = (formData.get('dob') as string) || (formData.get('dateOfBirth') as string) || ''
    const address      = (formData.get('country') as string) || (formData.get('address') as string) || ''
    const documentType = (formData.get('docType') as string) || ''
    const documentNumber = (formData.get('docNumber') as string) || ''
    const document     = (formData.get('documentFile') as File) || (formData.get('document') as File)
    const selfie       = formData.get('selfieFile') as File | null

    if (!fullName.trim() || !dateOfBirth.trim() || !address.trim()) {
      return NextResponse.json({ error: 'Full name, date of birth, and address are required' }, { status: 400 })
    }
    if (!document || document.size === 0) {
      return NextResponse.json({ error: 'Document photo is required' }, { status: 400 })
    }
    if (document.size > MAX_KYC_BYTES) {
      return NextResponse.json({ error: 'Document is too large (max 10MB)' }, { status: 400 })
    }
    if (!ALLOWED_KYC_TYPES.has(document.type)) {
      return NextResponse.json({ error: 'Unsupported document format. Use JPEG, PNG, or PDF.' }, { status: 400 })
    }

    const extension = path.extname(document.name).toLowerCase()
    if (!ALLOWED_KYC_EXT.has(extension)) {
      return NextResponse.json({ error: 'Invalid document extension' }, { status: 400 })
    }

    const dir = path.join(process.cwd(), 'uploads', 'kyc')
    await mkdir(dir, { recursive: true })

    const filename = `${user.id}-${Date.now()}${extension}`
    await writeFile(path.join(dir, filename), Buffer.from(await document.arrayBuffer()))

    let selfieFilename: string | null = null
    if (selfie && selfie.size > 0) {
      const selfieExt = path.extname(selfie.name || '.jpg').toLowerCase() || '.jpg'
      selfieFilename = `${user.id}-selfie-${Date.now()}${selfieExt}`
      await writeFile(path.join(dir, selfieFilename), Buffer.from(await selfie.arrayBuffer()))
    }

    const kycData = {
      fullName, dateOfBirth, address,
      documentType: documentType || null,
      documentNumber: documentNumber || null,
      documentPath: filename,
      selfieFile: selfieFilename,
      status: 'PENDING_REVIEW' as const,
      rejectionReason: null,
      submittedAt: new Date(),
      reviewedAt: null,
    }

    if (existing) {
      await prisma.kycSubmission.update({ where: { userId: user.id }, data: kycData })
    } else {
      await prisma.kycSubmission.create({ data: { userId: user.id, ...kycData } })
    }

    await prisma.user.update({ where: { id: user.id }, data: { kycStatus: 'PENDING_REVIEW' } })

    await trigger(adminChannel, 'admin:kyc_submitted', {
      userId: user.id,
      name: user.name,
      email: user.email,
    })

    await notifyUser(
      prisma, user.id,
      'KYC Submitted',
      'Your identity documents have been submitted and are under review. We\'ll notify you within 1-2 business days.',
      '/kyc'
    )

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[KYC submit]', e?.message ?? e)
    return NextResponse.json({ error: 'Failed to submit KYC. Please try again.' }, { status: 500 })
  }
}
