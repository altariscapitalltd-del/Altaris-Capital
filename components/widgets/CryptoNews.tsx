'use client'

import { useEffect, useState, memo } from 'react'

interface NewsItem {
  title: string
  url: string
  source: string
  publishedAt: string
  category: string
}

const CRYPTO_NEWS_FALLBACK: NewsItem[] = [
  { title: 'Bitcoin ETFs See Record Inflows as Institutional Adoption Accelerates', url: '#', source: 'CoinDesk', publishedAt: '2h ago', category: 'Bitcoin' },
  { title: 'Ethereum Layer 2 Networks Reach All-Time High in Total Value Locked', url: '#', source: 'The Block', publishedAt: '4h ago', category: 'Ethereum' },
  { title: 'SEC Approves Spot Ethereum ETFs in Landmark Decision for Crypto Industry', url: '#', source: 'Reuters', publishedAt: '6h ago', category: 'Regulation' },
  { title: 'Solana DeFi Ecosystem Surpasses $5 Billion in Total Value Locked', url: '#', source: 'Decrypt', publishedAt: '8h ago', category: 'DeFi' },
  { title: 'Major Central Banks Explore CBDC Interoperability with Blockchain Networks', url: '#', source: 'Bloomberg', publishedAt: '12h ago', category: 'CBDC' },
]

const CryptoNews = memo(function CryptoNews() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const res = await fetch('https://cryptopanic.com/api/v1/posts/?auth_token=demo&public=true&limit=5')
        const json = await res.json()
        if (!cancelled && json.results) {
          setNews(json.results.slice(0, 5).map((item: any) => ({
            title: item.title,
            url: item.url,
            source: item.source?.domain || 'CryptoPanic',
            publishedAt: item.published_at ? new Date(item.published_at).toLocaleDateString() : '',
            category: item.currencies?.[0]?.title || 'Crypto',
          })))
        } else {
          setNews(CRYPTO_NEWS_FALLBACK)
        }
      } catch {
        if (!cancelled) setNews(CRYPTO_NEWS_FALLBACK)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 16, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="shimmer" style={{ height: 160, borderRadius: 12 }} />
      </div>
    )
  }

  return (
    <div style={{ padding: 16, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Latest News</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Live</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {news.map((item, idx) => (
          <a
            key={idx}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'block', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', textDecoration: 'none', transition: 'background .15s' }}
            className="pressable"
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-primary)', marginTop: 6, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--brand-primary)', fontWeight: 600 }}>{item.source}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.publishedAt}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 99 }}>{item.category}</span>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
})

export default CryptoNews
