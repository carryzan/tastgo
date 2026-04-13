'use client'
import { useEffect, useRef, useState } from 'react'
import { SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ExpandableSearchProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function ExpandableSearch({ value, onChange, className }: ExpandableSearchProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      const root = rootRef.current
      if (!root || !(event.target instanceof Node) || root.contains(event.target)) return
      onChange('')
      setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open, onChange])

  function handleToggle() {
    if (open) {
      onChange('')
      setOpen(false)
      return
    }
    setOpen(true)
  }

  return (
    <div ref={rootRef} className={cn('flex min-w-0 items-center gap-1', className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Search"
        aria-expanded={open}
        className="text-muted-foreground shrink-0"
        onClick={handleToggle}
      >
        <SearchIcon />
      </Button>
      {open && (
        <Input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search"
          className={cn(
            'h-7 w-28 min-w-0 shrink border-0 bg-transparent dark:bg-background px-1 py-0 text-sm shadow-none ring-0 outline-none',
            'focus-visible:border-0 focus-visible:ring-0 md:text-sm'
          )}
        />
      )}
    </div>
  )
}