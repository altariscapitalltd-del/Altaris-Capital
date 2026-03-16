import { useEffect } from 'react'

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!active) return

    const scrollY = window.scrollY || document.documentElement.scrollTop || 0

    const original = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    }

    // iOS Safari often ignores overflow:hidden for touch scrolling; fixed-body is more reliable.
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'

    return () => {
      document.body.style.overflow = original.overflow
      document.body.style.position = original.position
      document.body.style.top = original.top
      document.body.style.width = original.width

      window.scrollTo(0, scrollY)
    }
  }, [active])
}

