const PROFIT_DELAY_MS = 24 * 60 * 60 * 1000

export function calcInvestmentState(inv: {
  amount: number
  dailyRoi: number
  startDate: Date | string
  endDate: Date | string
  status: string
  totalEarned?: number
}) {
  const now = Date.now()
  const startMs = new Date(inv.startDate).getTime()
  const endMs = new Date(inv.endDate).getTime()
  const profitStartMs = startMs + PROFIT_DELAY_MS
  const totalDurationDays = Math.max(1, (endMs - startMs) / 86400000)

  if (inv.status === 'COMPLETED') {
    const totalEarned = Number(inv.totalEarned || 0)
    return {
      profitEarned: Number(totalEarned.toFixed(2)),
      totalValue: Number((inv.amount + totalEarned).toFixed(2)),
      dailyProfit: Number((inv.dailyRoi * inv.amount).toFixed(2)),
      hasStartedEarning: true,
      hoursUntilProfit: 0,
      daysRemaining: 0,
      progressPct: 100,
      totalDurationDays: Number(totalDurationDays.toFixed(0)),
    }
  }

  const hasStartedEarning = now >= profitStartMs
  const msUntilProfit = Math.max(0, profitStartMs - now)
  const hoursUntilProfit = Math.ceil(msUntilProfit / 3600000)
  const earningMs = hasStartedEarning ? now - profitStartMs : 0
  const daysEarning = Math.min(earningMs / 86400000, totalDurationDays)
  const profitEarned = daysEarning * inv.dailyRoi * inv.amount
  const daysRemaining = Math.max(0, (endMs - now) / 86400000)
  const daysElapsed = Math.min((now - startMs) / 86400000, totalDurationDays)
  const progressPct = Math.min(100, (daysElapsed / totalDurationDays) * 100)

  return {
    profitEarned: Number(profitEarned.toFixed(2)),
    totalValue: Number((inv.amount + profitEarned).toFixed(2)),
    dailyProfit: Number((inv.dailyRoi * inv.amount).toFixed(2)),
    hasStartedEarning,
    hoursUntilProfit,
    daysRemaining: Number(daysRemaining.toFixed(1)),
    progressPct: Number(progressPct.toFixed(1)),
    totalDurationDays: Number(totalDurationDays.toFixed(0)),
  }
}

export function calcInvestmentSummary(investments: Array<ReturnType<typeof calcInvestmentState> & { amount: number; status: string }>) {
  const active = investments.filter((i) => i.status === 'ACTIVE')
  return {
    totalInvested: active.reduce((s, i) => s + i.amount, 0),
    totalProfit: active.reduce((s, i) => s + i.profitEarned, 0),
    totalValue: active.reduce((s, i) => s + i.totalValue, 0),
    dailyEarning: active.reduce((s, i) => s + i.dailyProfit, 0),
    activeCount: active.length,
  }
}
