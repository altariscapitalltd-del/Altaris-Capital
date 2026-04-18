'use client'
import { useEffect, useState, useCallback } from 'react'

const TIERS = [
  { count: 1,  bonus: 100,  label: 'Starter',     color: '#888888', icon: '🌱' },
  { count: 5,  bonus: 700,  label: 'Rising',       color: '#A78BFA', icon: '⭐' },
  { count: 20, bonus: 3000, label: 'Elite',        color: '#F2BA0E', icon: '👑' },
  { count: 50, bonus: 0,    label: 'VIP Investor', color: '#0ECB81', icon: '💎' },
]

function GiftIcon({ size = 24, color = '#F2BA0E' }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5" rx="1"/>
      <line x1="12" y1="22" x2="12" y2="7"/>
      <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
    </svg>
  )
}

function TrophyIcon({ size = 20, color = '#F2BA0E' }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4a2 2 0 01-2-2V5h4"/><path d="M18 9h2a2 2 0 002-2V5h-4"/>
      <path d="M12 17c-3.31 0-6-2.69-6-6V4h12v7c0 3.31-2.69 6-6 6z"/>
      <path d="M12 17v4"/><path d="M8 21h8"/>
    </svg>
  )
}

function UsersIcon({ size = 20, color = '#A78BFA' }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  )
}

function ShareIcon({ size = 18, color = '#000' }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  )
}

function CopyIcon({ size = 16, color = '#888' }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>
  )
}

