'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { createOnlineSettlement } from '../_lib/actions'
import { ONLINE_SETTLEMENTS_QUERY_KEY } from '../_lib/queries'

interface SourceOption {
  id: string
  name: string
  settlement_mode?: string | null
  is_active?: boolean | null
}

function monthStart() {
  const date = new Date()
  return new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .split('T')[0]
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function isSourceOption(value: unknown): value is SourceOption {
  if (!value || typeof value !== 'object') return false
  return 'id' in value && 'name' in value
}

export function NewOnlineSettlementDialog() {
  const { kitchen, sources } = useKitchen()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [sourceId, setSourceId] = useState('')
  const [periodStart, setPeriodStart] = useState(monthStart)
  const [periodEnd, setPeriodEnd] = useState(today)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const sourceOptions = useMemo(
    () =>
      sources
        .filter(isSourceOption)
        .filter((source) => source.settlement_mode === 'marketplace_receivable'),
    [sources]
  )

  function handleOpenChange(next: boolean) {
    if (pending) return
    setOpen(next)
    if (!next) {
      setSourceId('')
      setPeriodStart(monthStart())
      setPeriodEnd(today())
      setError(null)
    }
  }

  function handleCreate() {
    setError(null)

    if (!sourceId) {
      setError('Select an online source.')
      return
    }
    if (!periodStart || !periodEnd || periodEnd < periodStart) {
      setError('Enter a valid settlement period.')
      return
    }

    startTransition(async () => {
      try {
        const result = await createOnlineSettlement(
          kitchen.id,
          sourceId,
          periodStart,
          periodEnd
        )
        if (result instanceof Error) {
          setError(result.message)
          return
        }

        setOpen(false)
        queryClient.invalidateQueries({ queryKey: ONLINE_SETTLEMENTS_QUERY_KEY })
        router.push(`/${kitchen.id}/settlement/online/${result}`)
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">New Settlement</Button>
      </DialogTrigger>
      <DialogContent
        onInteractOutside={(event) => {
          if (pending) event.preventDefault()
        }}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>New Online Settlement</DialogTitle>
          <DialogDescription>
            Create a marketplace settlement batch for a source and order period.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel>Source</FieldLabel>
            <Select
              value={sourceId}
              onValueChange={setSourceId}
              disabled={pending || sourceOptions.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select online source" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {sourceOptions.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="settlement-period-start">Period Start</FieldLabel>
              <Input
                id="settlement-period-start"
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
                disabled={pending}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="settlement-period-end">Period End</FieldLabel>
              <Input
                id="settlement-period-end"
                type="date"
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
                disabled={pending}
              />
            </Field>
          </div>
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
            disabled={pending || sourceOptions.length === 0}
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
