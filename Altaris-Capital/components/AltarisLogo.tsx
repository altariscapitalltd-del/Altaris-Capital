// Altaris Capital — Official SVG Logo Component
// Matches the brand image: stylised gold "A" with inner notch/chevron

interface AltarisLogoProps {
  size?: number
  /** 'icon' = A mark only | 'full' = A + "ALTARIS CAPITAL" text */
  variant?: 'icon' | 'full' | 'nav'
  className?: string
}

export function AltarisLogoMark({ size = 40 }: { size?: number }) {
  // The "A" with distinctive notch — derived from the brand image
  // Path: peak → bottom-right-outer → notch-right → notch-apex → notch-left → bottom-left-outer
  const s = size
  const cx = s / 2

  // Key coordinates (proportional to size)
  const peak  = { x: cx,           y: s * 0.05  }  // top tip
  const brOut = { x: s * 0.97,     y: s * 0.95  }  // bottom-right outer leg
  const nrIn  = { x: s * 0.645,    y: s * 0.95  }  // notch inner-right
  const nApex = { x: cx,           y: s * 0.525 }  // notch apex (inner peak up)
  const nlIn  = { x: s * 0.355,    y: s * 0.95  }  // notch inner-left
  const blOut = { x: s * 0.03,     y: s * 0.95  }  // bottom-left outer leg

  const d = [
    `M ${peak.x}  ${peak.y}`,
    `L ${brOut.x} ${brOut.y}`,
    `L ${nrIn.x}  ${nrIn.y}`,
    `L ${nApex.x} ${nApex.y}`,
    `L ${nlIn.x}  ${nlIn.y}`,
    `L ${blOut.x} ${blOut.y}`,
    `Z`,
  ].join(' ')

  const gradId = `ag_${size}`

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${s} ${s}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Altaris Capital"
    >
      <defs>
        <linearGradient id={gradId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%"   stopColor="#FFD23A" />
          <stop offset="45%"  stopColor="#F2BA0E" />
          <stop offset="100%" stopColor="#C8880A" />
        </linearGradient>
      </defs>
      <path d={d} fill={`url(#${gradId})`} />
    </svg>
  )
}

export function AltarisLogoFull({ height = 36 }: { height?: number }) {
  const iconH = height
  const iconW = iconH

  const cx = iconW / 2
  const s  = iconW

  const peak  = { x: cx,        y: s * 0.05  }
  const brOut = { x: s * 0.97,  y: s * 0.95  }
  const nrIn  = { x: s * 0.645, y: s * 0.95  }
  const nApex = { x: cx,        y: s * 0.525 }
  const nlIn  = { x: s * 0.355, y: s * 0.95  }
  const blOut = { x: s * 0.03,  y: s * 0.95  }

  const d = [
    `M ${peak.x}  ${peak.y}`,
    `L ${brOut.x} ${brOut.y}`,
    `L ${nrIn.x}  ${nrIn.y}`,
    `L ${nApex.x} ${nApex.y}`,
    `L ${nlIn.x}  ${nlIn.y}`,
    `L ${blOut.x} ${blOut.y}`,
    `Z`,
  ].join(' ')

  const totalW = iconW + 10 + 120 // icon + gap + text
  const totalH = iconH

  return (
    <svg
      width={totalW}
      height={totalH}
      viewBox={`0 0 ${totalW} ${totalH}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="agFull" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%"   stopColor="#FFD23A" />
          <stop offset="45%"  stopColor="#F2BA0E" />
          <stop offset="100%" stopColor="#C8880A" />
        </linearGradient>
      </defs>
      {/* A mark */}
      <path d={d} fill="url(#agFull)" />
      {/* Text: ALTARIS */}
      <text
        x={iconW + 10}
        y={iconH * 0.62}
        fontFamily="Inter, -apple-system, sans-serif"
        fontWeight="800"
        fontSize={iconH * 0.48}
        letterSpacing="0.08em"
        fill="#FFFFFF"
      >
        ALTARIS
      </text>
      {/* Text: CAPITAL */}
      <text
        x={iconW + 10}
        y={iconH * 0.98}
        fontFamily="Inter, -apple-system, sans-serif"
        fontWeight="400"
        fontSize={iconH * 0.3}
        letterSpacing="0.16em"
        fill="#888888"
      >
        CAPITAL
      </text>
    </svg>
  )
}

export default AltarisLogoMark
