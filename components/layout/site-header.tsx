import type { ReactNode } from 'react'
import { SidebarTrigger } from '@/components/ui/sidebar'

interface SiteHeaderProps {
  title: string
  children?: ReactNode
}

export function SiteHeader({ title, children }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-12.25 shrink-0 items-center gap-2 border-b border-border bg-background">
      <div className="flex flex-1 items-center gap-2 px-3">
        <SidebarTrigger />
        <h1 className="text-sm font-medium">{title}</h1>
        {children}
      </div>
    </header>
  )
}