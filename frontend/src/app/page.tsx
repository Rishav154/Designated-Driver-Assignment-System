'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Car, Shield, MapPin } from 'lucide-react'
import { useAuth, useUser } from '@clerk/nextjs'
import { getApi } from '@/lib/api'

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: 'easeOut', delay },
})

const cardVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const cardItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export default function LandingPage() {
  const { isLoaded, isSignedIn } = useUser()
  const { getToken } = useAuth()
  const [getStartedHref, setGetStartedHref] = useState('/sign-up')

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      getApi(getToken)
        .then((api) => api.get('/api/auth/me'))
        .then((res) => {
          if (!res.data) {
            setGetStartedHref('/onboarding')
          } else if (res.data.role === 'DRIVER') {
            setGetStartedHref('/driver/dashboard')
          } else {
            setGetStartedHref('/dashboard')
          }
        })
        .catch(() => {
          setGetStartedHref('/onboarding')
        })
    }
  }, [isLoaded, isSignedIn, getToken])

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-black flex items-center justify-between px-6 md:px-12">
        <span className="text-xl font-bold text-white tracking-tight select-none">SafeRide</span>
        <Link
          href="/sign-in"
          className="border border-white/40 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-white/10 transition-colors duration-150"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <section className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="text-center max-w-4xl mx-auto pt-16">
          <motion.div {...fadeUp(0)} className="mb-6">
            <span className="inline-block border border-white/20 text-white/70 text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-widest">
              Designated Driver Service
            </span>
          </motion.div>

          <motion.h1
            {...fadeUp(0.1)}
            className="text-6xl md:text-8xl font-black tracking-tighter text-white leading-none mb-6"
          >
            Our driver.<br />Your car.
          </motion.h1>

          <motion.p
            {...fadeUp(0.2)}
            className="text-lg md:text-xl text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Book a professional driver to take you and your vehicle safely to your destination.
          </motion.p>

          <motion.div {...fadeUp(0.3)} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={getStartedHref}
              className="bg-white text-black font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-100 active:scale-95 transition-all duration-150 text-sm"
            >
              Get Started
            </Link>
            <Link
              href="/sign-in"
              className="border-2 border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 active:scale-95 transition-all duration-150 text-sm"
            >
              Sign In
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest text-gray-400 text-center mb-12 uppercase">
            How It Works
          </p>
          <motion.div
            variants={cardVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              {
                num: '01',
                icon: <MapPin className="text-gray-400" size={20} />,
                title: 'We Come To You',
                desc: 'A professional driver arrives at your location ready to take the wheel.',
              },
              {
                num: '02',
                icon: <Car className="text-gray-400" size={20} />,
                title: 'In Your Vehicle',
                desc: 'Our driver operates your own car — no switching vehicles, no hassle.',
              },
              {
                num: '03',
                icon: <Shield className="text-gray-400" size={20} />,
                title: 'Safe Arrival',
                desc: 'You and your vehicle arrive at your destination safely.',
              },
            ].map((f) => (
              <motion.div
                key={f.num}
                variants={cardItem}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 hover:shadow-md transition-shadow duration-200"
              >
                <p className="text-4xl font-black text-gray-100 mb-4">{f.num}</p>
                <div className="mb-3">{f.icon}</div>
                <h3 className="text-lg font-bold text-black mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white/50 text-sm text-center py-8">
        SafeRide © 2025. All rights reserved.
      </footer>
    </div>
  )
}
