'use client'

import { memo } from 'react'

const TradingViewTicker = memo(function TradingViewTicker() {
  return (
    <div style={{ width: '100%', overflow: 'hidden', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
      <div
        dangerouslySetInnerHTML={{
          __html: `
<!-- TradingView Widget BEGIN -->
<div class="tradingview-widget-container">
  <div class="tradingview-widget-container__widget"></div>
  <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js" async>
  {
    "symbols": [
      {"description": "BTC", "proName": "COINBASE:BTCUSD"},
      {"description": "ETH", "proName": "COINBASE:ETHUSD"},
      {"description": "SOL", "proName": "COINBASE:SOLUSD"},
      {"description": "XRP", "proName": "COINBASE:XRPUSD"},
      {"description": "BNB", "proName": "BINANCE:BNBUSDT"},
      {"description": "DOGE", "proName": "COINBASE:DOGEUSD"},
      {"description": "S&P 500", "proName": "SP:SPX"},
      {"description": "NASDAQ", "proName": "NASDAQ:NDX"},
      {"description": "GOLD", "proName": "TVC:GOLD"},
      {"description": "EUR/USD", "proName": "FX:EURUSD"}
    ],
    "showSymbolLogo": true,
    "isTransparent": true,
    "displayMode": "compact",
    "colorTheme": "dark",
    "locale": "en"
  }
  </script>
</div>
<!-- TradingView Widget END -->`,
        }}
      />
    </div>
  )
})

export default TradingViewTicker
