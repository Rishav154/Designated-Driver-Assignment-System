'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Car, MapPin, Clock, User } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getApi } from '@/lib/api'
import { ThemeToggle } from '@/components/ThemeToggle'

const navItems = [
  { href: '/dashboard', label: 'Book Ride', icon: Car },
  { href: '/trips', label: 'Trips', icon: Clock },
  { href: '/locations', label: 'Locations', icon: MapPin },
  { href: '/profile', label: 'Profile', icon: User },
]

export default function Navbar() {
  const path = usePathname()
  const { getToken } = useAuth()
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    getApi(getToken)
      .then((api) => api.get('/api/auth/me'))
      .then((res) => setRole(res.data?.role))
      .catch(() => {})
  }, [getToken])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-background/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-6 gap-4 transition-colors duration-300">
      <Link href="/dashboard" className="text-xl font-black text-foreground tracking-tight select-none shrink-0">
        SafeRide
      </Link>

      <div className="flex items-center gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150
                ${active
                  ? 'bg-foreground text-background'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-foreground'}`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">
                {href === '/dashboard' && role === 'DRIVER' ? 'Take Ride' : label}
              </span>
            </Link>
          )
        })}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <ThemeToggle />
        <NotificationBell />
        <UserButton />
      </div>
    </nav>
  )
}
