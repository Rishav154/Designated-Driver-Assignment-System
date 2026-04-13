'use client'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number
  onChange: (n: number) => void
}

export default function StarRating({ value, onChange }: StarRatingProps) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          className="focus:outline-none"
        >
          <Star
            size={40}
            className={`transition-colors duration-150 ${
              n <= value ? 'fill-yellow-400 text-yellow-400' : 'fill-none text-muted'
            }`}
          />
        </motion.button>
      ))}
    </div>
  )
}
