'use client'
import { createContext, useContext, useEffect } from 'react'

const ThemeContext = createContext<{ theme: 'dark'; resolved: 'dark'; setTheme: (t: 'dark') => void }>({
  theme: 'dark',
  resolved: 'dark',
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  }, [])

  return (
    <ThemeContext.Provider value={{ theme: 'dark', resolved: 'dark', setTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
