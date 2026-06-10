// Single source of truth for investment plan generation.
// Plans are derived server-side from each asset's live base rate and
// attached to the /api/markets/live response — the frontend only renders
// what the API returns.

export type InvestmentPlan = {
  id: string
  label: string
  days: number
  daily: number          // daily return in percent, e.g. 0.85
  totalReturnPct: number // daily * days, e.g. 25.5
  min: number            // minimum investment in USD
  badge?: string
}

type PlanTemplate = { label: string; days: number; rateMul: number; minMul: number; badge?: string }

const TEMPLATES: Record<string, PlanTemplate[]> = {
  Crypto: [
    { label: 'Flash',     days: 7,   rateMul: 0.80, minMul: 1                      },
    { label: 'Sprint',    days: 14,  rateMul: 0.88, minMul: 2                      },
    { label: 'Standard',  days: 30,  rateMul: 1.00, minMul: 3                      },
    { label: 'Pro',       days: 90,  rateMul: 1.12, minMul: 5,  badge: 'Popular'   },
    { label: 'Apex',      days: 180, rateMul: 1.22, minMul: 10, badge: 'Best ROI'  },
  ],
  Stocks: [
    { label: 'Starter',   days: 30,  rateMul: 1.00, minMul: 1                      },
    { label: 'Growth',    days: 60,  rateMul: 1.06, minMul: 2                      },
    { label: 'Premium',   days: 90,  rateMul: 1.14, minMul: 3,  badge: 'Popular'   },
    { label: 'Prime',     days: 180, rateMul: 1.24, minMul: 5                      },
    { label: 'Elite',     days: 365, rateMul: 1.38, minMul: 10, badge: 'Best ROI'  },
  ],
  DeFi: [
    { label: 'Yield',     days: 7,   rateMul: 0.88, minMul: 1,  badge: 'Flexible'  },
    { label: 'Boost',     days: 14,  rateMul: 1.00, minMul: 2                      },
    { label: 'Vault',     days: 30,  rateMul: 1.15, minMul: 3,  badge: 'Popular'   },
  ],
  Forex: [
    { label: 'Trade',     days: 30,  rateMul: 1.00, minMul: 1                      },
    { label: 'Leverage',  days: 60,  rateMul: 1.10, minMul: 3                      },
    { label: 'Compound',  days: 90,  rateMul: 1.22, minMul: 6,  badge: 'Popular'   },
  ],
  Bonds: [
    { label: 'Secure',    days: 90,  rateMul: 1.00, minMul: 1                      },
    { label: 'Shield',    days: 180, rateMul: 1.14, minMul: 2,  badge: 'Popular'   },
    { label: 'Sovereign', days: 365, rateMul: 1.28, minMul: 5,  badge: 'Best ROI'  },
  ],
  Commodities: [
    { label: 'Spot',      days: 30,  rateMul: 1.00, minMul: 1                      },
    { label: 'Futures',   days: 60,  rateMul: 1.08, minMul: 2                      },
    { label: 'Hedge',     days: 90,  rateMul: 1.16, minMul: 3,  badge: 'Popular'   },
    { label: 'Position',  days: 120, rateMul: 1.24, minMul: 5,  badge: 'Best ROI'  },
  ],
}

const DEFAULT_TEMPLATES: PlanTemplate[] = [
  { label: '30 Day',  days: 30,  rateMul: 1.00, minMul: 1                     },
  { label: '90 Day',  days: 90,  rateMul: 1.10, minMul: 3, badge: 'Popular'   },
  { label: '180 Day', days: 180, rateMul: 1.20, minMul: 5, badge: 'Best ROI'  },
]

export function buildPlans(
  assetId: string,
  category: string,
  baseDaily: number,
  minInvestment: number
): InvestmentPlan[] {
  const templates = TEMPLATES[category] ?? DEFAULT_TEMPLATES
  return templates.map(t => {
    const daily = +(baseDaily * t.rateMul).toFixed(2)
    return {
      id: `${assetId}-${t.days}d`,
      label: t.label,
      days: t.days,
      daily,
      totalReturnPct: +(daily * t.days).toFixed(1),
      min: minInvestment * t.minMul,
      badge: t.badge,
    }
  })
}
