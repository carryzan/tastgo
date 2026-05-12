'use client'

import { useEffect, startTransition as deferStateUpdate, useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { updateChartAccount } from '../_lib/chart-account-actions'
import { CHART_ACCOUNTS_QUERY_KEY } from '../_lib/queries'
import { fetchChartAccountsForPicker } from '../_lib/client-queries'
import type { ChartAccount } from './cash-account-columns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

interface EditCashAccountDialogProps {
  account: ChartAccount
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditCashAccountDialog({
  account,
  open,
  onOpenChange,
}: EditCashAccountDialogProps) {
  const NONE = '__none'
  const queryClient = useQueryClient()
  const [isActive, setIsActive] = useState(account.is_active)
  const [parentId, setParentId] = useState<string>(
    account.parent_account_id ?? NONE
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const isSystem = account.is_system

  const { data: allAccounts } = useQuery({
    queryKey: ['chart-accounts-picker', account.kitchen_id],
    queryFn: () => fetchChartAccountsForPicker(account.kitchen_id),
    enabled: open && !isSystem,
  })

  const parentOptions =
    allAccounts?.filter(
      (a) =>
        a.account_type === account.account_type && a.id !== account.id
    ) ?? []

  useEffect(() => {
    if (!open) return
    deferStateUpdate(() => {
      setIsActive(account.is_active)
      setParentId(account.parent_account_id ?? NONE)
      setError(null)
    })
  }, [open, account.id, account.is_active, account.parent_account_id])

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const fd = new FormData(form)
    const name = (fd.get('name') as string)?.trim()
    if (!name) return

    const updates: { name?: string; parent_account_id?: string | null; is_active?: boolean } = {}

    if (name !== account.name) updates.name = name
    if (!isSystem && parentId !== (account.parent_account_id ?? NONE)) {
      updates.parent_account_id = parentId === NONE ? null : parentId
    }
    if (isActive !== account.is_active) updates.is_active = isActive

    if (Object.keys(updates).length === 0) {
      onOpenChange(false)
      return
    }

    startTransition(async () => {
      try {
        const result = await updateChartAccount(
          account.kitchen_id,
          account.id,
          updates
        )
        if (result instanceof Error) return setError(result.message)

        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: CHART_ACCOUNTS_QUERY_KEY })
        queryClient.invalidateQueries({
          queryKey: ['chart-accounts-picker', account.kitchen_id],
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
          <DialogTitle>Edit account</DialogTitle>
          <DialogDescription>
            {isSystem
              ? 'System accounts have limited editability — only name and active status can be changed.'
              : 'Update details for this account.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-ca-code">Code</FieldLabel>
              <Input
                id="edit-ca-code"
                value={account.code}
                readOnly
                disabled
                className="text-muted-foreground"
              />
              {isSystem && (
                <FieldDescription>
                  Code cannot be changed on system accounts.
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-ca-name">Name</FieldLabel>
              <Input
                id="edit-ca-name"
                name="name"
                defaultValue={account.name}
                required
                disabled={pending}
              />
            </Field>
            {!isSystem && (
              <Field>
                <FieldLabel>Parent Account (optional)</FieldLabel>
                <Select
                  value={parentId}
                  onValueChange={setParentId}
                  disabled={pending}
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
            )}
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="edit-ca-active">Active</FieldLabel>
                <Switch
                  id="edit-ca-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  disabled={pending}
                />
              </div>
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
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
