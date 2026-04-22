'use client'

import { useState } from 'react'
import { HistoryIcon } from 'lucide-react'
import type { MenuItem } from './menu-item-columns'
import {
  fetchRecipeVersionComponents,
  type MenuRecipeComponent,
} from '../_lib/client-queries'
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

function firstRelation<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null
  return Array.isArray(rel) ? (rel[0] ?? null) : rel
}

interface RecipeVersionHistorySheetProps {
  menuItem: MenuItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RecipeVersionHistorySheet({
  menuItem,
  open,
  onOpenChange,
}: RecipeVersionHistorySheetProps) {
  const [openValues, setOpenValues] = useState<string[]>([])
  const [componentsByVersion, setComponentsByVersion] = useState<
    Record<string, MenuRecipeComponent[] | 'loading'>
  >({})

  function handleAccordionChange(values: string[]) {
    setOpenValues(values)
    for (const versionId of values) {
      if (!componentsByVersion[versionId]) {
        void loadVersionComponents(versionId)
      }
    }
  }

  async function loadVersionComponents(versionId: string) {
    setComponentsByVersion((prev) => ({ ...prev, [versionId]: 'loading' }))
    try {
      const components = await fetchRecipeVersionComponents(versionId)
      setComponentsByVersion((prev) => ({
        ...prev,
        [versionId]: components,
      }))
    } catch {
      setComponentsByVersion((prev) => ({
        ...prev,
        [versionId]: [],
      }))
    }
  }

  const versions = [...menuItem.menu_item_recipe_versions].sort(
    (a, b) => b.version_number - a.version_number
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Version History</SheetTitle>
          <SheetDescription>
            {versions.length === 0
              ? `${menuItem.name} has no versions yet.`
              : `${menuItem.name} — ${versions.length} version${versions.length !== 1 ? 's' : ''}.`}
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
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Use New Version from the row menu to create the first recipe.
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
                        <div className="overflow-hidden rounded-lg">
                          <Skeleton className="h-12 w-full rounded-none" />
                        </div>
                      ) : comps.length === 0 ? (
                        <p className="py-1 text-sm text-muted-foreground">
                          No components in this version.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full min-w-[420px] text-sm">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="whitespace-nowrap py-1.5 pl-3 pr-2 text-left font-medium text-muted-foreground">
                                  Type
                                </th>
                                <th className="whitespace-nowrap px-2 py-1.5 text-left font-medium text-muted-foreground">
                                  Source
                                </th>
                                <th className="whitespace-nowrap px-2 py-1.5 text-left font-medium text-muted-foreground">
                                  Qty
                                </th>
                                <th className="whitespace-nowrap px-2 py-1.5 text-left font-medium text-muted-foreground">
                                  Yield qty
                                </th>
                                <th className="whitespace-nowrap py-1.5 pl-2 pr-3 text-left font-medium text-muted-foreground">
                                  UOM
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {comps.map((c) => {
                                const inv = firstRelation(c.inventory_items)
                                const pr = firstRelation(c.production_recipes)
                                const label =
                                  c.component_type === 'inventory_item'
                                    ? inv?.name ?? '—'
                                    : pr?.name ?? '—'
                                return (
                                  <tr key={c.id} className="border-b last:border-0">
                                    <td className="whitespace-nowrap py-1.5 pl-3 pr-2">
                                      {c.component_type === 'inventory_item'
                                        ? 'Inventory'
                                        : 'Production'}
                                    </td>
                                    <td className="px-2 py-1.5">{label}</td>
                                    <td className="whitespace-nowrap px-2 py-1.5">
                                      {c.recipe_quantity}
                                    </td>
                                    <td className="whitespace-nowrap px-2 py-1.5">
                                      {c.yield_adjusted_quantity}
                                    </td>
                                    <td className="whitespace-nowrap py-1.5 pl-2 pr-3">
                                      {firstRelation(c.units_of_measure)
                                        ?.abbreviation ?? '—'}
                                    </td>
                                  </tr>
                                )
                              })}
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
