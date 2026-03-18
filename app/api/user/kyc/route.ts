import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { trigger, adminChannel } from '@/lib/pusher'
import { sendTelegramFile, sendTelegramMessage } from '@/lib/telegram'

const MAX_KYC_BYTES = 10 * 1024 * 1024
const ALLOWED_KYC_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
const ALLOWED_KYC_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf'])

function extFromMime(type: string) {
  if (type === 'image/jpeg') return '.jpg'
  if (type === 'image/png') return '.png'
  if (type === 'image/webp') return '.webp'
  if (type === 'application/pdf') return '.pdf'
  return ''
}

async function storeKycAsset(file: File, userId: string, prefix: string) {
  const extension = (path.extname(file.name).toLowerCase() || extFromMime(file.type) || '.jpg')
  if (!ALLOWED_KYC_EXT.has(extension)) {
    throw new Error('Invalid document extension')
  }

  const filename = `kyc/${prefix}-${userId}-${Date.now()}${extension}`

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import('@vercel/blob')
      const blob = await put(filename, file, { access: 'private', addRandomSuffix: true })
      return blob.url
    }
  } catch {
    // fallback to local storage below
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const dir = path.join(process.cwd(), 'uploads', 'kyc')
  await mkdir(dir, { recursive: true })
  const localName = `${prefix}-${userId}-${Date.now()}${extension}`
  await writeFile(path.join(dir, localName), buffer)
  return localName
}

function validateFile(file: File | null | undefined, label: string, allowedTypes = ALLOWED_KYC_TYPES) {
  if (!file || file.size === 0) throw new Error(`Please upload your ${label}.`)
  if (file.size > MAX_KYC_BYTES) throw new Error(`${label} is too large (max 10MB)`)
  if (!allowedTypes.has(file.type)) throw new Error(`Unsupported ${label} format`)
}

async function forwardKycToTelegram(params: {
  userId: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  dateOfBirth: string
  country: string
  documentType: string
  documentNumber: string
  documentFile: File
  selfieFile: File
}) {
  const message = [
    '🛂 <b>New KYC submission received</b>',
    `User ID: <code>${params.userId}</code>`,
    `Name: <b>${params.fullName}</b>`,
    `Email: <b>${params.email}</b>`,
    `Country: <b>${params.country}</b>`,
    `DOB: <b>${params.dateOfBirth}</b>`,
    `Document: <b>${params.documentType}</b>`,
    `Document No: <code>${params.documentNumber}</code>`,
  ].join('\n')

  try {
    await sendTelegramMessage(message)
    await sendTelegramFile({
      file: params.documentFile,
      kind: params.documentFile.type.startsWith('image/') ? 'photo' : 'document',
      filename: params.documentFile.name,
      caption: `📄 ${params.fullName} — identity document`,
    })
    await sendTelegramFile({
      file: params.selfieFile,
      kind: 'photo',
      filename: params.selfieFile.name,
      caption: `🤳 ${params.fullName} — verification selfie`,
    })
  } catch (error) {
    console.error('Failed to forward KYC to Telegram', error)
  }
}

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
    if (existing && existing.status === 'PENDING_REVIEW') {
      return NextResponse.json({ error: 'Your KYC is already under review.' }, { status: 400 })
    }
    if (existing?.status === 'APPROVED') {
      return NextResponse.json({ error: 'KYC already approved.' }, { status: 400 })
    }

    const formData = await req.formData()
    const firstName = (formData.get('firstName') as string) || ''
    const lastName = (formData.get('lastName') as string) || ''
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || (formData.get('fullName') as string) || ''
    const dateOfBirth = (formData.get('dob') as string) || (formData.get('dateOfBirth') as string) || ''
    const country = (formData.get('country') as string) || (formData.get('address') as string) || ''
    const documentType = ((formData.get('docType') as string) || 'passport').trim()
    const documentNumber = ((formData.get('docNumber') as string) || '').trim()
    const documentFile = (formData.get('documentFile') as File) || (formData.get('document') as File)
    const selfieFile = (formData.get('selfieFile') as File) || (formData.get('selfie') as File)

    if (!fullName.trim() || !dateOfBirth.trim() || !country.trim()) {
      return NextResponse.json({ error: 'Full name, date of birth, and country are required.' }, { status: 400 })
    }
    if (!documentNumber) {
      return NextResponse.json({ error: 'Document number is required.' }, { status: 400 })
    }

    validateFile(documentFile, 'identity document')
    validateFile(selfieFile, 'selfie', new Set(['image/jpeg', 'image/png', 'image/webp']))

    const storedDocumentPath = await storeKycAsset(documentFile, user.id, 'document')
    await storeKycAsset(selfieFile, user.id, 'selfie')

    if (existing) {
      await prisma.kycSubmission.update({
        where: { userId: user.id },
        data: {
          fullName,
          dateOfBirth,
          address: country,
          documentPath: storedDocumentPath,
          status: 'PENDING_REVIEW',
          rejectionReason: null,
          submittedAt: new Date(),
          reviewedAt: null,
        },
      })
    } else {
      await prisma.kycSubmission.create({
        data: { userId: user.id, fullName, dateOfBirth, address: country, documentPath: storedDocumentPath, status: 'PENDING_REVIEW' },
      })
    }

    await prisma.user.update({ where: { id: user.id }, data: { kycStatus: 'PENDING_REVIEW' } })
    await trigger(adminChannel, 'admin:kyc_submitted', { userId: user.id, fullName, country, documentType })
    await forwardKycToTelegram({
      userId: user.id,
      email: user.email,
      firstName,
      lastName,
      fullName,
      dateOfBirth,
      country,
      documentType,
      documentNumber,
      documentFile,
      selfieFile,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to submit KYC' }, { status: 500 })
  }
}
