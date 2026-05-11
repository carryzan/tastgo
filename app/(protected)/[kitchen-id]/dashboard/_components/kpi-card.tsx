import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  className?: string
}

export function KpiCard({ label, value, hint, icon: Icon, className }: KpiCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card p-4 flex flex-col gap-2',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {Icon ? (
          <Icon className="h-4 w-4 text-muted-foreground" />
        ) : null}
      </div>
      <div className="text-2xl font-semibold tabular-nums leading-none">{value}</div>
      {hint ? <div className="text-sm text-muted-foreground">{hint}</div> : null}
    </div>
  )
}
