'use client'

import type { CSSProperties, ReactNode } from 'react'
import { motion } from 'framer-motion'

type AnimatedPageProps = {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export default function AnimatedPage({ children, className, style }: AnimatedPageProps) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={className}
      style={style}
    >
      {children}
    </motion.main>
  )
}
