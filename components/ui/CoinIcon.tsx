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
