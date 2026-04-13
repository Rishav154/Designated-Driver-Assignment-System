'use client'
import { motion } from 'framer-motion'

export default function LoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50"
    >
      <p className="text-2xl font-bold text-black tracking-tight mb-6">SafeRide</p>
      <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
    </motion.div>
  )
}
