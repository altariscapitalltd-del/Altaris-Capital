'use client'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { ArrowDownLeft, ArrowUpRight, Gift, LineChart, RefreshCw, Users, WalletCards } from 'lucide-react'

type Tx = {
  id: string
  type: string
  amount: number
  currency: string
  status: string
  note?: string
  createdAt: string
}

const TYPE_CONFIG: Record<string, { Icon: any; color: string; label: string; isCredit: boolean }> = {
  DEPOSIT: { Icon: ArrowDownLeft, color: '#0ECB81', label: 'Deposit', isCredit: true },
  WITHDRAWAL: { Icon: ArrowUpRight, color: '#F6465D', label: 'Withdrawal', isCredit: false },
  INVESTMENT: { Icon: LineChart, color: '#F2BA0E', label: 'Investment', isCredit: false },
  PROFIT: { Icon: WalletCards, color: '#0ECB81', label: 'Profit Credit', isCredit: true },
  ROI: { Icon: WalletCards, color: '#0ECB81', label: 'ROI Credit', isCredit: true },
  BONUS: { Icon: Gift, color: '#F2BA0E', label: 'Bonus', isCredit: true },
  REFERRAL_BONUS: { Icon: Users, color: '#A78BFA', label: 'Referral Bonus', isCredit: true },
  REFERRAL: { Icon: Users, color: '#A78BFA', label: 'Referral Bonus', isCredit: true },
  ADJUSTMENT: { Icon: RefreshCw, color: '#94A3B8', label: 'Balance Update', isCredit: true },
}

const STATUS_COLOR: Record<string, string> = {
  SUCCESS: '#0ECB81',
  COMPLETED: '#0ECB81',
  PENDING: '#F2BA0E',
  FAILED: '#F6465D',
  CANCELLED: '#F6465D',
}