export default function RewardsPage() {
  const [data, setData]             = useState<any>(null)
  const [leaderboard, setLeaderboard] = useState<any>(null)
  const [loading, setLoading]       = useState(true)
  const [copied, setCopied]         = useState(false)
  const [lbPeriod, setLbPeriod]     = useState<'weekly' | 'monthly'>('monthly')
  const [activeTab, setActiveTab]   = useState<'overview' | 'referrals' | 'rewards' | 'leaderboard'>('overview')
  const [celebration, setCelebration] = useState<string | null>(null)
  const prevQualified = useState<number>(0)

  const load = useCallback(async () => {
    try {
      const [refRes, lbRes] = await Promise.all([
        fetch('/api/user/referral'),
        fetch(`/api/referral/leaderboard?period=${lbPeriod}`),
      ])
      const [refData, lbData] = await Promise.all([refRes.json(), lbRes.json()])
      setData(refData)
      setLeaderboard(lbData)
    } finally {
      setLoading(false)
    }
  }, [lbPeriod])

  useEffect(() => { load() }, [load])

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(data?.referralCode || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(data?.referralLink || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  async function shareLink() {
    const link = data?.referralLink
    const text = `I'm using Altaris Capital — an investment platform that grows your wealth. Join with my referral link and get a $100 bonus when you start investing!`
    if (navigator.share) {
      try { await navigator.share({ title: 'Join Altaris Capital', text, url: link }) } catch {}
    } else {
      await copyLink()
    }
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div style={{ width:32, height:32, border:'3px solid rgba(242,186,14,0.2)', borderTopColor:'#F2BA0E', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
    </div>
  )

  const qualified = data?.stats?.qualified || 0
  const currentTierIdx = data?.currentTierIdx ?? -1
  const nextTier = data?.nextTier
  const progressPct = nextTier ? Math.min(100, (qualified / nextTier.count) * 100) : 100

  const tab = (id: typeof activeTab, label: string) => (
    <button key={id} onClick={() => setActiveTab(id)}
      style={{ padding:'8px 16px', borderRadius:99, border:'none', background:activeTab===id?'#F2BA0E':'transparent', color:activeTab===id?'#000':'#555', fontWeight:activeTab===id?700:500, fontSize:12, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', transition:'all .15s' }}>
      {label}
    </button>
  )

  return (
    <div style={{ padding:'0 0 120px', maxWidth:600, margin:'0 auto' }}>
      {celebration && (
        <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)' }}
          onClick={() => setCelebration(null)}>
          <div style={{ textAlign:'center', padding:40 }}>
            <div style={{ fontSize:72, marginBottom:16 }}>🎉</div>
            <h2 style={{ fontSize:28, fontWeight:900, color:'#F2BA0E', marginBottom:12 }}>Milestone Reached!</h2>
            <p style={{ color:'#aaa', fontSize:16, maxWidth:280 }}>{celebration}</p>
            <button onClick={() => setCelebration(null)} className="btn-primary" style={{ marginTop:24 }}>Awesome!</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding:'20px 20px 0' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <div style={{ width:44, height:44, borderRadius:14, background:'rgba(242,186,14,0.12)', border:'1px solid rgba(242,186,14,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <GiftIcon size={22}/>
          </div>
          <div>
            <h1 style={{ fontSize:22, fontWeight:900, marginBottom:2 }}>Rewards</h1>
            <div style={{ color:'var(--text-muted)', fontSize:12 }}>Invite friends, earn bonuses</div>
          </div>
          <div style={{ marginLeft:'auto', textAlign:'right' }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>REWARD BALANCE</div>
            <div style={{ fontSize:22, fontWeight:900, color:'#F2BA0E' }}>${(data?.rewardBalance || 0).toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Referral Code Card */}
      <div style={{ margin:'0 20px 20px', background:'linear-gradient(135deg,#1A1500,#0D0D0D)', border:'1px solid rgba(242,186,14,0.2)', borderRadius:18, padding:20, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-30, right:-30, width:120, height:120, borderRadius:'50%', background:'radial-gradient(circle,rgba(242,186,14,0.12),transparent 70%)' }}/>
        <div style={{ fontSize:11, color:'#F2BA0E', fontWeight:700, letterSpacing:'0.1em', marginBottom:8 }}>YOUR REFERRAL CODE</div>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <div style={{ fontSize:28, fontWeight:900, letterSpacing:'0.15em', color:'#fff' }}>{data?.referralCode || '—'}</div>
          <button onClick={copyCode} style={{ background:'rgba(242,186,14,0.12)', border:'1px solid rgba(242,186,14,0.2)', borderRadius:8, padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:'#F2BA0E', fontSize:12, fontWeight:600, fontFamily:'inherit' }}>
            <CopyIcon color="#F2BA0E"/>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={copyLink} style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'10px 14px', cursor:'pointer', color:'#aaa', fontSize:12, fontWeight:600, fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <CopyIcon/> Copy Link
          </button>
          <button onClick={shareLink} style={{ flex:1, background:'#F2BA0E', border:'none', borderRadius:10, padding:'10px 14px', cursor:'pointer', color:'#000', fontSize:13, fontWeight:800, fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <ShareIcon/> Share
          </button>
        </div>
        <div style={{ marginTop:12, fontSize:11, color:'#555', lineHeight:1.5 }}>
          Friends who sign up using your link get $100 · You earn $200 per qualified referral
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, padding:'0 20px', marginBottom:20 }}>
        {[
          { label:'Invited', value: data?.stats?.totalInvited || 0, color:'#A78BFA' },
          { label:'Qualified', value: data?.stats?.qualified || 0, color:'#0ECB81' },
          { label:'Pending', value: data?.stats?.pending || 0, color:'#F2BA0E' },
          { label:'Earned', value: `$${(data?.stats?.totalEarned || 0).toFixed(0)}`, color:'#F2BA0E' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 8px', textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:900, color:s.color, marginBottom:3 }}>{s.value}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:6, padding:'0 20px', marginBottom:20, overflowX:'auto', background:'var(--bg-page)' }}>
        <div style={{ display:'flex', gap:4, background:'#111', borderRadius:99, padding:4, border:'1px solid rgba(255,255,255,0.06)' }}>
          {(['overview', 'referrals', 'rewards', 'leaderboard'] as const).map(id =>
            tab(id, id.charAt(0).toUpperCase() + id.slice(1))
          )}
        </div>
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ padding:'0 20px', display:'flex', flexDirection:'column', gap:16 }}>

          {/* Tier Progress */}
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div style={{ fontWeight:800, fontSize:15 }}>Tier Progress</div>
              {currentTierIdx >= 0 && (
                <div style={{ padding:'4px 12px', borderRadius:99, background:`${TIERS[currentTierIdx].color}20`, color:TIERS[currentTierIdx].color, fontSize:11, fontWeight:700 }}>
                  {TIERS[currentTierIdx].label} {TIERS[currentTierIdx].icon}
                </div>
              )}
            </div>

            {nextTier ? (
              <>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-muted)', marginBottom:8 }}>
                  <span>{qualified} qualified referrals</span>
                  <span>{nextTier.count - qualified} more to {nextTier.label}</span>
                </div>
                <div style={{ height:8, background:'rgba(255,255,255,0.06)', borderRadius:99, overflow:'hidden', marginBottom:10 }}>
                  <div style={{ height:'100%', width:`${progressPct}%`, background:'linear-gradient(90deg,#F2BA0E,#FFD23A)', borderRadius:99, transition:'width 0.6s ease' }}/>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#aaa' }}>
                  <span>Next: </span>
                  <span style={{ color:nextTier.color, fontWeight:700 }}>{nextTier.label} {nextTier.bonus > 0 ? `+$${nextTier.bonus.toLocaleString()} bonus` : '— VIP Benefits'}</span>
                </div>
              </>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0' }}>
                <div style={{ fontSize:28 }}>💎</div>
                <div>
                  <div style={{ fontWeight:800, color:'#0ECB81' }}>VIP Investor Status Achieved!</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>You've unlocked all exclusive benefits</div>
                </div>
              </div>
            )}

            <div style={{ display:'flex', gap:6, marginTop:14, overflowX:'auto', paddingBottom:4 }}>
              {TIERS.map((tier, i) => (
                <div key={tier.label} style={{ flex:'0 0 auto', textAlign:'center', padding:'8px 12px', borderRadius:10, background:i <= currentTierIdx ? `${tier.color}12` : '#1A1A1A', border:`1px solid ${i <= currentTierIdx ? tier.color : 'rgba(255,255,255,0.06)'}`, minWidth:80 }}>
                  <div style={{ fontSize:16, marginBottom:4 }}>{tier.icon}</div>
                  <div style={{ fontSize:10, fontWeight:700, color:i <= currentTierIdx ? tier.color : '#555' }}>{tier.label}</div>
                  <div style={{ fontSize:10, color:'#444', marginTop:2 }}>{tier.count} ref{tier.count > 1 ? 's' : ''}</div>
                  {tier.bonus > 0 && <div style={{ fontSize:10, color:i <= currentTierIdx ? tier.color : '#444', fontWeight:700 }}>+${tier.bonus.toLocaleString()}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Multi-level */}
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:18 }}>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:14 }}>Network Commissions</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                { level:'Level 1', count:data?.multiLevel?.l1 || 0, pct:'10%', color:'#F2BA0E', desc:'Direct referrals' },
                { level:'Level 2', count:data?.multiLevel?.l2 || 0, pct:'5%', color:'#A78BFA', desc:'Their referrals' },
                { level:'Level 3', count:data?.multiLevel?.l3 || 0, pct:'2%', color:'#0ECB81', desc:'Their referrals' },
              ].map(l => (
                <div key={l.level} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:'#1A1A1A', borderRadius:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:l.color, flexShrink:0 }}/>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13 }}>{l.level}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{l.desc}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontWeight:800, color:l.color }}>{l.count}</div>
                    <div style={{ fontSize:10, color:'#555' }}>{l.pct} commission</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* VIP Benefits */}
          {currentTierIdx >= 3 && (
            <div style={{ background:'linear-gradient(135deg,rgba(14,203,129,0.08),rgba(14,203,129,0.02))', border:'1px solid rgba(14,203,129,0.2)', borderRadius:16, padding:18 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ fontSize:24 }}>💎</div>
                <div style={{ fontWeight:800, fontSize:15, color:'#0ECB81' }}>VIP Investor Benefits</div>
              </div>
              {['Free stock reward upon reaching VIP status', '90% cashback protection during first month of market dip', 'Access to exclusive VIP investment strategies', 'Priority support and dedicated account manager', 'Early access to new investment plans'].map(b => (
                <div key={b} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px solid rgba(14,203,129,0.1)' }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#0ECB81" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{b}</span>
                </div>
              ))}
            </div>
          )}

          {/* Campaigns */}
          {data?.campaigns?.length > 0 && (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:18 }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:14 }}>🔥 Active Campaigns</div>
              {data.campaigns.map((c: any) => (
                <div key={c.id} style={{ background:'rgba(242,186,14,0.05)', border:'1px solid rgba(242,186,14,0.15)', borderRadius:12, padding:14, marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>{c.title}</div>
                    <div style={{ fontSize:10, color:'#F2BA0E', fontWeight:700 }}>{c.daysLeft}d left</div>
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10 }}>{c.description}</div>
                  <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:99, marginBottom:6, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.min(100, (c.userCount / c.target) * 100)}%`, background:'#F2BA0E', borderRadius:99 }}/>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-muted)' }}>
                    <span>{c.userCount}/{c.target} referrals</span>
                    <span style={{ color:'#F2BA0E', fontWeight:700 }}>Reward: ${c.reward.toLocaleString()}</span>
                  </div>
                  {c.rewarded && <div style={{ marginTop:8, padding:'4px 10px', background:'rgba(14,203,129,0.1)', borderRadius:6, fontSize:11, color:'#0ECB81', fontWeight:700 }}>Bonus Claimed!</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REFERRALS TAB */}
      {activeTab === 'referrals' && (
        <div style={{ padding:'0 20px', display:'flex', flexDirection:'column', gap:12 }}>
          {(!data?.referrals || data.referrals.length === 0) ? (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:40, textAlign:'center' }}>
              <div style={{ marginBottom:16 }}><UsersIcon size={40} color="#333"/></div>
              <div style={{ fontWeight:700, fontSize:15, marginBottom:8 }}>No referrals yet</div>
              <div style={{ color:'var(--text-muted)', fontSize:13, marginBottom:20 }}>Share your referral code to start earning</div>
              <button onClick={shareLink} style={{ background:'#F2BA0E', border:'none', borderRadius:10, padding:'11px 24px', cursor:'pointer', color:'#000', fontSize:13, fontWeight:800, fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:8 }}>
                <ShareIcon/> Share Your Link
              </button>
            </div>
          ) : data.referrals.map((r: any) => (
            <div key={r.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{r.referred.name}</div>
                  <div style={{ color:'var(--text-muted)', fontSize:12 }}>{r.referred.email}</div>
                  <div style={{ color:'#444', fontSize:11, marginTop:2 }}>Joined {new Date(r.referred.createdAt).toLocaleDateString()}</div>
                </div>
                <div style={{ padding:'4px 10px', borderRadius:99, fontSize:11, fontWeight:700,
                  background:r.status==='QUALIFIED'||r.status==='REWARDED' ? 'rgba(14,203,129,0.1)' : 'rgba(242,186,14,0.1)',
                  color:r.status==='QUALIFIED'||r.status==='REWARDED' ? '#0ECB81' : '#F2BA0E' }}>
                  {r.status === 'QUALIFIED' || r.status === 'REWARDED' ? 'Qualified' : 'Pending'}
                </div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {[
                  { label:'Signed Up', done: true },
                  { label:'Verified', done: r.steps.emailVerified },
                  { label:'KYC', done: r.steps.kycApproved },
                  { label:'Deposited', done: r.steps.depositMade },
                ].map((s, i) => (
                  <div key={i} style={{ flex:1, textAlign:'center', padding:'6px 4px', borderRadius:8, background:s.done ? 'rgba(14,203,129,0.08)' : '#1A1A1A', border:`1px solid ${s.done ? 'rgba(14,203,129,0.2)' : 'rgba(255,255,255,0.05)'}` }}>
                    {s.done ? (
                      <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#0ECB81" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <div style={{ width:6, height:6, borderRadius:'50%', background:'#333', margin:'2px auto' }}/>
                    )}
                    <div style={{ fontSize:9, color:s.done ? '#0ECB81' : '#444', marginTop:2, fontWeight:600 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* REWARDS TAB */}
      {activeTab === 'rewards' && (
        <div style={{ padding:'0 20px', display:'flex', flexDirection:'column', gap:12 }}>
          {(!data?.rewards || data.rewards.length === 0) ? (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:40, textAlign:'center' }}>
              <div style={{ marginBottom:16 }}><GiftIcon size={40} color="#333"/></div>
              <div style={{ fontWeight:700, fontSize:15, marginBottom:8 }}>No rewards yet</div>
              <div style={{ color:'var(--text-muted)', fontSize:13 }}>Earn $200 for every qualified referral</div>
            </div>
          ) : (
            <>
              <div style={{ background:'linear-gradient(135deg,#1A1500,#0D0D0D)', border:'1px solid rgba(242,186,14,0.2)', borderRadius:14, padding:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, marginBottom:4 }}>TOTAL REWARD BALANCE</div>
                  <div style={{ fontSize:28, fontWeight:900, color:'#F2BA0E' }}>${(data?.rewardBalance || 0).toFixed(2)}</div>
                </div>
                <GiftIcon size={32}/>
              </div>
              {data.rewards.map((r: any) => (
                <div key={r.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14, marginBottom:3 }}>{r.reason}</div>
                    <div style={{ color:'var(--text-muted)', fontSize:12 }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontSize:18, fontWeight:900, color:'#0ECB81' }}>+${r.amount}</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* LEADERBOARD TAB */}
      {activeTab === 'leaderboard' && (
        <div style={{ padding:'0 20px', display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', gap:6 }}>
            {(['weekly', 'monthly'] as const).map(p => (
              <button key={p} onClick={() => setLbPeriod(p)}
                style={{ flex:1, padding:'9px', borderRadius:99, background:lbPeriod===p?'#F2BA0E':'#111', color:lbPeriod===p?'#000':'#555', fontWeight:lbPeriod===p?700:500, fontSize:12, cursor:'pointer', fontFamily:'inherit', border:`1px solid ${lbPeriod===p?'#F2BA0E':'rgba(255,255,255,0.06)'}` }}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {leaderboard?.myRank && (
            <div style={{ background:'rgba(242,186,14,0.06)', border:'1px solid rgba(242,186,14,0.15)', borderRadius:12, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:13, color:'#F2BA0E', fontWeight:700 }}>Your Rank</div>
              <div style={{ fontSize:22, fontWeight:900, color:'#F2BA0E' }}>#{leaderboard.myRank}</div>
            </div>
          )}

          {(!leaderboard?.leaderboard || leaderboard.leaderboard.length === 0) ? (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:40, textAlign:'center' }}>
              <div style={{ marginBottom:12 }}><TrophyIcon size={40} color="#333"/></div>
              <div style={{ fontWeight:700, fontSize:15, marginBottom:8 }}>Leaderboard is empty</div>
              <div style={{ color:'var(--text-muted)', fontSize:13 }}>Be the first to qualify referrals!</div>
            </div>
          ) : leaderboard.leaderboard.map((entry: any) => (
            <div key={entry.userId} style={{ background:entry.isMe ? 'rgba(242,186,14,0.06)' : 'var(--bg-card)', border:`1px solid ${entry.isMe ? 'rgba(242,186,14,0.2)' : 'var(--border)'}`, borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:36, textAlign:'center', fontWeight:900, fontSize:16, color:entry.rank === 1 ? '#F2BA0E' : entry.rank === 2 ? '#ccc' : entry.rank === 3 ? '#cd7f32' : '#555' }}>
                {entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank - 1] : `#${entry.rank}`}
              </div>
              <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#A78BFA40,#7C3AED20)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:16, color:'#A78BFA', flexShrink:0 }}>
                {entry.name[0]?.toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:14 }}>{entry.name} {entry.isMe ? '(You)' : ''}</div>
                <div style={{ color:'var(--text-muted)', fontSize:12 }}>{entry.count} qualified referral{entry.count !== 1 ? 's' : ''}</div>
              </div>
              {entry.rank <= 3 && <TrophyIcon size={18} color={entry.rank === 1 ? '#F2BA0E' : entry.rank === 2 ? '#ccc' : '#cd7f32'}/>}
            </div>
          ))}
        </div>
      )}

      {/* How it works */}
      {activeTab === 'overview' && (
        <div style={{ padding:'16px 20px 0' }}>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:18 }}>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:14 }}>How It Works</div>
            {[
              { step:'1', title:'Share your code', desc:'Send your referral link to friends via any channel', color:'#A78BFA' },
              { step:'2', title:'Friend signs up', desc:'They create an account using your unique link', color:'#F2BA0E' },
              { step:'3', title:'They verify & deposit', desc:'Complete KYC and make their first deposit', color:'#0ECB81' },
              { step:'4', title:'Both earn bonuses', desc:'You get $200 · They get $100 · Credited instantly', color:'#F2BA0E' },
            ].map(s => (
              <div key={s.step} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:`${s.color}15`, border:`1.5px solid ${s.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:13, color:s.color, flexShrink:0 }}>{s.step}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:13, marginBottom:2 }}>{s.title}</div>
                  <div style={{ color:'var(--text-muted)', fontSize:12 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
