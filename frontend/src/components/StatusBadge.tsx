'use client'

interface StatusBadgeProps {
  status: string
}

const statusMap: Record<string, string> = {
  SEARCHING: 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20',
  DRIVER_ASSIGNED: 'bg-blue-500/10 text-blue-600 dark:text-blue-500 border border-blue-500/20',
  IN_PROGRESS: 'bg-green-500/10 text-green-600 dark:text-green-500 border border-green-500/20',
  COMPLETED: 'bg-muted text-muted-foreground border border-border',
  CANCELLED: 'bg-red-500/10 text-red-600 dark:text-red-500 border border-red-500/20',
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
