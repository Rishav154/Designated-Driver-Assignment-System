'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Car, MapPin, Clock, User } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'

const navItems = [
  { href: '/dashboard', label: 'Book Ride', icon: Car },
  { href: '/trips', label: 'Trips', icon: Clock },
  { href: '/locations', label: 'Locations', icon: MapPin },
  { href: '/profile', label: 'Profile', icon: User },
]

export default function Navbar() {
  const path = usePathname()
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/95 backdrop-blur-sm border-b border-gray-100 flex items-center justify-between px-6 gap-4">
      <Link href="/dashboard" className="text-xl font-black text-black tracking-tight select-none shrink-0">
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
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          )
        })}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <NotificationBell />
        <UserButton />
      </div>
    </nav>
  )
}
