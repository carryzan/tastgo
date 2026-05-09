'use client'

import { useMemo, useState, useTransition } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useKitchen } from '@/hooks/use-kitchen'
import { createClient } from '@/lib/supabase/client'
import { updateSource } from '@/lib/actions/sources'
import { Button } from '@/components/ui/button'
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

const NONE = '__none__'

type SettlementMode =
  | 'cash_now'
  | 'marketplace_receivable'

type SourceSettlementMode =
  | SettlementMode
  | 'bank_now'
  | 'customer_receivable'

interface Source {
  id: string
  name: string
  type: string
  settlement_mode: SourceSettlementMode | null
  settlement_account_id: string | null
  receivable_account_id: string | null
  fee_expense_account_id: string | null
  revenue_account_id: string | null
  cogs_account_id: string | null
}

interface SourceAccountingConfigProps {
  source: Source
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ChartAccount {
  id: string
  code: string
  name: string
  account_type: string
}

const MODE_LABELS: Record<SettlementMode, string> = {
  cash_now: 'Cash Now',
  marketplace_receivable: 'Marketplace Receivable',
}

async function fetchChartAccounts(kitchenId: string): Promise<ChartAccount[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name, account_type')
    .eq('kitchen_id', kitchenId)
    .eq('is_active', true)
    .order('code', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as ChartAccount[]
}

function toSelectValue(value: string | null) {
  return value ?? NONE
}

function fromSelectValue(value: string) {
  return value === NONE ? null : value
}

function toSupportedMode(mode: SourceSettlementMode | null) {
  return mode === 'cash_now' || mode === 'marketplace_receivable' ? mode : ''
}

function AccountSelect({
  value,
  onChange,
  accounts,
  placeholder,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  accounts: ChartAccount[]
  placeholder: string
  disabled: boolean
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={NONE}>Not configured</SelectItem>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.code} - {account.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export function SourceAccountingConfig({
  source,
  open,
  onOpenChange,
}: SourceAccountingConfigProps) {
  const { kitchen } = useKitchen()
  const router = useRouter()
  const [mode, setMode] = useState<SettlementMode | ''>(
    toSupportedMode(source.settlement_mode)
  )
  const [settlementAccountId, setSettlementAccountId] = useState(
    toSelectValue(source.settlement_account_id)
  )
  const [receivableAccountId, setReceivableAccountId] = useState(
    toSelectValue(source.receivable_account_id)
  )
  const [feeExpenseAccountId, setFeeExpenseAccountId] = useState(
    toSelectValue(source.fee_expense_account_id)
  )
  const [revenueAccountId, setRevenueAccountId] = useState(
    toSelectValue(source.revenue_account_id)
  )
  const [cogsAccountId, setCogsAccountId] = useState(
    toSelectValue(source.cogs_account_id)
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['source-accounting-chart-accounts', kitchen.id],
    queryFn: () => fetchChartAccounts(kitchen.id),
    enabled: open,
  })

  const accountGroups = useMemo(
    () => ({
      assets: accounts.filter((account) => account.account_type === 'asset'),
      expenses: accounts.filter((account) => account.account_type === 'expense'),
      revenue: accounts.filter((account) => account.account_type === 'revenue'),
      cogs: accounts.filter(
        (account) => account.account_type === 'cost_of_goods_sold'
      ),
    }),
    [accounts]
  )

  const usesSettlementAccount = mode === 'cash_now'
  const usesReceivable = mode === 'marketplace_receivable'
  const usesPlatformFees = mode === 'marketplace_receivable'

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) setError(null)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!mode) {
      setError('Select a settlement mode.')
      return
    }
    if (usesSettlementAccount && settlementAccountId === NONE) {
      setError('Select the account where this source settles.')
      return
    }
    if (usesReceivable && receivableAccountId === NONE) {
      setError('Select the receivable account for this source.')
      return
    }
    if (usesPlatformFees && feeExpenseAccountId === NONE) {
      setError('Select the platform fee expense account.')
      return
    }

    startTransition(async () => {
      const result = await updateSource(source.id, {
        settlement_mode: mode,
        settlement_account_id: usesSettlementAccount
          ? fromSelectValue(settlementAccountId)
          : null,
        receivable_account_id: usesReceivable
          ? fromSelectValue(receivableAccountId)
          : null,
        fee_expense_account_id: usesPlatformFees
          ? fromSelectValue(feeExpenseAccountId)
          : null,
        revenue_account_id: fromSelectValue(revenueAccountId),
        cogs_account_id: fromSelectValue(cogsAccountId),
      })

      if (result instanceof Error) {
        setError(result.message)
        return
      }

      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-sm"
        onInteractOutside={(event) => {
          if (pending) event.preventDefault()
        }}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Config</DialogTitle>
          <DialogDescription>
            Configure settlement behavior and account mappings for {source.name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Settlement Mode</FieldLabel>
              <Select
                value={mode || undefined}
                onValueChange={(value) => setMode(value as SettlementMode)}
                disabled={pending || isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select settlement mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(Object.keys(MODE_LABELS) as SettlementMode[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {MODE_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            {usesSettlementAccount ? (
              <Field>
                <FieldLabel>Settlement Account</FieldLabel>
                <AccountSelect
                  value={settlementAccountId}
                  onChange={setSettlementAccountId}
                  accounts={accountGroups.assets}
                  placeholder="Select settlement account"
                  disabled={pending || isLoading}
                />
              </Field>
            ) : null}

            {usesReceivable ? (
              <Field>
                <FieldLabel>Receivable Account</FieldLabel>
                <AccountSelect
                  value={receivableAccountId}
                  onChange={setReceivableAccountId}
                  accounts={accountGroups.assets}
                  placeholder="Select receivable account"
                  disabled={pending || isLoading}
                />
              </Field>
            ) : null}

            {usesPlatformFees ? (
              <Field>
                <FieldLabel>Platform Fee Expense Account</FieldLabel>
                <AccountSelect
                  value={feeExpenseAccountId}
                  onChange={setFeeExpenseAccountId}
                  accounts={accountGroups.expenses}
                  placeholder="Select fee account"
                  disabled={pending || isLoading}
                />
              </Field>
            ) : null}

            <Field>
              <FieldLabel>Revenue Account</FieldLabel>
              <AccountSelect
                value={revenueAccountId}
                onChange={setRevenueAccountId}
                accounts={accountGroups.revenue}
                placeholder="Default revenue account"
                disabled={pending || isLoading}
              />
            </Field>

            <Field>
              <FieldLabel>COGS Account</FieldLabel>
              <AccountSelect
                value={cogsAccountId}
                onChange={setCogsAccountId}
                accounts={accountGroups.cogs}
                placeholder="Default COGS account"
                disabled={pending || isLoading}
              />
            </Field>
          </FieldGroup>

          {error ? <FieldError className="mt-3">{error}</FieldError> : null}

          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending || isLoading} className="min-w-28">
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
