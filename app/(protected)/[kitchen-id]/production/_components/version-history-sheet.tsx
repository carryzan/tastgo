'use client'

import { useState, useCallback } from 'react'
import { HistoryIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Recipe } from './recipe-columns'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'

interface RecipeComponent {
  id: string
  recipe_quantity: string
  inventory_items?: { name: string } | { name: string }[] | null
  units_of_measure?: { abbreviation: string } | { abbreviation: string }[] | null
}

function firstRelation<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null
  return Array.isArray(rel) ? (rel[0] ?? null) : rel
}

interface VersionHistorySheetProps {
  recipe: Recipe
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VersionHistorySheet({
  recipe,
  open,
  onOpenChange,
}: VersionHistorySheetProps) {
  const [openValues, setOpenValues] = useState<string[]>([])
  const [componentsByVersion, setComponentsByVersion] = useState<
    Record<string, RecipeComponent[] | 'loading'>
  >({})

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setOpenValues([])
        setComponentsByVersion({})
      }
      onOpenChange(next)
    },
    [onOpenChange]
  )

  function handleAccordionChange(values: string[]) {
    setOpenValues(values)
    for (const versionId of values) {
      if (!componentsByVersion[versionId]) {
        fetchVersionComponents(versionId)
      }
    }
  }

  async function fetchVersionComponents(versionId: string) {
    setComponentsByVersion((prev) => ({ ...prev, [versionId]: 'loading' }))
    const supabase = createClient()
    const { data } = await supabase
      .from('production_recipe_components')
      .select('id, recipe_quantity, inventory_items(name), units_of_measure(abbreviation)')
      .eq('recipe_version_id', versionId)
    setComponentsByVersion((prev) => ({
      ...prev,
      [versionId]: (data ?? []) satisfies RecipeComponent[],
    }))
  }

  const versions = [...recipe.production_recipe_versions].sort(
    (a, b) => b.version_number - a.version_number
  )

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Version History</SheetTitle>
          <SheetDescription>
            {versions.length === 0
              ? `${recipe.name} has no versions yet.`
              : `${recipe.name} has ${versions.length} version${versions.length !== 1 ? 's' : ''}.`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-y-auto px-4">
          {versions.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="rounded-full bg-muted p-3">
                <HistoryIcon className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No versions yet</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Use New Version from the recipe menu to create the first version.
                </p>
              </div>
            </div>
          ) : (
            <Accordion
              type="multiple"
              value={openValues}
              onValueChange={handleAccordionChange}
            >
              {versions.map((v) => {
                const comps = componentsByVersion[v.id]

                return (
                  <AccordionItem key={v.id} value={v.id}>
                    <AccordionTrigger>
                      Version {v.version_number}
                    </AccordionTrigger>
                    <AccordionContent className="h-auto pt-1">
                      {comps === undefined || comps === 'loading' ? (
                        <div className="rounded-lg overflow-hidden">
                          <Skeleton className="h-12 w-full rounded-none" />
                        </div>
                      ) : comps.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-1">
                          No components in this version.
                        </p>
                      ) : (
                        <div className="rounded-lg border overflow-hidden">
                          <table className="w-full table-fixed text-sm">
                            <colgroup>
                              <col />
                              <col className="w-20" />
                              <col className="w-16" />
                            </colgroup>
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="py-1.5 pl-3 pr-2 text-left font-medium text-muted-foreground">
                                  Ingredient
                                </th>
                                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                                  Qty
                                </th>
                                <th className="pl-2 pr-3 py-1.5 text-left font-medium text-muted-foreground">
                                  UOM
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {comps.map((c) => (
                                <tr key={c.id} className="border-b last:border-0">
                                  <td className="py-1.5 pl-3 pr-2">
                                    {firstRelation(c.inventory_items)?.name ?? '—'}
                                  </td>
                                  <td className="px-2 py-1.5">{c.recipe_quantity}</td>
                                  <td className="pl-2 pr-3 py-1.5">
                                    {firstRelation(c.units_of_measure)?.abbreviation ?? '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
