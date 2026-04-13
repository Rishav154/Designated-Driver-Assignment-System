'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Car, Shield, MapPin, Star, Clock, CheckCircle2, ArrowRight, ChevronDown } from 'lucide-react'
import { useAuth, useUser } from '@clerk/nextjs'
import { getApi } from '@/lib/api'
import { ThemeToggle } from '@/components/ThemeToggle'

/* ─── animation helpers ─────────────────────────────────────── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: 'easeOut' as const, delay },
})

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
}


/* ─── data ───────────────────────────────────────────────────── */
const steps = [
  {
    num: '01',
    icon: MapPin,
    title: 'Set Your Pickup',
    desc: 'Tell us where you are and where you need to go.',
  },
  {
    num: '02',
    icon: Car,
    title: 'Driver Arrives',
    desc: 'A vetted professional driver comes to your location and takes the wheel of your car.',
  },
  {
    num: '03',
    icon: Shield,
    title: 'You Arrive Safely',
    desc: 'You and your vehicle reach your destination — no parking worries, no transit hassle.',
  },
]

const features = [
  {
    icon: CheckCircle2,
    title: 'Background-Checked Drivers',
    desc: 'Every driver on SafeRide passes rigorous background checks and driver training.',
  },
  {
    icon: Clock,
    title: 'Available When You Need It',
    desc: 'Book ahead or on-demand — our drivers are ready around the clock.',
  },
  {
    icon: Star,
    title: 'Rated & Reviewed',
    desc: 'Transparent ratings let you choose a driver you can trust, every time.',
  },
  {
    icon: Shield,
    title: 'Your Car, Our Expertise',
    desc: 'No rentals, no fleet. We drive your car so you never lose track of it.',
  },
]

const stats = [
  { value: '10K+', label: 'Rides completed' },
  { value: '4.9★', label: 'Average rating' },
  { value: '24/7', label: 'Service availability' },
  { value: '100%', label: 'Background checked' },
]

/* ─── component ──────────────────────────────────────────────── */
export default function LandingPage() {
  const { isLoaded, isSignedIn } = useUser()
  const { getToken } = useAuth()
  const [getStartedHref, setGetStartedHref] = useState('/sign-up')
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      getApi(getToken)
        .then((api) => api.get('/api/auth/me'))
        .then((res) => {
          if (!res.data) setGetStartedHref('/onboarding')
          else if (res.data.role === 'DRIVER') setGetStartedHref('/driver/dashboard')
          else setGetStartedHref('/dashboard')
        })
        .catch(() => setGetStartedHref('/onboarding'))
    }
  }, [isLoaded, isSignedIn, getToken])

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── Navbar ──────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 md:px-12 transition-all duration-300
          ${scrolled
            ? 'bg-background/90 backdrop-blur-md border-b border-border shadow-sm'
            : 'bg-transparent'}
        `}
      >
        <span className="text-xl font-black tracking-tight select-none text-foreground">
          Safe<span className="text-emerald-500">Ride</span>
        </span>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/sign-in"
            className="text-sm font-semibold text-foreground/70 hover:text-foreground transition-colors duration-150 px-3 py-2 rounded-xl hover:bg-foreground/5"
          >
            Sign In
          </Link>
          <Link
            href={getStartedHref}
            className="text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-2 rounded-xl transition-colors duration-150 active:scale-95"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-16 overflow-hidden">
        {/* Background grid + radial glow */}
        <div className="pointer-events-none absolute inset-0">
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07]"
            style={{
              backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px),
                linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
          {/* Green radial glow */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 blur-3xl" />
        </div>

        <div className="text-center max-w-5xl mx-auto relative z-10">
          <motion.div {...fadeUp(0)} className="mb-5">
            <span className="inline-flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Designated Driver Service
            </span>
          </motion.div>

          <motion.h1
            {...fadeUp(0.1)}
            className="text-6xl sm:text-7xl md:text-[96px] font-black tracking-tighter leading-[0.93] mb-7 text-foreground"
          >
            Our driver.
            <br />
            <span className="text-emerald-500">Your</span> car.
          </motion.h1>

          <motion.p
            {...fadeUp(0.2)}
            className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed"
          >
            Book a professional driver to take you and your vehicle safely to your destination — no parking stress, no transit.
          </motion.p>

          <motion.div
            {...fadeUp(0.3)}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link
              href={getStartedHref}
              className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-3.5 rounded-xl active:scale-95 transition-all duration-150 text-sm shadow-lg shadow-emerald-500/20"
            >
              Book a Ride
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center gap-2 border border-border text-foreground font-semibold px-8 py-3.5 rounded-xl hover:bg-foreground/5 active:scale-95 transition-all duration-150 text-sm"
            >
              Sign In
            </Link>
          </motion.div>

          {/* Scroll hint */}
          <motion.div
            {...fadeUp(0.5)}
            className="mt-16 flex flex-col items-center gap-1 text-muted-foreground/50 text-xs select-none"
          >
            <span className="uppercase tracking-widest font-medium">Scroll</span>
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            >
              <ChevronDown size={16} />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats Bar ───────────────────────────────────────────── */}
      <section className="border-y border-border bg-card">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4"
        >
          {stats.map((s, i) => (
            <motion.div
              key={i}
              variants={item}
              className={`flex flex-col items-center justify-center py-10 px-6
                ${i < stats.length - 1 ? 'border-r border-border' : ''}
              `}
            >
              <p className="text-3xl md:text-4xl font-black text-foreground mb-1">{s.value}</p>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── How It Works ────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">Three simple steps</h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
          >
            {steps.map((s) => {
              const Icon = s.icon
              return (
                <motion.div
                  key={s.num}
                  variants={item}
                  className="group relative bg-card border border-border rounded-2xl p-8 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300"
                >
                  {/* Step number watermark */}
                  <p className="absolute top-6 right-7 text-5xl font-black text-foreground/5 select-none">{s.num}</p>

                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-5 group-hover:bg-emerald-500/20 transition-colors duration-200">
                    <Icon className="text-emerald-500" size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{s.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Features / Why SafeRide ──────────────────────────────── */}
      <section className="py-28 px-6 bg-card border-y border-border">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-3">Why SafeRide</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">Built around your safety</h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-5"
          >
            {features.map((f) => {
              const Icon = f.icon
              return (
                <motion.div
                  key={f.title}
                  variants={item}
                  className="flex gap-5 bg-background border border-border rounded-2xl p-7 hover:border-emerald-500/40 hover:shadow-md hover:shadow-emerald-500/5 transition-all duration-300"
                >
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Icon className="text-emerald-500" size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-1.5">{f.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden">
        {/* Background accent */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-emerald-500/8 dark:bg-emerald-500/12 blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center relative z-10"
        >
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-5">
            Ready for a safer ride?
          </h2>
          <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
            Join thousands of riders who trust SafeRide to get home safely — with their car.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={getStartedHref}
              className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-10 py-4 rounded-xl active:scale-95 transition-all duration-150 text-sm shadow-lg shadow-emerald-500/20"
            >
              Get Started — It&apos;s Free
              <ArrowRight size={16} />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-xl font-black tracking-tight select-none text-foreground">
            Safe<span className="text-emerald-500">Ride</span>
          </span>
          <p className="text-muted-foreground text-sm">© 2025 SafeRide. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/sign-in" className="hover:text-foreground transition-colors duration-150">Sign In</Link>
            <Link href="/sign-up" className="hover:text-foreground transition-colors duration-150">Sign Up</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
