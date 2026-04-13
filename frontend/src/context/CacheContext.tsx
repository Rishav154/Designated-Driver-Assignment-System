'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

interface CacheContextType {
  cache: Record<string, any>
  setCache: (key: string, data: any) => void
  getCache: (key: string) => any
  invalidateCache: (key?: string) => void
}

const CacheContext = createContext<CacheContextType | undefined>(undefined)

export function CacheProvider({ children }: { children: React.ReactNode }) {
  const [cache, setInternalCache] = useState<Record<string, any>>({})

  const setCache = useCallback((key: string, data: any) => {
    setInternalCache((prev) => ({ ...prev, [key]: data }))
  }, [])

  const getCache = useCallback((key: string) => {
    return cache[key]
  }, [cache])

  const invalidateCache = useCallback((key?: string) => {
    if (key) {
      setInternalCache((prev) => {
        const newCache = { ...prev }
        delete newCache[key]
        return newCache
      })
    } else {
      setInternalCache({})
    }
  }, [])

  return (
    <CacheContext.Provider value={{ cache, setCache, getCache, invalidateCache }}>
      {children}
    </CacheContext.Provider>
  )
}

export function useCache() {
  const context = useContext(CacheContext)
  if (context === undefined) {
    throw new Error('useCache must be used within a CacheProvider')
  }
  return context
}
