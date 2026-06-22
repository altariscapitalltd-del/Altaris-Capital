'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { AltarisLogoMark } from '@/components/AltarisLogo'
import CoinIcon from '@/components/ui/CoinIcon'

type ChainType = 'EVM' | 'BTC' | 'SOL' | 'XRP'
const ALL_CRYPTOS: { sym: string; name: string; color: string; minDeposit: number; network: string; glyph: string; chain: ChainType; popular?: boolean }[] = [
  // Popular
  { sym: 'BTC',   name: 'Bitcoin',      color: '#F7931A', minDeposit: 0.0001, network: 'Bitcoin',      glyph: '₿', chain: 'BTC', popular: true },
  { sym: 'ETH',   name: 'Ethereum',     color: '#627EEA', minDeposit: 0.001,  network: 'Ethereum',     glyph: '◆', chain: 'EVM', popular: true },
  { sym: 'USDT',  name: 'Tether USD',   color: '#26A17B', minDeposit: 5,      network: 'ERC-20',       glyph: '₮', chain: 'EVM', popular: true },
  { sym: 'USDC',  name: 'USD Coin',     color: '#2775CA', minDeposit: 5,      network: 'ERC-20',       glyph: '$', chain: 'EVM', popular: true },
  { sym: 'BNB',   name: 'BNB',          color: '#F3BA2F', minDeposit: 0.01,   network: 'BEP-20',       glyph: 'B', chain: 'EVM', popular: true },
  { sym: 'SOL',   name: 'Solana',       color: '#14F195', minDeposit: 0.05,   network: 'Solana',       glyph: 'S', chain: 'SOL', popular: true },
  { sym: 'XRP',   name: 'XRP',          color: '#00AAE4', minDeposit: 1,      network: 'XRP Ledger',   glyph: 'X', chain: 'XRP', popular: true },
  // EVM — Ethereum
  { sym: 'WBTC',  name: 'Wrapped BTC',  color: '#F7931A', minDeposit: 0.0001, network: 'ERC-20',       glyph: 'W', chain: 'EVM' },
  { sym: 'DAI',   name: 'Dai',          color: '#F5AC37', minDeposit: 5,      network: 'ERC-20',       glyph: 'D', chain: 'EVM' },
  { sym: 'LINK',  name: 'Chainlink',    color: '#2A5ADA', minDeposit: 0.5,    network: 'ERC-20',       glyph: 'L', chain: 'EVM' },
  { sym: 'UNI',   name: 'Uniswap',      color: '#FF007A', minDeposit: 0.5,    network: 'ERC-20',       glyph: 'U', chain: 'EVM' },
  { sym: 'AAVE',  name: 'Aave',         color: '#B6509E', minDeposit: 0.05,   network: 'ERC-20',       glyph: 'A', chain: 'EVM' },
  { sym: 'SHIB',  name: 'Shiba Inu',    color: '#FF2D2D', minDeposit: 1e6,    network: 'ERC-20',       glyph: 'S', chain: 'EVM' },
  { sym: 'PEPE',  name: 'Pepe',         color: '#4DA943', minDeposit: 1e6,    network: 'ERC-20',       glyph: 'P', chain: 'EVM' },
  // EVM — L2 / sidechains (same 0x address)
  { sym: 'ARB',   name: 'Arbitrum',     color: '#28A0F0', minDeposit: 1,      network: 'Arbitrum One', glyph: 'A', chain: 'EVM' },
  { sym: 'OP',    name: 'Optimism',     color: '#FF0420', minDeposit: 0.5,    network: 'Optimism',     glyph: 'O', chain: 'EVM' },
  { sym: 'MATIC', name: 'Polygon',      color: '#8247E5', minDeposit: 1,      network: 'Polygon',      glyph: 'M', chain: 'EVM' },
  { sym: 'AVAX',  name: 'Avalanche',    color: '#E84142', minDeposit: 0.1,    network: 'Avalanche C',  glyph: 'A', chain: 'EVM' },
  { sym: 'FTM',   name: 'Fantom',       color: '#1969FF', minDeposit: 5,      network: 'Fantom',       glyph: 'F', chain: 'EVM' },
  { sym: 'BASE',  name: 'Base ETH',     color: '#0052FF', minDeposit: 0.001,  network: 'Base',         glyph: 'B', chain: 'EVM' },
  // EVM — BSC tokens
  { sym: 'CAKE',  name: 'PancakeSwap',  color: '#1FC7D4', minDeposit: 0.5,    network: 'BEP-20',       glyph: 'C', chain: 'EVM' },
  // Solana SPL
  { sym: 'RAY',   name: 'Raydium',      color: '#5AC4BE', minDeposit: 1,      network: 'Solana SPL',   glyph: 'R', chain: 'SOL' },
  { sym: 'JUP',   name: 'Jupiter',      color: '#00C2FF', minDeposit: 1,      network: 'Solana SPL',   glyph: 'J', chain: 'SOL' },
  { sym: 'BONK',  name: 'Bonk',         color: '#F2A900', minDeposit: 50000,  network: 'Solana SPL',   glyph: 'B', chain: 'SOL' },
  { sym: 'JTO',   name: 'Jito',         color: '#65D497', minDeposit: 1,      network: 'Solana SPL',   glyph: 'J', chain: 'SOL' },
]
const DEFAULT_MANAGED = ['BTC','ETH','USDT','USDC','BNB','SOL','XRP']

