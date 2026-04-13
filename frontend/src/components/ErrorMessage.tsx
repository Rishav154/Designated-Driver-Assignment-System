'use client'
import { AlertCircle } from 'lucide-react'

interface ErrorMessageProps {
  message: string
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="flex items-start gap-3 border border-red-200 bg-red-50 rounded-xl p-4">
      <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={18} />
      <p className="text-sm text-red-700">{message}</p>
    </div>
  )
}