const CACHE_KEY = 'altaris_transactions_cache_v1'
const REQUEST_TIMEOUT_MS = 2500

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  let timeoutId: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timeout after ${timeoutMs}ms`)), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId!)) as Promise<T>
}

function readCache(): { txs: Tx[]; nextCursor: string | null; hasMore: boolean } | null {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(window.localStorage.getItem(CACHE_KEY) || 'null') } catch { return null }
}

function writeCache(payload: { txs: Tx[]; nextCursor: string | null; hasMore: boolean }) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...payload, cachedAt: Date.now() })) } catch {}
}

function mergeUnique(existing: Tx[], incoming: Tx[]) {
  const map = new Map(existing.map((tx) => [tx.id, tx]))
  for (const tx of incoming) map.set(tx.id, tx)
  return Array.from(map.values()).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
}

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Tx[]>([])
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const loadSeq = useRef(0)

  const fetchPage = useCallback(async (cursor?: string | null, mode: 'initial' | 'more' = 'initial') => {
    const startedAt = performance.now()
    const url = new URL('/api/transactions', window.location.origin)
    if (cursor) url.searchParams.set('cursor', cursor)

    const res = await withTimeout(fetch(url.toString()).then((r) => r.json()), REQUEST_TIMEOUT_MS, '/api/transactions')
    console.log('[Altaris Transactions] page fetch', { mode, cursor: cursor || null, ms: Math.round(performance.now() - startedAt) })
    return res
  }, [])

  useEffect(() => {
    const seq = ++loadSeq.current
    const cached = readCache()
    if (cached?.txs?.length) {
      setTxs(cached.txs)
      setNextCursor(cached.nextCursor)
      setHasMore(cached.hasMore)
      setLoading(false)
    }

    ;(async () => {
      try {
        const data = await fetchPage(null, 'initial')
        if (seq !== loadSeq.current) return
        const initial = Array.isArray(data.transactions) ? data.transactions : []
        setTxs(initial)
        setNextCursor(data.nextCursor || null)
        setHasMore(Boolean(data.hasMore))
        setLoading(false)
        writeCache({ txs: initial, nextCursor: data.nextCursor || null, hasMore: Boolean(data.hasMore) })
      } catch (error) {
        console.log('[Altaris Transactions] initial load fallback', { error: String(error) })
        if (!cached?.txs?.length) setLoading(false)
      }
    })()
  }, [fetchPage])

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const data = await fetchPage(nextCursor, 'more')
      const incoming = Array.isArray(data.transactions) ? data.transactions : []
      setTxs((prev) => {
        const merged = mergeUnique(prev, incoming)
        writeCache({ txs: merged, nextCursor: data.nextCursor || null, hasMore: Boolean(data.hasMore) })
        return merged
      })
      setNextCursor(data.nextCursor || null)
      setHasMore(Boolean(data.hasMore))
    } catch (error) {
      console.log('[Altaris Transactions] load more fallback', { error: String(error) })
    } finally {
      setLoadingMore(false)
    }
  }, [fetchPage, loadingMore, nextCursor])

  const FILTERS = ['ALL', 'DEPOSIT', 'WITHDRAWAL', 'INVESTMENT', 'PROFIT', 'BONUS', 'REFERRAL_BONUS']
  const filtered = useMemo(() => txs.filter((t) => filter === 'ALL' || t.type === filter), [filter, txs])

  const totalIn = useMemo(() => txs.filter((t) => TYPE_CONFIG[t.type]?.isCredit).reduce((s, t) => s + t.amount, 0), [txs])
  const totalOut = useMemo(() => txs.filter((t) => !TYPE_CONFIG[t.type]?.isCredit).reduce((s, t) => s + t.amount, 0), [txs])

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div style={{ width: 32, height: 32, border: '3px solid rgba(242,186,14,0.2)', borderTopColor: '#F2BA0E', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /></div>

  return (
    <div style={{ padding: '0 0 24px' }}>
      <div style={{ padding: '12px 16px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Transaction History</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div style={{ background: 'rgba(14,203,129,0.06)', border: '1px solid rgba(14,203,129,0.14)', borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#0ECB81', letterSpacing: '0.06em', marginBottom: 4 }}>TOTAL IN</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#0ECB81' }}>+${totalIn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div style={{ background: 'rgba(246,70,93,0.06)', border: '1px solid rgba(246,70,93,0.14)', borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#F6465D', letterSpacing: '0.06em', marginBottom: 4 }}>TOTAL OUT</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#F6465D' }}>-${totalOut.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', marginBottom: 16 }} className="no-scrollbar">
          {FILTERS.map((f) => <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? 'active' : ''}`} style={{ fontSize: 12 }}>{f === 'ALL' ? 'All' : TYPE_CONFIG[f]?.label || f}</button>)}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 54, height: 54, margin: '0 auto 14px', borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><WalletCards size={24} color="var(--text-muted)" /></div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No transactions yet</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Your transaction history will appear here</div>
        </div>
      ) : (
        <div style={{ padding: '0 16px' }}>
          {filtered.map((tx, i) => {
            const cfg = TYPE_CONFIG[tx.type] || { Icon: WalletCards, color: 'var(--text-muted)', label: tx.type, isCredit: false }
            const Icon = cfg.Icon
            const date = new Date(tx.createdAt)
            const prevDate = i > 0 ? new Date(filtered[i - 1].createdAt) : null
            const isNewDay = !prevDate || prevDate.toDateString() !== date.toDateString()
            const statusColor = STATUS_COLOR[tx.status] || 'var(--text-muted)'

            return (
              <div key={tx.id}>
                {isNewDay && <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, padding: '12px 0 6px', letterSpacing: '0.04em' }}>{date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 13, background: `${cfg.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, border: `1px solid ${cfg.color}25` }}><Icon size={19} strokeWidth={2.2} color={cfg.color} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{cfg.label}</div>
                    {tx.note && <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.note}</div>}
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span style={{ color: statusColor, fontWeight: 700 }}>• {tx.status}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: cfg.isCredit ? '#0ECB81' : '#F6465D' }}>{cfg.isCredit ? '+' : '-'}{tx.currency} {Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>{tx.currency === 'USD' ? '' : `≈ $${Math.abs(tx.amount).toFixed(2)}`}</div>
                  </div>
                </div>
              </div>
            )
          })}

          {hasMore && (
            <button onClick={loadMore} disabled={loadingMore} style={{ width: '100%', marginTop: 16, padding: 13, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', opacity: loadingMore ? 0.7 : 1 }}>
              {loadingMore ? 'Loading…' : nextCursor ? 'Load more' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
