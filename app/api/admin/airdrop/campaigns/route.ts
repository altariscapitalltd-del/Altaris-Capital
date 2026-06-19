export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, CampaignStatus } from '@prisma/client'

const prisma = new PrismaClient()

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return unauthorized()

    const campaigns = await prisma.airdropCampaign.findMany({
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ campaigns })
  } catch (error: any) {
    console.error('Admin campaigns error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return unauthorized()

    const body = await req.json()
    const {
      chainId,
      chainName,
      ecosystemCategory,
      campaignType,
      titleTemplate,
      subtitleTemplate,
      description,
      allocation,
      tokenPrice,
      claimAmount,
      requirements,
      eligibilityRules,
      tags,
      permitRequired,
      spenderContract,
      airdropContract,
      priority,
    } = body

    if (!chainId || !chainName || !titleTemplate) {
      return badRequest('chainId, chainName, and titleTemplate are required')
    }

    const campaign = await prisma.airdropCampaign.create({
      data: {
        chainId: parseInt(chainId),
        chainName,
        ecosystemCategory: ecosystemCategory || 'DeFi',
        campaignType: campaignType || 'reward',
        titleTemplate,
        subtitleTemplate: subtitleTemplate || `${chainName.toUpperCase()} \u00B7 Participant`,
        description: description || '',
        allocation: allocation || '',
        tokenPrice: tokenPrice || '',
        claimAmount: claimAmount || '',
        requirements: requirements || [],
        eligibilityRules: eligibilityRules || {},
        tags: tags || [],
        permitRequired: permitRequired ?? false,
        spenderContract,
        airdropContract,
        priority: priority || 0,
      },
    })

    return NextResponse.json({ campaign })
  } catch (error: any) {
    console.error('Admin create campaign error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return unauthorized()

    const body = await req.json()
    const { id, ...updates } = body

    if (!id) return badRequest('Campaign id is required')

    const campaign = await prisma.airdropCampaign.update({
      where: { id },
      data: updates,
    })

    return NextResponse.json({ campaign })
  } catch (error: any) {
    console.error('Admin update campaign error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
