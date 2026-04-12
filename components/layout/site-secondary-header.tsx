import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SiteSecondaryHeaderProps {
  children?: ReactNode
  className?: string
}

export function SiteSecondaryHeader({
  children,
  className,
}: SiteSecondaryHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-12.25 z-30 flex min-h-10 shrink-0 items-center border-b border-border bg-background px-3 py-1.5',
        className
      )}
    >
      <div className="flex w-full min-w-0 flex-1 items-center gap-2">
        {children}
      </div>
    </header>
  )
}
