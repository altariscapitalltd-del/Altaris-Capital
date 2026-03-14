'use client'
import { useEffect, useState, useRef } from 'react'

const COINS = [
  { sym:'BTC', name:'Bitcoin',  icon:'₿',  color:'#F7931A', minDeposit:0.001  },
  { sym:'ETH', name:'Ethereum', icon:'Ξ',  color:'#627EEA', minDeposit:0.01   },
  { sym:'USDT',name:'Tether',   icon:'₮',  color:'#26A17B', minDeposit:10     },
  { sym:'USD', name:'USD',      icon:'$',  color:'#3B82F6', minDeposit:10     },
]

export default function WalletPage() {
  const [tab, setTab] = useState<'deposit'|'withdraw'>('deposit')
  const [coin, setCoin] = useState('USDT')
  const [amount, setAmount] = useState('')
  const [txHash, setTxHash] = useState('')
  const [walletAddresses, setWalletAddresses] = useState<Record<string,string>>({})
  const [balances, setBalances] = useState<Record<string,number>>({})
  const [withdrawAddress, setWithdrawAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{type:'success'|'error';text:string}|null>(null)
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    fetch('/api/user/profile').then(r=>r.json()).then(d => {
      const bals: Record<string,number> = {}
      d.user?.balances?.forEach((b:any) => { bals[b.currency] = b.amount })
      setBalances(bals)
    })
    fetch('/api/wallet/addresses').then(r=>r.json()).then(d => {
      const addrs: Record<string,string> = {}
      d.addresses?.forEach((a:any) => { addrs[a.currency] = a.address })
      setWalletAddresses(addrs)
    })
  }, [])

  // Simple QR code placeholder using canvas
  useEffect(() => {
    const canvas = qrRef.current; if(!canvas) return
    const ctx = canvas.getContext('2d'); if(!ctx) return
    const size = 160; canvas.width=size; canvas.height=size
    ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,size,size)
    // Draw a simple grid pattern as QR placeholder
    const addr = walletAddresses[coin]||''
    ctx.fillStyle='#000000'
    const cellSize=8; const cells=size/cellSize
    for(let r=0;r<cells;r++) for(let c=0;c<cells;c++) {
      const hash = (addr.charCodeAt((r*cells+c)%addr.length)||0)+(r*17+c*13)
      if(hash%2===0) ctx.fillRect(c*cellSize,r*cellSize,cellSize,cellSize)
    }
    // Corner squares
    for(const [rx,cx] of [[0,0],[0,cells-7],[cells-7,0]]) {
      ctx.fillStyle='#000'; ctx.fillRect(cx*cellSize,rx*cellSize,7*cellSize,7*cellSize)
      ctx.fillStyle='#fff'; ctx.fillRect((cx+1)*cellSize,(rx+1)*cellSize,5*cellSize,5*cellSize)
      ctx.fillStyle='#000'; ctx.fillRect((cx+2)*cellSize,(rx+2)*cellSize,3*cellSize,3*cellSize)
    }
  }, [coin, walletAddresses])

  async function submitDeposit() {
    if(!amount||!txHash) { setMsg({type:'error',text:'Please fill all fields'}); return }
    setLoading(true); setMsg(null)
    const res = await fetch('/api/deposits', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ currency:coin, amount:parseFloat(amount), txHash }) })
    const data = await res.json()
    if(res.ok) { setMsg({type:'success',text:'Deposit submitted! Pending admin approval.'}); setAmount(''); setTxHash('') }
    else setMsg({type:'error',text:data.error})
    setLoading(false)
  }

  async function submitWithdraw() {
    if(!amount||!withdrawAddress) { setMsg({type:'error',text:'Please fill all fields'}); return }
    setLoading(true); setMsg(null)
    const res = await fetch('/api/withdrawals', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ currency:coin, amount:parseFloat(amount), walletAddress:withdrawAddress }) })
    const data = await res.json()
    if(res.ok) { setMsg({type:'success',text:'Withdrawal requested! Processing...'}); setAmount(''); setWithdrawAddress('') }
    else setMsg({type:'error',text:data.error})
    setLoading(false)
  }

  function copy(text:string) {
    navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(()=>setCopied(false), 2000)
  }

  const selectedCoin = COINS.find(c=>c.sym===coin)!

  return (
    <div style={{ padding:'0 0 24px' }}>
      {/* Header */}
      <div style={{ padding:'12px 16px 0' }}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:14 }}>Wallet</h1>

        {/* Balance cards — horizontal scroll */}
        <div style={{ display:'flex', gap:10, overflowX:'auto', marginBottom:16, paddingBottom:4 }} className="no-scrollbar">
          {COINS.map(c => (
            <div key={c.sym} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'12px 16px', flexShrink:0, minWidth:120 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:c.color+'22', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, color:c.color }}>
                  {c.icon}
                </div>
                <span style={{ fontWeight:700, fontSize:13 }}>{c.sym}</span>
              </div>
              <div style={{ fontWeight:800, fontSize:17 }}>{(balances[c.sym]||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:c.sym==='BTC'?6:2})}</div>
              <div style={{ color:'var(--text-muted)', fontSize:10, marginTop:1 }}>{c.name}</div>
            </div>
          ))}
        </div>

        {/* Deposit / Withdraw tabs */}
        <div style={{ display:'flex', background:'var(--bg-elevated)', borderRadius:99, padding:3, gap:2, marginBottom:18 }}>
          {[{id:'deposit',l:'⬇ Deposit'},{id:'withdraw',l:'⬆ Withdraw'}].map(t=>(
            <button key={t.id} onClick={()=>{setTab(t.id as any);setMsg(null)}}
              style={{ flex:1, padding:'10px', borderRadius:99, border:'none', background:tab===t.id?'var(--bg-card)':'transparent', color:tab===t.id?'var(--text-primary)':'var(--text-muted)', fontWeight:tab===t.id?700:500, fontSize:14, cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {/* Coin selector */}
      <div style={{ padding:'0 16px', marginBottom:16 }}>
        <div style={{ display:'flex', gap:8 }}>
          {COINS.map(c=>(
            <button key={c.sym} onClick={()=>{setCoin(c.sym);setMsg(null)}}
              style={{ flex:1, padding:'10px 4px', borderRadius:11, border:`2px solid ${coin===c.sym?c.color:'var(--border)'}`, background:coin===c.sym?c.color+'15':'var(--bg-card)', cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
              <div style={{ fontSize:14, fontWeight:800, color:coin===c.sym?c.color:'var(--text-secondary)' }}>{c.sym}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'0 16px' }}>
        {tab==='deposit' ? (
          <div>
            {/* QR Code */}
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:20, marginBottom:14, textAlign:'center' }}>
              <div style={{ display:'inline-block', background:'#fff', padding:8, borderRadius:12, marginBottom:12 }}>
                <canvas ref={qrRef} style={{ width:160, height:160, borderRadius:6 }}/>
              </div>
              <p style={{ color:'var(--text-muted)', fontSize:12, marginBottom:10 }}>Scan to get {coin} deposit address</p>

              {walletAddresses[coin] ? (
                <div style={{ background:'var(--bg-elevated)', borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'center', gap:8, textAlign:'left' }}>
                  <code style={{ flex:1, fontSize:11, color:'var(--text-secondary)', wordBreak:'break-all', fontFamily:'monospace', lineHeight:1.5 }}>{walletAddresses[coin]}</code>
                  <button onClick={()=>copy(walletAddresses[coin])}
                    style={{ flexShrink:0, padding:'7px 12px', borderRadius:8, border:'1px solid var(--border)', background: copied?'var(--success-bg)':'var(--bg-card)', color: copied?'var(--success)':'var(--text-secondary)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              ) : (
                <div style={{ color:'var(--text-muted)', fontSize:12 }}>No {coin} address configured yet</div>
              )}
            </div>

            {/* Confirm fields */}
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:14 }}>
              <div>
                <label style={{ display:'block', color:'var(--text-muted)', fontSize:12, fontWeight:600, marginBottom:7 }}>Amount Sent ({coin})</label>
                <input className="input" type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder={`Min: ${selectedCoin.minDeposit} ${coin}`}/>
              </div>
              <div>
                <label style={{ display:'block', color:'var(--text-muted)', fontSize:12, fontWeight:600, marginBottom:7 }}>Transaction Hash / TXID</label>
                <input className="input" value={txHash} onChange={e=>setTxHash(e.target.value)} placeholder="0x..." style={{ fontFamily:'monospace', fontSize:13 }}/>
              </div>
            </div>

            {msg && <div style={{ padding:'10px 14px', borderRadius:9, marginBottom:12, fontSize:13, fontWeight:600, background:msg.type==='success'?'var(--success-bg)':'var(--danger-bg)', color:msg.type==='success'?'var(--success)':'var(--danger)' }}>{msg.text}</div>}

            <button onClick={submitDeposit} disabled={loading} className="btn-primary" style={{ width:'100%' }}>
              {loading ? 'Submitting...' : 'Confirm Deposit'}
            </button>

            <div style={{ marginTop:14, padding:14, background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)' }}>
              <p style={{ color:'var(--text-muted)', fontSize:11, lineHeight:1.7 }}>
                ⚠️ Only send <strong>{coin}</strong> to this address. Deposits are credited after admin confirmation (1–24 hours).
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:16, marginBottom:14 }}>
              <div style={{ color:'var(--text-muted)', fontSize:12, marginBottom:4 }}>Available Balance</div>
              <div style={{ fontWeight:900, fontSize:28 }}>{(balances[coin]||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:6})} <span style={{ fontSize:14, fontWeight:600, color:'var(--text-muted)' }}>{coin}</span></div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:14 }}>
              <div>
                <label style={{ display:'block', color:'var(--text-muted)', fontSize:12, fontWeight:600, marginBottom:7 }}>Your {coin} Wallet Address</label>
                <input className="input" value={withdrawAddress} onChange={e=>setWithdrawAddress(e.target.value)} placeholder="Enter destination address" style={{ fontFamily:'monospace', fontSize:13 }}/>
              </div>
              <div>
                <label style={{ display:'block', color:'var(--text-muted)', fontSize:12, fontWeight:600, marginBottom:7 }}>Amount ({coin})</label>
                <div style={{ position:'relative' }}>
                  <input className="input" type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" style={{ paddingRight:60 }}/>
                  <button onClick={()=>setAmount(String(balances[coin]||0))}
                    style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'rgba(242,186,14,0.1)', color:'var(--brand-primary)', border:'none', borderRadius:6, padding:'4px 9px', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    MAX
                  </button>
                </div>
              </div>
            </div>

            {msg && <div style={{ padding:'10px 14px', borderRadius:9, marginBottom:12, fontSize:13, fontWeight:600, background:msg.type==='success'?'var(--success-bg)':'var(--danger-bg)', color:msg.type==='success'?'var(--success)':'var(--danger)' }}>{msg.text}</div>}

            <button onClick={submitWithdraw} disabled={loading} className="btn-primary" style={{ width:'100%' }}>
              {loading ? 'Processing...' : 'Request Withdrawal'}
            </button>

            <div style={{ marginTop:14, padding:14, background:'var(--bg-card)', borderRadius:12, border:'1px solid rgba(246,70,93,0.15)' }}>
              <p style={{ color:'var(--text-muted)', fontSize:11, lineHeight:1.7 }}>
                ⚠️ KYC verification required for withdrawals. Processing time: 1–3 business days.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
