'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { createStockCount } from '../_lib/actions'
import {
  COUNTABLE_STOCK_QUERY_KEY,
  fetchCountableStockItems,
  type CountableStockRow,
} from '../_lib/client-queries'
import { STOCK_COUNT_SESSIONS_QUERY_KEY } from '../_lib/queries'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'

const NO_LOCATION = '__no_location__'

const CYCLE_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'every_few_days', label: 'Every Few Days' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
] as const

type CountScope = 'full' | 'inventory' | 'production' | 'cycle' | 'location'

function toCreateItem(row: CountableStockRow) {
  return {
    item_type: row.item_type,
    inventory_item_id: row.inventory_item_id,
    production_recipe_id: row.production_recipe_id,
  }
}

export function NewCountDialog() {
  const { kitchen } = useKitchen()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<CountScope>('full')
  const [cycleFrequency, setCycleFrequency] = useState('daily')
  const [locationKey, setLocationKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: stockRows = [], isLoading } = useQuery({
    queryKey: [...COUNTABLE_STOCK_QUERY_KEY, kitchen.id],
    queryFn: () => fetchCountableStockItems(kitchen.id),
    enabled: open,
  })

  const locationOptions = useMemo(() => {
    const options = new Map<string, string>()
    for (const row of stockRows) {
      if (row.item_type !== 'inventory_item') continue
      const key = row.location_label ?? NO_LOCATION
      options.set(key, row.location_label ?? 'Unassigned')
    }
    return Array.from(options.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [stockRows])

  const selectedRows = useMemo(() => {
    switch (scope) {
      case 'full':
        return stockRows
      case 'inventory':
        return stockRows.filter((row) => row.item_type === 'inventory_item')
      case 'production':
        return stockRows.filter((row) => row.item_type === 'production_recipe')
      case 'cycle':
        return stockRows.filter(
          (row) =>
            row.item_type === 'inventory_item' &&
            row.cycle_count_frequency === cycleFrequency
        )
      case 'location':
        if (!locationKey) return []
        return stockRows.filter(
          (row) =>
            row.item_type === 'inventory_item' &&
            (row.location_label ?? NO_LOCATION) === locationKey
        )
    }
  }, [cycleFrequency, locationKey, scope, stockRows])

  function handleOpenChange(next: boolean) {
    if (pending) return
    setOpen(next)
    if (!next) {
      setScope('full')
      setCycleFrequency('daily')
      setLocationKey('')
      setError(null)
    }
  }

  function handleCreate() {
    setError(null)
    if (scope === 'location' && !locationKey) {
      return setError('Select a location.')
    }
    if (selectedRows.length === 0) {
      return setError('No items match this count.')
    }

    startTransition(async () => {
      try {
        const result = await createStockCount(
          kitchen.id,
          scope === 'full' ? 'full' : 'spot',
          selectedRows.map(toCreateItem)
        )
        if (result instanceof Error) return setError(result.message)

        setOpen(false)
        queryClient.invalidateQueries({ queryKey: STOCK_COUNT_SESSIONS_QUERY_KEY })
        router.push(`/${kitchen.id}/stock-control/stock-counts/${result}`)
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">New Count</Button>
      </DialogTrigger>
      <DialogContent
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>New Stock Count</DialogTitle>
          <DialogDescription>
            Create a count session from inventory and tracked production stock.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="min-h-0 gap-4 overflow-hidden">
          <Field>
            <FieldLabel>Count Scope</FieldLabel>
            <Select
              value={scope}
              onValueChange={(value) => {
                setScope(value as CountScope)
                setError(null)
              }}
              disabled={pending}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="cycle">Cycle Count</SelectItem>
                  <SelectItem value="location">Location</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          {scope === 'cycle' && (
            <Field>
              <FieldLabel>Cycle</FieldLabel>
              <Select
                value={cycleFrequency}
                onValueChange={setCycleFrequency}
                disabled={pending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {CYCLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          )}

          {scope === 'location' && (
            <Field>
              <FieldLabel>Location</FieldLabel>
              <Select
                value={locationKey}
                onValueChange={setLocationKey}
                disabled={pending || isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {locationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          )}
        </FieldGroup>

        {error ? <FieldError>{error}</FieldError> : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleCreate}
            disabled={pending || isLoading || selectedRows.length === 0}
            className="min-w-28"
          >
            {pending && <Spinner data-icon="inline-start" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
