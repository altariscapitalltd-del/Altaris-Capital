'use client'

export default function CoinIcon({
  symbol,
  bg,
  size = 36,
  label,
}: {
  symbol: string
  bg?: string
  size?: number
  label?: string
}) {
  const key = (label || symbol || '').toString().toUpperCase()
  const bgColor = bg || '#262626'

  const logos: Record<string, React.ReactNode> = {
    BTC: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#F7931A" />
        <path
          d="M22.4 13.8c1.4-.55 2.3-1.7 2.3-3.2 0-1.9-1.5-3.3-3.4-3.3-1.5 0-2.7.9-3.2 2.2-.2.5-.2 1.1 0 1.7l-2.1.8-.4-2.1c-.1-.5-.6-.9-1.1-.9H12v3.5h1.1l.8 4.4-1.1.4c-.5.2-.8.7-.8 1.3 0 .9.7 1.6 1.6 1.6h1l-.8 4.4H16v3.5h1.6c.6 0 1.1-.4 1.2-1l.8-4.4 1.7.7c.2.1.4.1.6.1 1.9 0 3.4-1.4 3.4-3.3 0-1.5-1.1-2.8-2.6-3.1l1.9-.7c.7-.2 1.1-.8 1.1-1.5 0-.8-.6-1.4-1.5-1.6z"
          fill="#fff"
        />
      </g>
    ),
    ETH: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#627EEA" />
        <path d="M20 7l-9 10 9 5 9-5-9-10z" fill="#fff" />
        <path d="M20 7v15l9-5-9-10z" fill="rgba(255,255,255,0.6)" />
      </g>
    ),
    USDT: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#26A17B" />
        <path
          d="M28 14H12a2 2 0 00-2 2v8a2 2 0 002 2h16a2 2 0 002-2v-8a2 2 0 00-2-2z"
          fill="#fff"
        />
        <path
          d="M14 17h12v6H14v-6zm6-5v14"
          stroke="#26A17B"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    ),
    BNB: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#F0B90B" />
        <path d="M20 12l-4 4 4 4 4-4-4-4z" fill="#000" />
        <path d="M12 20l4 4 4-4-4-4-4 4z" fill="#fff" />
      </g>
    ),
    SOL: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#66F9D1" />
        <path d="M17 12l7 6-7 6-7-6 7-6z" fill="#0C0C0C" />
        <path d="M17 12l-7 6 7 6v-12z" fill="#ffffff" opacity="0.6" />
      </g>
    ),
    DEF: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#7C3AED" />
        <path d="M20 10v6l6 10h-4l-4-7-4 7h-4l6-10V10z" fill="#fff" />
        <circle cx="20" cy="16" r="2" fill="#fff" />
      </g>
    ),
    ALT: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#06B6D4" />
        <path d="M12 28V12h4v16h-4zm6-8v8h4v-8h4l-6-8-6 8h4z" fill="#fff" />
      </g>
    ),
    STK: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#3B82F6" />
        <path d="M12 26V14l4 4 4-6 4 8 4-10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    ),
    DIV: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#059669" />
        <path d="M14 22h12v2H14zm2-6l4 4 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="20" cy="14" r="2" fill="#fff" />
      </g>
    ),
    SPX: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#6366F1" />
        <path d="M12 24l4-8 4 4 4-8 4 12" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    ),
    CHP: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#8B5CF6" />
        <rect x="11" y="14" width="6" height="10" rx="1" fill="#fff" />
        <rect x="23" y="10" width="6" height="14" rx="1" fill="#fff" opacity="0.9" />
      </g>
    ),
    AI: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#0EA5E9" />
        <path d="M14 22l4-8 4 4 4-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="20" cy="12" r="2" fill="#fff" />
      </g>
    ),
    REIT: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#D97706" />
        <path d="M12 26V16l8-6 8 6v10h-5v-6h-6v6h-5z" fill="#fff" />
      </g>
    ),
    DEV: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#92400E" />
        <rect x="10" y="14" width="8" height="12" rx="1" fill="#fff" />
        <rect x="22" y="10" width="8" height="16" rx="1" fill="#fff" opacity="0.9" />
        <path d="M18 14v-4h4v4" stroke="#fff" strokeWidth="1.5" fill="none" />
      </g>
    ),
    GPI: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#7C3AED" />
        <path d="M12 26h16v-8l-4-4h-4l-4 4v2h-4v6z" fill="#fff" />
      </g>
    ),
    BND: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#1D4ED8" />
        <path d="M12 20h16v2H12zm0-4h12v2H12z" stroke="#fff" strokeWidth="2" fill="none" />
        <path d="M14 14v12M20 12v14M26 14v12" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </g>
    ),
    HYB: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#2563EB" />
        <path d="M12 20h4v6h-4zm6-4h4v10h-4zm6 2h4v8h-4z" fill="#fff" />
      </g>
    ),
    EMB: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#1E3A8A" />
        <path d="M14 22V14h12v2h-8v2h6v2h-6v2h8v2H14z" fill="#fff" />
      </g>
    ),
    SAV: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#059669" />
        <path d="M14 20h12v4H14zm2-6h8v2h-8z" fill="#fff" />
        <circle cx="20" cy="14" r="2.5" fill="#fff" />
      </g>
    ),
    GLD: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#D97706" />
        <path d="M20 8l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6l2-6z" fill="#fff" />
      </g>
    ),
    SLV: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#9CA3AF" />
        <path d="M20 10l-4 10h8L20 10zm0 12l-3 6h6l-3-6z" fill="#fff" />
      </g>
    ),
    OIL: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#92400E" />
        <path d="M14 22h12l-2-8h-8l-2 8zm4-10h4" stroke="#fff" strokeWidth="2" fill="none" />
        <ellipse cx="20" cy="24" rx="4" ry="1.5" fill="#fff" opacity="0.8" />
      </g>
    ),
    FX: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#2563EB" />
        <path d="M12 18h6l2-4 2 8 2-4h6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    ),
    ETF: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#16A34A" />
        <path d="M12 26V14h3v12h-3zm5-6v6h3v-6h-3zm5-4v10h3V16h-3zm5-2v12h3V14h-3z" fill="#fff" />
      </g>
    ),
    HED: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#1D4ED8" />
        <path d="M12 20h16M20 12v16M14 14l6 6 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    ),
    WEB3: (
      <g>
        <circle cx="20" cy="20" r="20" fill="#10B981" />
        <path d="M12 20l8-8 8 8-8 8-8-8zm8-4l4 4-4 4-4-4 4-4z" fill="#fff" opacity="0.9" />
        <circle cx="20" cy="20" r="2" fill="#fff" />
      </g>
    ),
  }

  const logo = logos[key]
  if (logo) {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={symbol}>
        {logo}
      </svg>
    )
  }

  const display = key.slice(0, 2)
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={symbol}>
      <circle cx="20" cy="20" r="20" fill={bgColor} />
      <text
        x="50%"
        y="52%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.45}
        fontWeight="700"
        fill="#fff"
        style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
      >
        {display}
      </text>
    </svg>
  )
}
