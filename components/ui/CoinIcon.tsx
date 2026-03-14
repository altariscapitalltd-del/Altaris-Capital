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
  const display = (label || symbol || '').toString().toUpperCase().slice(0, 2)
  const bgColor = bg || '#262626'
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