// Chain detection — used for both the static list and live market coins
const _SOL_SYMS = new Set(['SOL','RAY','JUP','BONK','JTO','PYTH','WIF','BOME','ORCA','MNGO','SAMO','STEP'])
const _SOL_IDS  = new Set(['solana'])
const _BTC_IDS  = new Set(['bitcoin'])
const _XRP_IDS  = new Set(['ripple','xrp'])
function detectCoinChain(sym: string, id: string = ''): ChainType {
  const s = sym.toUpperCase()
  if (s === 'BTC' || _BTC_IDS.has(id)) return 'BTC'
  if (_SOL_SYMS.has(s) || _SOL_IDS.has(id)) return 'SOL'
  if (s === 'XRP' || _XRP_IDS.has(id)) return 'XRP'
  return 'EVM'
}
const _NET_LABELS: Record<string, string> = {
  ETH:'Ethereum', BNB:'BNB Chain', MATIC:'Polygon', AVAX:'Avalanche C', FTM:'Fantom',
  ARB:'Arbitrum One', OP:'Optimism', CRO:'Cronos', BASE:'Base',
  USDT:'ERC-20', USDC:'ERC-20', DAI:'ERC-20', WBTC:'ERC-20',
  LINK:'ERC-20', UNI:'ERC-20', AAVE:'ERC-20', SHIB:'ERC-20', PEPE:'ERC-20',
  SOL:'Solana', XRP:'XRP Ledger', BTC:'Bitcoin',
}
function coinNetworkLabel(sym: string, id: string = ''): string {
  const chain = detectCoinChain(sym, id)
  if (chain === 'BTC') return 'Bitcoin'
  if (chain === 'SOL') return 'Solana SPL'
  if (chain === 'XRP') return 'XRP Ledger'
  return _NET_LABELS[sym.toUpperCase()] || 'EVM Compatible'
}

type WalletTab = 'none' | 'deposit' | 'withdraw' | 'reward'

function ShadowCard({ h = 96 }: { h?: number }) {
  return (
    <div style={{
      height: h,
      borderRadius: 18,
      background: '#050505',
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: 'none',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, transparent 18%, rgba(255,255,255,0.06) 32%, transparent 46%)', backgroundSize: '200% 100%', opacity: 0.35 }} />
      <div style={{ position: 'absolute', top: 14, left: 14, right: 14, height: 12, borderRadius: 999, background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ position: 'absolute', top: 38, left: 14, right: 70, height: 18, borderRadius: 999, background: 'rgba(255,255,255,0.08)' }} />
      <div style={{ position: 'absolute', bottom: 14, left: 14, width: '58%', height: 12, borderRadius: 999, background: 'rgba(255,255,255,0.05)' }} />
      <div style={{ position: 'absolute', bottom: 14, right: 14, width: 54, height: 54, borderRadius: 16, background: 'rgba(255,255,255,0.05)' }} />
    </div>
  )
}

function MiniTrend({ values, color = '#C9A227' }: { values: number[]; color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || values.length < 2) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = 130
    const height = 52
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1

    const points = values.map((v, i) => ({
      x: (i / (values.length - 1)) * width,
      y: height - ((v - min) / range) * (height - 8) - 4,
    }))

    ctx.clearRect(0, 0, width, height)

    const grad = ctx.createLinearGradient(0, 0, 0, height)
    grad.addColorStop(0, 'rgba(242,186,14,0.38)')
    grad.addColorStop(1, 'rgba(242,186,14,0)')

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
    ctx.strokeStyle = color
    ctx.lineWidth = 2.2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()
  }, [values, color])

  return <canvas ref={canvasRef} style={{ width: 130, height: 52, display: 'block' }} />
}

function PortfolioChart({ data, color = '#0ECB81', width = 336, height = 96 }: { data: number[]; color?: string; width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr; canvas.height = height * dpr; ctx.scale(dpr, dpr)
    const values = data.length > 1 ? data : [0, 0]
    const min = Math.min(...values), max = Math.max(...values), pad = Math.max((max - min) * .18, max * .004, 1)
    const lo = min - pad, hi = max + pad, range = hi - lo || 1
    const left = 8, right = width - 8, top = 8, bottom = height - 16
    const xs = values.map((_, i) => left + (i / Math.max(values.length - 1, 1)) * (right - left))
    const ys = values.map(v => bottom - ((v - lo) / range) * (bottom - top))
    ctx.clearRect(0, 0, width, height)
    ctx.strokeStyle = 'rgba(255,255,255,.055)'; ctx.lineWidth = 1
    ;[.33,.66].forEach(t => { const y = top + (bottom - top) * t; ctx.beginPath(); ctx.moveTo(left,y); ctx.lineTo(right,y); ctx.stroke() })
    const grad = ctx.createLinearGradient(0, top, 0, bottom); grad.addColorStop(0, color + '40'); grad.addColorStop(1, color + '00')
    ctx.beginPath(); ctx.moveTo(xs[0],ys[0]); for(let i=1;i<xs.length;i++){const m=(xs[i-1]+xs[i])/2; ctx.bezierCurveTo(m,ys[i-1],m,ys[i],xs[i],ys[i])} ctx.lineTo(xs[xs.length-1],bottom); ctx.lineTo(xs[0],bottom); ctx.closePath(); ctx.fillStyle=grad; ctx.fill()
    ctx.beginPath(); ctx.moveTo(xs[0],ys[0]); for(let i=1;i<xs.length;i++){const m=(xs[i-1]+xs[i])/2; ctx.bezierCurveTo(m,ys[i-1],m,ys[i],xs[i],ys[i])} ctx.strokeStyle=color; ctx.lineWidth=2.3; ctx.lineCap='round'; ctx.stroke()
  }, [data, color, width, height])
  return <canvas ref={canvasRef} style={{ width: '100%', height, display: 'block' }} />
}

