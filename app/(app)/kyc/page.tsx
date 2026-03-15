'use client'
import { useEffect, useState, useRef } from 'react'
import { COUNTRIES } from '@/lib/countries'

const STEPS = [
  { id:'personal', icon:'', label:'Personal Info' },
  { id:'document', icon:'', label:'ID Document' },
  { id:'selfie',   icon:'', label:'Selfie' },
  { id:'review',   icon:'Verified', label:'Review' },
]

export default function KYCPage() {
  const [status, setStatus] = useState<string|null>(null)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{type:'success'|'error';text:string}|null>(null)
  const [form, setForm] = useState({ firstName:'', lastName:'', dob:'', country:'', docType:'passport', docNumber:'' })
  const [docFile, setDocFile] = useState<File|null>(null)
  const [selfieFile, setSelfieFile] = useState<File|null>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const selfieRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/user/kyc').then(r=>r.json()).then(d=>{setStatus(d.status);setLoading(false)})
  },[])

  async function submit() {
    setSubmitting(true); setMsg(null)
    const fd = new FormData()
    Object.entries(form).forEach(([k,v])=>fd.append(k,v))
    if(docFile) fd.append('documentFile', docFile)
    if(selfieFile) fd.append('selfieFile', selfieFile)
    const res = await fetch('/api/user/kyc', { method:'POST', body:fd })
    const data = await res.json()
    if(res.ok) { setStatus('PENDING_REVIEW'); setMsg({type:'success',text:'KYC submitted for review!'}) }
    else setMsg({type:'error',text:data.error})
    setSubmitting(false)
  }

  if(loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}>
      <div style={{width:32,height:32,border:'3px solid rgba(242,186,14,0.2)',borderTopColor:'#F2BA0E',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
    </div>
  )

  if(status==='APPROVED') return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'70vh',padding:24,textAlign:'center'}}>
      <div style={{width:80,height:80,borderRadius:'50%',background:'var(--success-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,marginBottom:20,border:'2px solid var(--success)'}}>Check</div>
      <h2 style={{fontWeight:800,fontSize:22,marginBottom:10}}>KYC Verified!</h2>
      <p style={{color:'var(--text-muted)',fontSize:14,maxWidth:280,lineHeight:1.7}}>Your identity has been verified. You can now make withdrawals and claim your $100 bonus.</p>
    </div>
  )

  if(status==='PENDING_REVIEW') return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'70vh',padding:24,textAlign:'center'}}>
      <div style={{width:80,height:80,borderRadius:'50%',background:'var(--warning-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,marginBottom:20}}><svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><path d='M6 2h12M6 22h12M8 2v6l4 4 4-4V2M8 22v-6l4-4 4 4v6'/></svg></div>
      <h2 style={{fontWeight:800,fontSize:22,marginBottom:10}}>Under Review</h2>
      <p style={{color:'var(--text-muted)',fontSize:14,maxWidth:280,lineHeight:1.7}}>Your documents are being reviewed. This typically takes 1–2 business days.</p>
    </div>
  )

  if(status==='REJECTED') return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'70vh',padding:24,textAlign:'center'}}>
      <div style={{width:80,height:80,borderRadius:'50%',background:'var(--danger-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,marginBottom:20}}>Rejected</div>
      <h2 style={{fontWeight:800,fontSize:22,marginBottom:10}}>Verification Rejected</h2>
      <p style={{color:'var(--text-muted)',fontSize:14,maxWidth:280,lineHeight:1.7,marginBottom:20}}>Your submission was rejected. Please re-submit with clearer documents.</p>
      <button onClick={()=>setStatus(null)} className="btn-primary" style={{padding:'13px 32px'}}>Re-submit KYC</button>
    </div>
  )

  return (
    <div style={{padding:'0 16px 32px'}}>
      <div style={{padding:'12px 0 20px'}}>
        <h1 style={{fontSize:22,fontWeight:800,marginBottom:4}}>Identity Verification</h1>
        <p style={{color:'var(--text-muted)',fontSize:13}}>Complete in under 5 minutes to unlock all features</p>
      </div>

      {/* Step progress */}
      <div style={{display:'flex',marginBottom:28,gap:0}}>
        {STEPS.map((s,i)=>(
          <div key={s.id} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
            <div style={{display:'flex',alignItems:'center',width:'100%'}}>
              {i>0&&<div style={{flex:1,height:2,background:i<=step?'var(--brand-primary)':'var(--bg-elevated)',transition:'background .3s'}}/>}
              <div style={{width:32,height:32,borderRadius:'50%',background:i<step?'var(--success)':i===step?'var(--brand-primary)':'var(--bg-elevated)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:i<step?16:14,flexShrink:0,transition:'all .3s',border:i===step?'none':'2px solid var(--border)'}}>
                {i<step?'Check':s.icon}
              </div>
              {i<STEPS.length-1&&<div style={{flex:1,height:2,background:i<step?'var(--brand-primary)':'var(--bg-elevated)',transition:'background .3s'}}/>}
            </div>
            <span style={{fontSize:9,color:i===step?'var(--text-primary)':'var(--text-muted)',fontWeight:i===step?700:500,textAlign:'center'}}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step 0 — Personal Info */}
      {step===0&&(
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div><label style={{display:'block',color:'var(--text-muted)',fontSize:12,fontWeight:600,marginBottom:7}}>First Name</label><input className="input" value={form.firstName} onChange={e=>setForm(f=>({...f,firstName:e.target.value}))} placeholder="John"/></div>
            <div><label style={{display:'block',color:'var(--text-muted)',fontSize:12,fontWeight:600,marginBottom:7}}>Last Name</label><input className="input" value={form.lastName} onChange={e=>setForm(f=>({...f,lastName:e.target.value}))} placeholder="Doe"/></div>
          </div>
          <div><label style={{display:'block',color:'var(--text-muted)',fontSize:12,fontWeight:600,marginBottom:7}}>Date of Birth</label><input className="input" type="date" value={form.dob} onChange={e=>setForm(f=>({...f,dob:e.target.value}))}/></div>
          <div><label style={{display:'block',color:'var(--text-muted)',fontSize:12,fontWeight:600,marginBottom:7}}>Country of residence</label>
            <select className="input" value={form.country} onChange={e=>setForm(f=>({...f,country:e.target.value}))}>
              <option value="">Select country</option>
              {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <p style={{color:'var(--text-muted)',fontSize:11,lineHeight:1.5}}>Your data is encrypted and used only for identity verification and regulatory compliance.</p>
          <button onClick={()=>setStep(1)} disabled={!form.firstName||!form.lastName||!form.dob||!form.country} className="btn-primary" style={{marginTop:6}}>Continue →</button>
        </div>
      )}

      {/* Step 1 — Document */}
      {step===1&&(
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div>
            <label style={{display:'block',color:'var(--text-muted)',fontSize:12,fontWeight:600,marginBottom:10}}>Document Type</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
              {[{id:'passport',l:'Passport'},{id:'drivers_license',l:"Driver's License"},{id:'national_id',l:'National ID'}].map(d=>(
                <button key={d.id} onClick={()=>setForm(f=>({...f,docType:d.id}))}
                  style={{padding:'10px 6px',borderRadius:11,border:`2px solid ${form.docType===d.id?'var(--brand-primary)':'var(--border)'}`,background:form.docType===d.id?'rgba(242,186,14,0.08)':'var(--bg-card)',cursor:'pointer',fontFamily:'inherit',fontSize:11,fontWeight:600,color:form.docType===d.id?'var(--brand-primary)':'var(--text-secondary)'}}>
                  {d.l}
                </button>
              ))}
            </div>
          </div>
          <div><label style={{display:'block',color:'var(--text-muted)',fontSize:12,fontWeight:600,marginBottom:7}}>Document Number</label><input className="input" value={form.docNumber} onChange={e=>setForm(f=>({...f,docNumber:e.target.value}))} placeholder="AB1234567"/></div>
          <div>
            <label style={{display:'block',color:'var(--text-muted)',fontSize:12,fontWeight:600,marginBottom:7}}>Upload Document Photo</label>
            <div onClick={()=>docRef.current?.click()} style={{border:'2px dashed var(--border)',borderRadius:12,padding:28,textAlign:'center',cursor:'pointer',transition:'border-color .2s',background:docFile?'var(--success-bg)':'transparent'}} onMouseEnter={e=>(e.currentTarget.style.borderColor='var(--brand-primary)')} onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--border)')}>
              <div style={{fontSize:32,marginBottom:8}}>{docFile?'Verified':''}</div>
              <div style={{fontWeight:600,fontSize:13,color:docFile?'var(--success)':'var(--text-secondary)'}}>{docFile?docFile.name:'Tap to upload'}</div>
              <div style={{color:'var(--text-muted)',fontSize:11,marginTop:4}}>JPG, PNG or PDF • Max 10MB</div>
            </div>
            <input ref={docRef} type="file" accept="image/*,.pdf" style={{display:'none'}} onChange={e=>setDocFile(e.target.files?.[0]||null)}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <button onClick={()=>setStep(0)} className="btn-ghost">← Back</button>
            <button onClick={()=>setStep(2)} disabled={!form.docNumber||!docFile} className="btn-primary">Continue →</button>
          </div>
        </div>
      )}

      {/* Step 2 — Selfie */}
      {step===2&&(
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:16}}>
            <div style={{fontWeight:700,marginBottom:8}}> Selfie Requirements</div>
            {['Hold your ID document next to your face','Ensure good lighting — face clearly visible','No glasses or hats','Photo must match your document'].map(t=>(
              <div key={t} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
                <span style={{color:'var(--success)',fontWeight:700}}>Check</span>
                <span style={{color:'var(--text-secondary)',fontSize:13}}>{t}</span>
              </div>
            ))}
          </div>
          <div onClick={()=>selfieRef.current?.click()} style={{border:'2px dashed var(--border)',borderRadius:12,padding:36,textAlign:'center',cursor:'pointer',transition:'border-color .2s',background:selfieFile?'var(--success-bg)':'transparent'}} onMouseEnter={e=>(e.currentTarget.style.borderColor='var(--brand-primary)')} onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--border)')}>
            <div style={{fontSize:40,marginBottom:8}}>{selfieFile?'Verified':''}</div>
            <div style={{fontWeight:600,fontSize:13,color:selfieFile?'var(--success)':'var(--text-secondary)'}}>{selfieFile?selfieFile.name:'Take or upload selfie'}</div>
          </div>
          <input ref={selfieRef} type="file" accept="image/*" capture="user" style={{display:'none'}} onChange={e=>setSelfieFile(e.target.files?.[0]||null)}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <button onClick={()=>setStep(1)} className="btn-ghost">← Back</button>
            <button onClick={()=>setStep(3)} disabled={!selfieFile} className="btn-primary">Review →</button>
          </div>
        </div>
      )}

      {/* Step 3 — Review */}
      {step===3&&(
        <div>
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:16,marginBottom:14}}>
            {[
              {l:'Full Name',v:`${form.firstName} ${form.lastName}`},
              {l:'Date of Birth',v:form.dob},
              {l:'Country',v:form.country},
              {l:'Document',v:`${form.docType.replace('_',' ')} · ${form.docNumber}`},
              {l:'Document Photo',v:docFile?.name||''},
              {l:'Selfie',v:selfieFile?.name||''},
            ].map(({l,v})=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                <span style={{color:'var(--text-muted)',fontSize:13}}>{l}</span>
                <span style={{fontWeight:600,fontSize:13,maxWidth:'55%',textAlign:'right',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v}</span>
              </div>
            ))}
          </div>
          {msg&&<div style={{padding:'10px 14px',borderRadius:9,marginBottom:14,fontSize:13,fontWeight:600,background:msg.type==='success'?'var(--success-bg)':'var(--danger-bg)',color:msg.type==='success'?'var(--success)':'var(--danger)'}}>{msg.text}</div>}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <button onClick={()=>setStep(2)} className="btn-ghost">← Back</button>
            <button onClick={submit} disabled={submitting} className="btn-primary">{submitting?'Submitting...':'Submit KYC Check'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
