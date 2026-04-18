'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function InvestContent() {
  const [assets, setAssets] = useState<any[]>([])
  const [hot, setHot] = useState<any[]>([])
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  const categories = ['All', 'Crypto', 'DeFi', 'Stocks', 'Real Estate', 'Bonds', 'Fixed Income', 'Commodities', 'Forex', 'ETF', 'Hedge']

  useEffect(() => {
    setLoading(true)
    fetch(`/api/markets/live?category=${category}`)
      .then(r => r.json())
      .then(data => {
        setAssets(data.assets || [])
        setHot(data.hot || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [category])

  return (
    <div style={{ padding: '16px', background: '#000', minHeight: '100vh', color: '#fff' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Marketplace</h1>
        <p style={{ color: '#666', fontSize: 14 }}>Live institutional-grade investment plans</p>
      </div>
      
      {/* Categories */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 20, scrollbarWidth: 'none' }}>
        {categories.map(c => (
          <button 
            key={c} 
            onClick={() => setCategory(c)}
            style={{ 
              padding: '10px 20px', 
              borderRadius: 30, 
              border: '1px solid #222', 
              background: category === c ? '#F2BA0E' : '#111',
              color: category === c ? '#000' : '#fff',
              whiteSpace: 'nowrap',
              fontWeight: 700,
              fontSize: 13,
              transition: 'all 0.2s'
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* HOT Section */}
      {hot.length > 0 && category === 'All' && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 20 }}>🔥</span>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>HOT TRENDING</h2>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
            {hot.map(asset => (
              <div key={asset.id} style={{ minWidth: 220, padding: 20, background: 'linear-gradient(145deg, #111, #050505)', borderRadius: 20, border: '1px solid #222' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <img src={asset.image} alt={asset.name} style={{ width: 32, height: 32, borderRadius: '50%', background: '#222' }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{asset.symbol}</div>
                    <div style={{ fontSize: 11, color: '#666' }}>{asset.category}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#F2BA0E' }}>{asset.dailyReturn}%</div>
                    <div style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>DAILY ROI</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: asset.change24h >= 0 ? '#0ECB81' : '#F6465D' }}>
                      {asset.change24h >= 0 ? '+' : ''}{asset.change24h}%
                    </div>
                    <div style={{ fontSize: 10, color: '#444' }}>24H</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assets Grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{category} Plans</h2>
          <div style={{ fontSize: 12, color: '#666' }}>{assets.length} assets live</div>
        </div>
        
        <div style={{ display: 'grid', gap: 12 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#444' }}>
              <div style={{ width: 30, height: 30, border: '2px solid #222', borderTopColor: '#F2BA0E', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              Syncing with live markets...
            </div>
          ) : (
            assets.map(asset => (
              <div key={asset.id} style={{ padding: 20, background: '#0A0A0A', borderRadius: 20, border: '1px solid #181818', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ position: 'relative' }}>
                    <img src={asset.image} alt={asset.name} style={{ width: 48, height: 48, borderRadius: '50%', background: '#111', padding: 2 }} />
                    <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, background: '#0ECB81', borderRadius: '50%', border: '2px solid #000' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 2 }}>{asset.name}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#666', fontWeight: 600, background: '#111', padding: '2px 8px', borderRadius: 4 }}>{asset.category}</span>
                      <span style={{ fontSize: 11, color: '#F2BA0E', fontWeight: 700 }}>Min ${asset.minInvestment}</span>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#F2BA0E', fontWeight: 900, fontSize: 22, lineHeight: 1 }}>{asset.annualReturn}%</div>
                  <div style={{ fontSize: 10, color: '#444', fontWeight: 700, marginTop: 4, letterSpacing: '0.05em' }}>ANNUAL ROI</div>
                  <button 
                    onClick={() => router.push(`/invest/${asset.id}`)}
                    style={{ marginTop: 12, padding: '8px 16px', background: '#F2BA0E', color: '#000', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}
                  >
                    Invest
                  </button>
                </div>
              </div>
            ))
          )}
          {!loading && assets.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#444', background: '#050505', borderRadius: 20, border: '1px dashed #222' }}>
              No live assets found for this category.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function InvestPage() {
  return (
    <Suspense fallback={<div style={{ padding: 20, color: '#fff' }}>Loading marketplace...</div>}>
      <InvestContent />
    </Suspense>
  )
}