export default function WalletPage() {
  const [tab, setTab] = useState<WalletTab>('none')
  const [depositMode, setDepositMode] = useState<'select' | 'network' | 'crypto' | 'fiat'>('select')
  const [coin, setCoin] = useState<string>('USDT')
  const [receiveSearch, setReceiveSearch] = useState('')
  const [receiveFilter, setReceiveFilter] = useState<'All' | 'Bitcoin' | 'Ethereum' | 'Solana' | 'XRP'>('All')
  const [showManage, setShowManage] = useState(false)
  const [managedCoins, setManagedCoins] = useState<string[]>(DEFAULT_MANAGED)
  const [receiveCoinList, setReceiveCoinList] = useState<any[]>([])
  const [receiveLoaded, setReceiveLoaded] = useState(false)
  const [selectedCoinData, setSelectedCoinData] = useState<any>(null)
  const [amount, setAmount] = useState('')
  const [txHash, setTxHash] = useState('')
  const [withdrawAddress, setWithdrawAddress] = useState('')
  const [walletAddresses, setWalletAddresses] = useState<Record<string, string>>({})
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [investedTotal, setInvestedTotal] = useState(0)
  const [marketPrices, setMarketPrices] = useState<Record<string, { price: number; change: number; image?: string; spark?: number[] }>>({})
  const [chartRange, setChartRange] = useState<'24H' | '7D' | '30D' | 'All'>('24H')
  const [transactions, setTransactions] = useState<any[]>([])
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [refCode, setRefCode] = useState('')
  const [profile, setProfile] = useState<{ name?: string; avatarUrl?: string }>({})
  const [userWallet, setUserWallet] = useState('')
  const [chainAddrs, setChainAddrs] = useState<{ btc?: string; sol?: string; xrp?: string }>({})
  const [balanceHidden, setBalanceHidden] = useState(false)
  const marketCoins = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP']

  useEffect(() => {
    try {
      const saved = localStorage.getItem('altaris:managedCoins')
      if (saved) setManagedCoins(JSON.parse(saved))
    } catch {}
  }, [])

  function toggleManagedCoin(sym: string) {
    setManagedCoins(prev => {
      const next = prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
      try { localStorage.setItem('altaris:managedCoins', JSON.stringify(next)) } catch {}
      return next
    })
  }

  function loadProfile() {
    fetch('/api/user/profile')
      .then((r) => r.json())
      .then((d) => {
        const nextBalances: Record<string, number> = {}
        d.user?.balances?.forEach((b: any) => {
          nextBalances[b.currency] = b.amount
        })
        setBalances(nextBalances)

        const active = d.user?.investments?.filter((i: any) => i.status === 'ACTIVE') || []
        setInvestedTotal(active.reduce((sum: number, i: any) => sum + i.amount, 0))
        setRefCode(d.user?.referralCode || 'ALTARIS01')
        setProfile({ name: d.user?.name, avatarUrl: d.user?.avatarUrl || d.user?.avatar })
        if (d.user?.walletAddress) setUserWallet(d.user.walletAddress)
        const cw = d.user?.chainWallets
        if (cw) setChainAddrs({ btc: cw.btc?.address, sol: cw.sol?.address, xrp: cw.xrp?.address })
      })
      .catch(() => {})
  }

  function loadTransactions() {
    fetch('/api/transactions?page=1')
      .then((r) => r.json())
      .then((d) => setTransactions(d.transactions || []))
      .catch(() => setTransactions([]))
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [profileRes, txRes, addrRes, marketRes] = await Promise.allSettled([
          fetch('/api/user/profile'),
          fetch('/api/transactions?page=1'),
          fetch('/api/wallet/addresses'),
          fetch('/api/markets/list?per_page=40'),
        ])

        if (cancelled) return

        if (profileRes.status === 'fulfilled') {
          const d = await profileRes.value.json().catch(() => ({}))
          const nextBalances: Record<string, number> = {}
          d.user?.balances?.forEach((b: any) => { nextBalances[b.currency] = b.amount })
          setBalances(nextBalances)
          const active = d.user?.investments?.filter((i: any) => i.status === 'ACTIVE') || []
          setInvestedTotal(active.reduce((sum: number, i: any) => sum + i.amount, 0))
          setRefCode(d.user?.referralCode || 'ALTARIS01')
          setProfile({ name: d.user?.name, avatarUrl: d.user?.avatarUrl || d.user?.avatar })
        if (d.user?.walletAddress) setUserWallet(d.user.walletAddress)
        const cw = d.user?.chainWallets
        if (cw) setChainAddrs({ btc: cw.btc?.address, sol: cw.sol?.address, xrp: cw.xrp?.address })
        }

        if (txRes.status === 'fulfilled') {
          const d = await txRes.value.json().catch(() => ({}))
          setTransactions(d.transactions || [])
        }

        if (addrRes.status === 'fulfilled') {
          const d = await addrRes.value.json().catch(() => ({}))
          const mapped: Record<string, string> = {}
          d.addresses?.forEach((a: any) => { mapped[a.currency] = a.address })
          setWalletAddresses(mapped)
        }

        if (marketRes.status === 'fulfilled') {
          const d = await marketRes.value.json().catch(() => ({}))
          const mapped: Record<string, { price: number; change: number; image?: string; spark?: number[] }> = { USDT: { price: 1, change: 0 } }
          ;(d.list || []).forEach((c: any) => {
            const sym = String(c.symbol || '').toUpperCase()
            if (sym) mapped[sym] = { price: Number(c.price || 0), change: Number(c.change24h || 0), image: c.image || '', spark: Array.isArray(c.spark) ? c.spark : [] }
          })
          setMarketPrices(mapped)
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const handler = () => {
      loadProfile()
      loadTransactions()
    }
    window.addEventListener('balance:refresh', handler)
    return () => window.removeEventListener('balance:refresh', handler)
  }, [])

  useEffect(() => {
    if (tab !== 'deposit' || depositMode !== 'select') return
    const timer = window.setTimeout(() => {
      setTab((current) => (current === 'deposit' ? 'none' : current))
    }, 10000)
    return () => window.clearTimeout(timer)
  }, [tab, depositMode])

  useEffect(() => {
    if (tab !== 'deposit' || depositMode !== 'network') return
    if (receiveLoaded) return
    fetch('/api/markets/list?per_page=250')
      .then(r => r.json())
      .then(d => { setReceiveCoinList(d.list || []); setReceiveLoaded(true) })
      .catch(() => setReceiveLoaded(true))
  }, [tab, depositMode, receiveLoaded])

  useEffect(() => {
    const address = coin === 'BTC' ? chainAddrs.btc : coin === 'SOL' ? chainAddrs.sol : coin === 'XRP' ? chainAddrs.xrp : userWallet
    if (!address || tab !== 'deposit' || depositMode !== 'crypto') {
      setQrDataUrl(null)
      return
    }

    QRCode.toDataURL(address, { width: 300, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
  }, [coin, userWallet, chainAddrs, tab, depositMode])

  const usdBalance = balances.USD || 0
  const cryptoValue = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'USDT'].reduce((sum, sym) => sum + (balances[sym] || 0) * (marketPrices[sym]?.price || (sym === 'USDT' ? 1 : 0)), 0)
  const walletBalance = usdBalance + cryptoValue
  const portfolioBalance = walletBalance + investedTotal
  const cryptoPL = ['BTC', 'ETH', 'USDT'].reduce((sum, sym) => {
    const amountHeld = balances[sym] || 0
    const price = marketPrices[sym]?.price || (sym === 'USDT' ? 1 : 0)
    const change = marketPrices[sym]?.change || 0
    const previous = price && change !== -100 ? price / (1 + change / 100) : price
    return sum + amountHeld * (price - previous)
  }, 0)

  const paybisUrl = process.env.NEXT_PUBLIC_PAYBIS_URL || 'https://paybis.com'

  const trendData = useMemo(() => {
    const tx = transactions
      .slice()
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .filter((a: any) => {
        if (chartRange === 'All') return true
        const hours = chartRange === '24H' ? 24 : chartRange === '7D' ? 168 : 720
        return Date.now() - new Date(a.createdAt).getTime() <= hours * 60 * 60 * 1000
      })
      .slice(-40)

    if (tx.length === 0) {
      const base = walletBalance || 0
      return Array.from({ length: 24 }, () => Number(base.toFixed(2)))
    }

    let running = Math.max(0, walletBalance)
    const result: number[] = []
    for (let i = tx.length - 1; i >= 0; i--) {
      const item = tx[i]
      const amount = Number(item.amount || 0)
      const isCredit = ['DEPOSIT', 'PROFIT', 'ROI', 'BONUS', 'REFERRAL_BONUS'].includes(item.type)
      const isDebit = ['WITHDRAWAL', 'INVESTMENT'].includes(item.type)
      if (isCredit) running = Math.max(0, running - amount)
      if (isDebit) running = running + amount
      result.unshift(Number(running.toFixed(2)))
    }

    const padded = result.slice(-24)
    while (padded.length < 24) padded.unshift(padded[0] ?? walletBalance)
    return padded
  }, [transactions, walletBalance, chartRange])

  const chartPerformance = useMemo(() => {
    const start = trendData[0] || walletBalance
    const end = trendData[trendData.length - 1] || walletBalance
    const pnl = end - start
    const percent = start ? (pnl / start) * 100 : 0
    const previous = trendData[trendData.length - 2] || start
    return { pnl, percent, daily: end - previous }
  }, [trendData, walletBalance])

  const txSummary = useMemo(() => {
    return {
      totalCount: transactions.length,
      pending: transactions.filter((t: any) => t.status === 'PENDING').length,
      latest: transactions.slice(0, 4),
    }
  }, [transactions])

  // Per-coin receive address — uses detectCoinChain so market-API coins work too
  const addrFor = (sym: string) => {
    const chain = detectCoinChain(sym)
    if (chain === 'BTC') return chainAddrs.btc || ''
    if (chain === 'SOL') return chainAddrs.sol || ''
    if (chain === 'XRP') return chainAddrs.xrp || ''
    return userWallet
  }
  const selectedCoin = selectedCoinData
    ? { ...selectedCoinData, network: coinNetworkLabel(selectedCoinData.sym, selectedCoinData.id || '') }
    : (ALL_CRYPTOS.find((c) => c.sym === coin) ?? ALL_CRYPTOS[0])
  const activeAddress = addrFor(coin)

  // Build receive list: live market data when loaded, static fallback while loading
  const filteredReceiveCoins = useMemo(() => {
    const source = receiveLoaded && receiveCoinList.length > 0
      ? receiveCoinList.map((c: any) => {
          const sym = String(c.symbol || '').toUpperCase()
          const chain = detectCoinChain(sym, c.id || '')
          return { sym, id: c.id || '', name: c.name || sym, image: c.image || '', chain, network: coinNetworkLabel(sym, c.id || ''), glyph: sym.slice(0, 1), color: '#888' }
        })
      : ALL_CRYPTOS.map(c => ({ ...c, id: '', image: '' }))
    const q = receiveSearch.toLowerCase()
    return source.filter((c: any) => {
      const matchSearch = !q || c.sym.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.network.toLowerCase().includes(q)
      const matchFilter = receiveFilter === 'All' ? true : receiveFilter === 'Bitcoin' ? c.chain === 'BTC' : receiveFilter === 'Ethereum' ? c.chain === 'EVM' : receiveFilter === 'Solana' ? c.chain === 'SOL' : receiveFilter === 'XRP' ? c.chain === 'XRP' : true
      return matchSearch && matchFilter
    })
  }, [receiveLoaded, receiveCoinList, receiveSearch, receiveFilter])

  async function submitDeposit() {
    if (!amount || !txHash.trim()) {
      setMsg({ type: 'error', text: 'Please enter amount and transaction hash' })
      return
    }

    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: coin, amount: Number(amount), txHash: txHash.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ type: 'error', text: data.error || 'Failed to submit deposit' })
        return
      }
      setMsg({ type: 'success', text: 'Deposit submitted. Awaiting admin confirmation.' })
      setAmount('')
      setTxHash('')
      loadTransactions()
    } catch {
      setMsg({ type: 'error', text: 'Failed to submit deposit' })
    } finally {
      setLoading(false)
    }
  }

  async function submitWithdraw() {
    if (!amount || !withdrawAddress.trim()) {
      setMsg({ type: 'error', text: 'Please enter amount and destination wallet address' })
      return
    }

    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: 'USD', amount: Number(amount), address: withdrawAddress.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ type: 'error', text: data.error || 'Failed to request withdrawal' })
        return
      }
      setMsg({ type: 'success', text: 'Withdrawal request submitted successfully' })
      setAmount('')
      setWithdrawAddress('')
      loadProfile()
      loadTransactions()
    } catch {
      setMsg({ type: 'error', text: 'Failed to request withdrawal' })
    } finally {
      setLoading(false)
    }
  }

  function copyAddress() {
    if (!activeAddress) return
    copyWalletAddress(activeAddress, coin)
  }

  function copyWalletAddress(address: string, symbol: string) {
    if (!address) {
      setMsg({ type: 'error', text: `${symbol} address unavailable` })
      return
    }
    navigator.clipboard.writeText(address)
    setCopied(true)
    setMsg({ type: 'success', text: `${symbol} address copied` })
    setTimeout(() => setCopied(false), 1800)
  }

  async function shareAddress() {
    if (!activeAddress) return
    const amountQuery = amount ? `?amount=${encodeURIComponent(amount)}` : ''
    const payload = `${coin} deposit address:\n${activeAddress}${amountQuery}`
    if (navigator.share) {
      try {
        await navigator.share({ title: `${coin} Deposit Address`, text: payload })
        return
      } catch {}
    }
    copyAddress()
  }

  function setSuggestedAmount() {
    const next = prompt(`Set ${coin} amount`, amount || String(selectedCoin.minDeposit))
    if (next === null) return
    setAmount(next)
  }

  async function shareReferral() {
    const referralUrl = `${window.location.origin}/signup?ref=${refCode}`
    const text = `I'm using Altaris Capital — an investment platform that grows your wealth. Join with my referral link and get a $40 bonus when you start investing!\n${referralUrl}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join Altaris Capital', text, url: referralUrl })
        return
      } catch {}
    }
    navigator.clipboard.writeText(referralUrl)
    setMsg({ type: 'success', text: 'Referral link copied to clipboard.' })
  }

  function closeDashboard() {
    setTab('none')
    setDepositMode('select')
    setMsg(null)
  }

  const walletCurrencies = marketCoins.map((sym) => ({
    sym,
    name: sym === 'BTC' ? 'Bitcoin' : sym === 'ETH' ? 'Ethereum' : sym === 'BNB' ? 'BNB' : sym === 'SOL' ? 'Solana' : 'XRP',
    image: marketPrices[sym]?.image,
    price: marketPrices[sym]?.price || 0,
    value: `$${((balances[sym] || 0) * (marketPrices[sym]?.price || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    amount: balances[sym] || 0,
    color: sym === 'BTC' ? '#F7931A' : sym === 'ETH' ? '#627EEA' : sym === 'BNB' ? '#F3BA2F' : sym === 'SOL' ? '#14F195' : '#E74C3C',
    note: userWallet ? `${userWallet.slice(0, 8)}...${userWallet.slice(-6)}` : 'Wallet pending',
  }))

  const trendingTokens = [
    { sym: 'ETH', name: 'Ethereum', price: marketPrices.ETH?.price || 0, change: marketPrices.ETH?.change || 0, color: '#627EEA' },
    { sym: 'USDC', name: 'USDC', price: 1, change: 0, color: '#2775CA' },
    { sym: 'SOL', name: 'Solana', price: marketPrices.SOL?.price || 0, change: marketPrices.SOL?.change || 0, color: '#14F195' },
  ]

  // Activity list — build from ALL_CRYPTOS so manage works for all coins
  const ASSET_META: Record<string, { name: string; color: string }> = Object.fromEntries(
    ALL_CRYPTOS.map(c => [c.sym, { name: c.name, color: c.color }])
  )
  const activityAssets = managedCoins
    .map((sym) => {
      const price = marketPrices[sym]?.price || (sym === 'USDT' || sym === 'USDC' ? 1 : 0)
      const amount = balances[sym] || 0
      return {
        sym,
        name: ASSET_META[sym]?.name || sym,
        color: ASSET_META[sym]?.color || '#888',
        image: marketPrices[sym]?.image,
        price,
        change: marketPrices[sym]?.change || 0,
        amount,
        usd: amount * price,
      }
    })
    .sort((a, b) => b.usd - a.usd || b.price - a.price)

  // Mockup actions — Send=withdraw, Receive=deposit, Swap=markets, Buy=fiat
  const openWithdraw = () => { setTab('withdraw'); setDepositMode('select'); setMsg(null) }
  const openDeposit = () => { setTab('deposit'); setDepositMode('network'); setMsg(null) }
  const openBuy = () => { setTab('deposit'); setDepositMode('fiat'); setMsg(null) }
  const heroActions = [
    { label: 'Send', onClick: openWithdraw, path: <path d="M12 19V5M5 12l7-7 7 7" /> },
    { label: 'Receive', onClick: openDeposit, path: <path d="M12 5v14M5 12l7 7 7-7" /> },
    { label: 'Swap', onClick: () => { window.location.href = '/markets' }, path: <><path d="M7 10l-3 3 3 3" /><path d="M4 13h12" /><path d="M17 8l3-3-3-3" /><path d="M20 5H8" /></> },
    { label: 'Buy', onClick: openBuy, path: <><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><path d="M3 6h18M16 10a4 4 0 01-8 0" /></> },
  ]
  const initial = (profile.name || 'A').trim().charAt(0).toUpperCase()

  const shortcutTabs = [
    { label: 'Deposit', tone: 'var(--success)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>, onClick: () => { setTab('deposit'); setDepositMode('select'); setMsg(null) } },
    { label: 'Withdraw', tone: 'var(--danger)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>, onClick: () => { setTab('withdraw'); setDepositMode('select'); setMsg(null) } },
    { label: 'Invested', tone: 'var(--brand-primary)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>, onClick: () => { window.location.href = '/invest?tab=my' } },
    { label: 'Reward', tone: 'var(--brand-primary)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15 8 22 9 17 14 18 21 12 18 6 21 7 14 2 9 9 8 12 2"/></svg>, onClick: () => { setTab('reward'); setMsg(null) } },
  ]

  const ActionButton = ({
    active,
    onClick,
    label,
    icon,
    color,
  }: {
    active: boolean
    onClick?: () => void
    label: string
    icon: React.ReactNode
    color: string
  }) => (
    <button
      onClick={onClick}
      type="button"
      style={{
        minHeight: 96,
        padding: 12,
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.08)',
        background: active ? `${color}20` : 'var(--bg-card)',
        color: active ? color : 'var(--text-secondary)',
        fontWeight: 700,
        fontSize: 13,
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
      className="pressable ui-upgrade-card"
    >
      {icon}
      <span style={{ textAlign: 'center' }}>{label}</span>
    </button>
  )

  return (
    <div style={{ padding: '10px 16px 22px', background: '#000', minHeight: '100vh' }}>
      {!ready && (
        <div style={{ display: 'grid', gap: 14 }}>
          <ShadowCard h={118} />
          <ShadowCard h={92} />
          <ShadowCard h={92} />
          <ShadowCard h={92} />
          <ShadowCard h={210} />
        </div>
      )}
      {ready && copied && (
        <div style={{ position: 'fixed', top: 'calc(var(--app-header-height, 64px) + 12px)', left: 16, right: 16, zIndex: 80, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(14,203,129,0.15)', color: '#0ECB81', border: '1px solid rgba(14,203,129,0.25)', padding: '9px 14px', borderRadius: 999, fontSize: 12, fontWeight: 800, boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}>
            Copied
          </div>
        </div>
      )}
      {ready && (
      <>
      {/* ── Hero: obsidian black, top fades from the status bar; a soft gold
             glow only low behind the balance so it never reads as a gold slab ── */}
      <div style={{ margin: '-10px -16px 0', padding: '18px 20px 28px', borderRadius: '0 0 28px 28px', position: 'relative', overflow: 'hidden', background: 'radial-gradient(85% 58% at 50% 64%, rgba(201,162,39,0.20), transparent 62%), linear-gradient(180deg, #06070A 0%, #08090D 100%)', color: '#ECE7DB' }}>
        {/* top row: avatar + name · bell */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <Link href="/settings" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', color: 'inherit', minWidth: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'rgba(201,162,39,0.14)', border: '1.5px solid rgba(201,162,39,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: '#E4C25C' }}>
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
            </div>
            <span className="notranslate" style={{ fontWeight: 700, fontSize: 15, letterSpacing: '0.01em', color: '#ECE7DB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.name || 'Your account'}</span>
          </Link>
          <Link href="/notifications" aria-label="Notifications" style={{ marginLeft: 'auto', flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: 'rgba(236,231,219,0.06)', border: '1px solid rgba(201,162,39,0.22)', color: '#E4C25C', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', textDecoration: 'none' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></svg>
            <span style={{ position: 'absolute', top: 9, right: 11, width: 7, height: 7, borderRadius: '50%', background: '#E0566B', border: '1.5px solid #0A0B0E' }} />
          </Link>
        </div>

        {/* currency pill */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
          <button type="button" onClick={() => setBalanceHidden((h) => !h)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(236,231,219,0.06)', color: '#ECE7DB', border: '1px solid rgba(201,162,39,0.22)', borderRadius: 999, padding: '8px 15px', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <span style={{ width: 17, height: 17, borderRadius: '50%', background: '#C9A227', color: '#0A0A08', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>$</span>
            USD <span style={{ opacity: 0.6, fontSize: 11 }}>▾</span>
          </button>
        </div>

        {/* balance */}
        <button type="button" onClick={() => setBalanceHidden((h) => !h)} style={{ display: 'block', width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', marginTop: 12, fontFamily: 'inherit' }}>
          <div className="notranslate font-display" translate="no" style={{ fontSize: 'clamp(40px, 12vw, 52px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1, color: '#ECE7DB', fontVariantNumeric: 'tabular-nums' }}>
            {balanceHidden ? '••••••' : `$${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div className="notranslate" translate="no" style={{ marginTop: 9, fontSize: 14, fontWeight: 700, color: cryptoPL >= 0 ? 'var(--success)' : 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>
            {balanceHidden ? '••••' : `${cryptoPL >= 0 ? '+' : '−'}$${Math.abs(cryptoPL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} today`}
          </div>
        </button>

        {/* four circular actions */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 22, marginTop: 24 }}>
          {heroActions.map((a) => (
            <button key={a.label} type="button" onClick={a.onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }} className="pressable">
              <span style={{ width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(180deg,#16191F,#0E1014)', border: '1px solid rgba(201,162,39,0.28)', color: '#E4C25C', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.4)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{a.path}</svg>
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Activity ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '22px 2px 6px' }}>
        <h2 className="font-display" style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>Activity</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="button" onClick={() => setShowManage(true)} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 99, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>Manage</button>
          <Link href="/markets" style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold-bright)', textDecoration: 'none' }}>All markets</Link>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        {activityAssets.map((asset) => (
          <Link key={asset.sym} href={`/markets/${asset.sym.toLowerCase()}`} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '15px 4px', borderBottom: '1px solid var(--hairline)', textDecoration: 'none' }}>
            <span style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, background: asset.image ? '#14171D' : asset.color, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', color: '#fff', fontWeight: 800, fontSize: 14 }}>
              {asset.image ? <img src={asset.image} alt="" style={{ width: 42, height: 42, objectFit: 'cover' }} /> : asset.sym.slice(0, 1)}
            </span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: 'block', fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{asset.name}</span>
              <span className="notranslate" translate="no" style={{ display: 'block', marginTop: 3, fontSize: 12, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                ${asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: asset.price < 10 ? 4 : 2 })}{' '}
                <span style={{ color: asset.change >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%</span>
              </span>
            </span>
            <span className="notranslate" translate="no" style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{ display: 'block', fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {asset.amount.toLocaleString('en-US', { maximumFractionDigits: asset.sym === 'USDT' ? 2 : 6 })} {asset.sym}
              </span>
              <span style={{ display: 'block', marginTop: 3, fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                ${asset.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </span>
          </Link>
        ))}
      </div>
      </>
      )}
      {tab === 'deposit' && (
        <div style={{ marginBottom: 14 }}>
          {depositMode === 'network' && (
            <div className="network-sheet">
              <div className="network-sheet-head">
                <h2>Receive crypto</h2>
                <button onClick={() => { setDepositMode('select'); setReceiveSearch(''); setReceiveFilter('All') }} type="button" aria-label="Close">×</button>
              </div>
              {/* Search */}
              <div style={{ margin: '0 0 12px', position: 'relative' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  value={receiveSearch}
                  onChange={e => setReceiveSearch(e.target.value)}
                  placeholder="Search coin or network…"
                  style={{ width: '100%', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px 10px 36px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              {/* Network filter chips */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 4 }}>
                {(['All','Bitcoin','Ethereum','Solana','XRP'] as const).map(f => (
                  <button key={f} type="button" onClick={() => setReceiveFilter(f)}
                    style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, border: `1px solid ${receiveFilter===f?'rgba(201,162,39,0.5)':'var(--border)'}`, background: receiveFilter===f?'rgba(201,162,39,0.12)':'transparent', color: receiveFilter===f?'#C9A227':'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                    {f}
                  </button>
                ))}
              </div>
              <div className="network-list">
                {!receiveLoaded && receiveCoinList.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)', fontSize: 13 }}>Loading coins…</div>
                )}
                {receiveLoaded && filteredReceiveCoins.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)', fontSize: 13 }}>No coins match your search</div>
                )}
                {filteredReceiveCoins.map((c: any) => {
                  const addr = addrFor(c.sym)
                  return (
                    <button
                      key={`${c.id || c.sym}-${c.sym}`}
                      type="button"
                      onClick={() => { setCoin(c.sym); setSelectedCoinData(c); setDepositMode('crypto') }}
                      className="network-row pressable"
                    >
                      <span className="network-logo" style={{ background: c.image ? '#14171D' : (c.color || '#444'), overflow: 'hidden', padding: c.image ? 0 : undefined }}>
                        {c.image
                          ? <img src={c.image} alt={c.sym} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          : <CoinIcon symbol={c.sym} size={24} />}
                      </span>
                      <span className="network-copy">
                        <strong>{c.name} <span style={{ fontWeight: 600, fontSize: 11, color: 'var(--text-muted)' }}>· {c.sym} · {c.network}</span></strong>
                        <em>{addr ? `${addr.slice(0, 10)}...${addr.slice(-7)}` : `${c.sym.toLowerCase()} wallet pending`}</em>
                      </span>
                      <span
                        className="network-icons network-copy-action"
                        role="button"
                        tabIndex={0}
                        aria-label={`Copy ${c.sym} wallet address`}
                        title={`Copy ${c.sym} address`}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          copyWalletAddress(addr, c.sym)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            e.stopPropagation()
                            copyWalletAddress(addr, c.sym)
                          }
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm11 1h2v2h-2v-2Zm3 0h2v5h-5v-2h3v-3Z" stroke="currentColor" strokeWidth="1.7"/></svg>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="8" y="8" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8"/></svg>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {depositMode === 'fiat' && (
            <div className="network-sheet fiat-sheet" style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="network-sheet-head">
                <h2>Select payment method</h2>
                <button onClick={() => setDepositMode('select')} type="button" aria-label="Close">×</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, background: '#111', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 12 }}>
                <span style={{ width: 42, height: 42, borderRadius: 14, background: 'linear-gradient(135deg,#C9A227,#FFDD7A)', color: '#000', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>P</span>
                <span>
                  <strong style={{ display: 'block', fontSize: 14 }}>Paybis</strong>
                  <span style={{ color: 'rgba(255,255,255,0.58)', fontSize: 12 }}>Simple fiat on-ramp with card checkout</span>
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }} aria-label="Supported fiat payment methods">
                <span style={{ height: 42, borderRadius: 12, background: '#fff', color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900 }}>VISA</span>
                <span style={{ height: 42, borderRadius: 12, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: 16, height: 16, borderRadius: 99, background: '#EB001B', marginRight: -5 }} /><span style={{ width: 16, height: 16, borderRadius: 99, background: '#F79E1B', opacity: 0.95 }} /></span>
                <span style={{ height: 42, borderRadius: 12, background: '#111', border: '1px solid rgba(255,255,255,0.06)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900 }}> Pay</span>
                <span style={{ height: 42, borderRadius: 12, background: '#111', border: '1px solid rgba(255,255,255,0.06)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900 }}><span style={{ color: '#4285F4', marginRight: 4 }}>G</span>Pay</span>
              </div>
              <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
                {[
                  '1. Choose Paybis',
                  '2. Pick card or Apple / Google Pay',
                  '3. Crypto lands in your wallet',
                ].map((step) => (
                  <div key={step} style={{ padding: '10px 12px', borderRadius: 12, background: '#111', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.78)', fontSize: 12 }}>{step}</div>
                ))}
              </div>
              <a href={paybisUrl} target="_blank" rel="noopener noreferrer" className="paybis-button pressable" style={{ background: '#C9A227', color: '#000', fontWeight: 900, borderRadius: 14 }}>
                Continue to Paybis
              </a>
            </div>
          )}
        </div>
      )}

      {msg && (
        <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 10, background: msg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)', fontSize: 12, fontWeight: 700 }}>
          {msg.text}
        </div>
      )}

      {tab === 'withdraw' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 'calc(73px + env(safe-area-inset-bottom))', zIndex: 45, background: '#07090c', overflowY: 'auto', padding: 'calc(var(--app-header-height, 64px) + 14px) 16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button onClick={closeDashboard} type="button" style={{ border: 'none', background: 'var(--bg-card)', color: 'var(--text-primary)', width: 36, height: 36, borderRadius: 10, cursor: 'pointer' }}>←</button>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Withdraw</div>
            <div style={{ width: 36 }} />
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 10 }}>Withdraw from account balance (USD)</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 24, marginBottom: 12 }}>${usdBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Destination wallet address</label>
                <input className="input" value={withdrawAddress} onChange={(e) => setWithdrawAddress(e.target.value)} placeholder="Enter wallet address" />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Amount (USD)</label>
                <div style={{ position: 'relative' }}>
                  <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ paddingRight: 64 }} />
                  <button onClick={() => setAmount(String(usdBalance))} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', borderRadius: 6, background: 'rgba(242,186,14,0.16)', color: 'var(--brand-primary)', fontWeight: 700, fontSize: 11, padding: '4px 8px', cursor: 'pointer' }}>MAX</button>
                </div>
              </div>
              <button onClick={submitWithdraw} disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: 6 }}>
                {loading ? 'Processing...' : 'Request Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'reward' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 'calc(73px + env(safe-area-inset-bottom))', zIndex: 45, background: '#07090c', overflowY: 'auto', padding: 'calc(var(--app-header-height, 64px) + 14px) 16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <button onClick={closeDashboard} type="button" style={{ border: 'none', background: 'var(--bg-card)', color: 'var(--text-primary)', width: 36, height: 36, borderRadius: 10, cursor: 'pointer' }}>←</button>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Rewards & Referrals</div>
            <div style={{ width: 36 }} />
          </div>

          {/* Hero card */}
          <div style={{ marginBottom: 16, background: 'linear-gradient(135deg,#1A1500,#0D0D0D)', border: '1px solid rgba(242,186,14,0.25)', borderRadius: 20, padding: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(242,186,14,0.15),transparent 70%)' }} />
            <div style={{ fontSize: 11, color: '#C9A227', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>REFERRAL PROGRAM</div>
            <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 8, lineHeight: 1.2 }}>Earn $200 per<br/>qualified referral</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>Invite friends to Altaris Capital. When they verify and deposit, you both earn cash bonuses. Share your unique link and track earnings in real time.</div>
            <Link href="/rewards" style={{ display: 'block', background: '#C9A227', color: '#000', fontWeight: 800, fontSize: 14, padding: '14px', borderRadius: 12, textAlign: 'center', textDecoration: 'none' }}>
              Open Rewards Dashboard →
            </Link>
          </div>

          {/* How it works */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>How It Works</div>
            {[
              { n: '1', t: 'Share your link', d: 'Send your unique referral link to anyone', c: '#A78BFA' },
              { n: '2', t: 'They sign up', d: 'Friend creates an account via your link', c: '#C9A227' },
              { n: '3', t: 'They verify + deposit', d: 'Complete KYC and make first deposit', c: '#0ECB81' },
              { n: '4', t: 'Both earn bonuses', d: 'You get $200 · They get $40 — instantly', c: '#C9A227' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${s.c}15`, border: `1.5px solid ${s.c}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: s.c, flexShrink: 0 }}>{s.n}</div>
                <div><div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{s.t}</div><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.d}</div></div>
              </div>
            ))}
          </div>

          {/* Tier overview */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>Tier Bonuses</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ icon: '🌱', label: 'Starter', n: '1 ref', bonus: '+$40' }, { icon: '⭐', label: 'Rising', n: '5 refs', bonus: '+$700' }, { icon: '👑', label: 'Elite', n: '20 refs', bonus: '+$3K' }, { icon: '💎', label: 'VIP', n: '50 refs', bonus: 'VIP' }].map(t => (
                <div key={t.label} style={{ flex: 1, textAlign: 'center', padding: '10px 4px', background: '#1A1A1A', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{t.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#888' }}>{t.label}</div>
                  <div style={{ fontSize: 9, color: '#555', marginTop: 2 }}>{t.n}</div>
                  <div style={{ fontSize: 10, color: '#C9A227', fontWeight: 800, marginTop: 3 }}>{t.bonus}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Full-screen crypto receive dashboard */}
      {tab === 'deposit' && depositMode === 'crypto' && (
        <div className="receive-shell">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <button onClick={() => setDepositMode('select')} type="button" className="trade-icon-button" aria-label="Back">←</button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900 }}>Receive</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}>{selectedCoin.name}</div>
            </div>
            <div style={{ width: 44 }} />
          </div>

          <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, background: 'rgba(201,162,39,0.12)', border: '1px solid rgba(201,162,39,0.28)', color: 'var(--gold-bright)', fontSize: 12, fontWeight: 600, lineHeight: 1.6 }}>
            Send only {coin} on the {selectedCoin.network} network to this address. Your deposit is credited to your {coin} balance after confirmation.
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto' }} className="no-scrollbar">
            {ALL_CRYPTOS.filter(c => c.popular).map((c) => (
              <button
                key={c.sym}
                onClick={() => setCoin(c.sym)}
                style={{
                  whiteSpace: 'nowrap',
                  border: '1px solid',
                  borderColor: c.sym === coin ? c.color : 'var(--border)',
                  background: c.sym === coin ? `${c.color}22` : 'var(--bg-card)',
                  color: c.sym === coin ? c.color : 'var(--text-muted)',
                  borderRadius: 999,
                  padding: '7px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {c.sym} · {c.name}
              </button>
            ))}
          </div>

          <div className="receive-qr-card">
            <div style={{ margin: '0 auto', width: '100%', maxWidth: 270, aspectRatio: '1/1', borderRadius: 18, overflow: 'hidden', position: 'relative', background: '#fff' }}>
              {qrDataUrl ? <img src={qrDataUrl} alt={`${coin} QR`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#111', fontWeight: 700 }}>Generating QR...</div>}
              <div style={{ position: 'absolute', inset: '50% auto auto 50%', transform: 'translate(-50%, -50%)', width: 42, height: 42, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
                <AltarisLogoMark size={24} />
              </div>
            </div>
            <div className="receive-address-pill">
              {activeAddress ? `${activeAddress.slice(0, 8)}…${activeAddress.slice(-8)}` : 'Address unavailable'}
            </div>
          </div>

          <div className="receive-action-grid">
            <button onClick={copyAddress} type="button" className="btn-ghost">{copied ? 'Copied' : 'Copy address'}</button>
            <button onClick={shareAddress} type="button" className="btn-ghost">Share</button>
          </div>

          <div className="card" style={{ padding: 16, maxWidth: 430, margin: '0 auto', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: 'var(--gold-soft)', color: 'var(--gold-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 11-6.2-8.5" /><path d="M22 4l-10 10-3-3" /></svg>
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Deposits are automatic</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12.5, lineHeight: 1.6, marginTop: 3 }}>
                Send {coin} to the address above. Once the network confirms it, your {coin} balance updates automatically — no need to enter anything.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Crypto Sheet ── */}
      {showManage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }} onClick={() => setShowManage(false)}>
          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', border: '1px solid var(--border)', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>Manage Crypto</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>Toggle which assets appear in your wallet</div>
              </div>
              <button type="button" onClick={() => setShowManage(false)} style={{ background: 'var(--bg-elevated)', border: 'none', color: 'var(--text-muted)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'inherit', fontSize: 18 }}>×</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '14px 20px 32px', flex: 1 }}>
              {ALL_CRYPTOS.map(c => (
                <div key={c.sym} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--hairline)' }}>
                  <span style={{ width: 38, height: 38, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{c.glyph}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{c.sym} · {c.network}</div>
                  </div>
                  <button type="button" onClick={() => toggleManagedCoin(c.sym)}
                    style={{ width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', background: managedCoins.includes(c.sym) ? '#C9A227' : 'var(--bg-elevated)', transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
                    <span style={{ position: 'absolute', top: 3, left: managedCoins.includes(c.sym) ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
