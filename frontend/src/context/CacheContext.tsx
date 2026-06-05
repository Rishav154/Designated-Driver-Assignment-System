'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'

interface CacheContextType {
  cache: Record<string, any>
  setCache: (key: string, data: any) => void
  getCache: (key: string) => any
  invalidateCache: (key?: string) => void
}

const CacheContext = createContext<CacheContextType | undefined>(undefined)

export function CacheProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth()
  const [cache, setInternalCache] = useState<Record<string, any>>({})

  // Initialize cache from localStorage after mount to avoid Next.js hydration mismatches
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedUserId = localStorage.getItem('sr_cache_uid')
        if (userId && storedUserId === userId) {
          const stored = localStorage.getItem('sr_cache')
          if (stored) {
            setInternalCache(JSON.parse(stored))
          }
        }
      } catch (e) {
        console.error('Error loading cache from localStorage', e)
      }
    }
  }, [userId])

  // Sync cache with current userId
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (userId) {
          const storedUserId = localStorage.getItem('sr_cache_uid')
          if (storedUserId !== userId) {
            localStorage.removeItem('sr_cache')
            localStorage.setItem('sr_cache_uid', userId)
            setInternalCache({})
          }
        } else {
          localStorage.removeItem('sr_cache')
          localStorage.removeItem('sr_cache_uid')
          setInternalCache({})
        }
      } catch (e) {
        console.error('Error syncing cache user ID', e)
      }
    }
  }, [userId])

  const setCache = useCallback((key: string, data: any) => {
    setInternalCache((prev) => {
      const updated = { ...prev, [key]: data }
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('sr_cache', JSON.stringify(updated))
        } catch (e) {
          console.error('Error writing to cache', e)
        }
      }
      return updated
    })
  }, [])

  const getCache = useCallback((key: string) => {
    if (Object.keys(cache).length === 0 && typeof window !== 'undefined') {
      try {
        const storedUserId = localStorage.getItem('sr_cache_uid')
        if (userId && storedUserId === userId) {
          const stored = localStorage.getItem('sr_cache')
          if (stored) {
            const parsed = JSON.parse(stored)
            return parsed[key]
          }
        }
      } catch {}
    }
    return cache[key]
  }, [cache, userId])

  const invalidateCache = useCallback((key?: string) => {
    if (key) {
      setInternalCache((prev) => {
        const newCache = { ...prev }
        delete newCache[key]
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('sr_cache', JSON.stringify(newCache))
          } catch (e) {
            console.error('Error invalidating cache key', e)
          }
        }
        return newCache
      })
    } else {
      setInternalCache({})
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('sr_cache')
        } catch (e) {
          console.error('Error clearing cache', e)
        }
      }
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
