'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createChartAccount } from '../_lib/chart-account-actions'
import { CHART_ACCOUNTS_QUERY_KEY } from '../_lib/queries'
import { fetchChartAccountsForPicker } from '../_lib/client-queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

type AccountType =
  | 'asset'
  | 'liability'
  | 'equity'
  | 'revenue'
  | 'expense'
  | 'contra_revenue'
  | 'cost_of_goods_sold'

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expense' },
  { value: 'contra_revenue', label: 'Contra Revenue' },
  { value: 'cost_of_goods_sold', label: 'Cost of Goods Sold' },
]

const NORMAL_BALANCE_BY_TYPE: Record<AccountType, 'debit' | 'credit'> = {
  asset: 'debit',
  liability: 'credit',
  equity: 'credit',
  revenue: 'credit',
  expense: 'debit',
  contra_revenue: 'debit',
  cost_of_goods_sold: 'debit',
}

interface AddCashAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kitchenId: string
}

export function AddCashAccountDialog({
  open,
  onOpenChange,
  kitchenId,
}: AddCashAccountDialogProps) {
  const queryClient = useQueryClient()
  const NONE = '__none'
  const [accountType, setAccountType] = useState<AccountType>('asset')
  const [parentId, setParentId] = useState<string>(NONE)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: allAccounts } = useQuery({
    queryKey: ['chart-accounts-picker', kitchenId],
    queryFn: () => fetchChartAccountsForPicker(kitchenId),
    enabled: open,
  })

  const parentOptions =
    allAccounts?.filter((a) => a.account_type === accountType) ?? []

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      setAccountType('asset')
      setParentId(NONE)
      setError(null)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const fd = new FormData(form)
    const code = (fd.get('code') as string)?.trim()
    const name = (fd.get('name') as string)?.trim()

    if (!code) return setError('Code is required.')
    if (!name) return setError('Name is required.')

    startTransition(async () => {
      try {
        const result = await createChartAccount(kitchenId, {
          code,
          name,
          account_type: accountType,
          normal_balance: NORMAL_BALANCE_BY_TYPE[accountType],
          parent_account_id: parentId === NONE ? null : parentId,
        })
        if (result instanceof Error) return setError(result.message)

        form.reset()
        setAccountType('asset')
        setParentId(NONE)
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: CHART_ACCOUNTS_QUERY_KEY })
        queryClient.invalidateQueries({
          queryKey: ['chart-accounts-picker', kitchenId],
        })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Add account</DialogTitle>
          <DialogDescription>
            Create a new chart of accounts entry.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="add-ca-code">Code</FieldLabel>
              <Input
                id="add-ca-code"
                name="code"
                placeholder="e.g. 1160"
                required
                disabled={pending}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="add-ca-name">Name</FieldLabel>
              <Input
                id="add-ca-name"
                name="name"
                placeholder="e.g. Petty Cash 2"
                required
                disabled={pending}
              />
            </Field>
            <Field>
              <FieldLabel>Account Type</FieldLabel>
                <Select
                  value={accountType}
                  onValueChange={(v) => {
                    setAccountType(v as AccountType)
                    setParentId(NONE)
                  }}
                disabled={pending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Parent Account (optional)</FieldLabel>
              <Select
                value={parentId}
                onValueChange={setParentId}
                disabled={pending || parentOptions.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None (top-level)" />
                </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None (top-level)</SelectItem>
                    {parentOptions.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} · {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          {error && <FieldError className="mt-2">{error}</FieldError>}
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending && <Spinner data-icon="inline-start" />}
              Add account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
