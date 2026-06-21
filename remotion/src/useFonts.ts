import { useEffect, useState } from 'react'
import { continueRender, delayRender } from 'remotion'
import { FONTS_HREF } from './theme'

// Blocks the render until Fraunces + Schibsted Grotesk are ready.
export function useFonts() {
  const [handle] = useState(() => delayRender('fonts'))
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONTS_HREF
    link.onload = () => {
      // @ts-ignore
      const ready = (document as any).fonts?.ready ?? Promise.resolve()
      ready.then(() => continueRender(handle))
    }
    link.onerror = () => continueRender(handle)
    document.head.appendChild(link)
  }, [handle])
}
