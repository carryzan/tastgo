'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Batch } from './batch-columns'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface BatchComponent {
  id: string
  theoretical_quantity: string
  actual_quantity: string | null
  inventory_items: { name: string } | { name: string }[] | null
}

function itemName(rel: BatchComponent['inventory_items']): string {
  if (!rel) return '—'
  return Array.isArray(rel) ? (rel[0]?.name ?? '—') : rel.name
}

interface BatchComponentsSheetProps {
  batch: Batch
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BatchComponentsSheet({
  batch,
  open,
  onOpenChange,
}: BatchComponentsSheetProps) {
  const [components, setComponents] = useState<BatchComponent[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setComponents(null)
      return
    }

    setLoading(true)
    const supabase = createClient()
    supabase
      .from('production_batch_components')
      .select('id, theoretical_quantity, actual_quantity, inventory_items(name)')
      .eq('production_batch_id', batch.id)
      .then(({ data }) => {
        setComponents((data ?? []) as BatchComponent[])
        setLoading(false)
      })
  }, [open, batch.id])

  const recipeName = batch.production_recipes?.name ?? 'Batch'
  const version = batch.production_recipe_versions
    ? `v${batch.production_recipe_versions.version_number}`
    : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {recipeName}
            {version ? ` — ${version}` : ''} Components
          </SheetTitle>
          <SheetDescription>
            Ingredient breakdown for this production batch.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4">
          {loading ? (
            <div className="space-y-2 pt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col />
                <col className="w-28" />
                <col className="w-28" />
              </colgroup>
              <thead className="sticky top-0 bg-popover">
                <tr className="border-b">
                  <th className="py-2 text-left font-medium text-muted-foreground">
                    Ingredient
                  </th>
                  <th className="px-2 py-2 text-right font-medium text-muted-foreground">
                    Theoretical
                  </th>
                  <th className="py-2 text-right font-medium text-muted-foreground">
                    Actual
                  </th>
                </tr>
              </thead>
              <tbody>
                {!components || components.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No components found.
                    </td>
                  </tr>
                ) : (
                  components.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="py-2">{itemName(c.inventory_items)}</td>
                      <td className="px-2 py-2 text-right">
                        {parseFloat(c.theoretical_quantity).toFixed(4)}
                      </td>
                      <td className="py-2 text-right">
                        {c.actual_quantity != null
                          ? parseFloat(c.actual_quantity).toFixed(4)
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
