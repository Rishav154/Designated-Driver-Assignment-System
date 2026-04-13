'use client'

interface StatusBadgeProps {
  status: string
}

const statusMap: Record<string, string> = {
  SEARCHING: 'bg-amber-50 text-amber-700 border border-amber-200',
  DRIVER_ASSIGNED: 'bg-blue-50 text-blue-700 border border-blue-200',
  IN_PROGRESS: 'bg-green-50 text-green-700 border border-green-200',
  COMPLETED: 'bg-gray-100 text-gray-600 border border-gray-200',
  CANCELLED: 'bg-red-50 text-red-700 border border-red-200',
}

const labelMap: Record<string, string> = {
  SEARCHING: 'Searching',
  DRIVER_ASSIGNED: 'Driver Assigned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const classes = statusMap[status] ?? 'bg-gray-100 text-gray-600 border border-gray-200'
  const label = labelMap[status] ?? status
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full inline-block ${classes}`}>
      {label}
    </span>
  )
}
