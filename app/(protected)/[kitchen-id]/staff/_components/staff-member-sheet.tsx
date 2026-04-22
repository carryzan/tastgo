'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { Button } from '@/components/ui/button'
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import {
  createStaffMember,
  updateStaffMember,
} from '../_lib/staff-actions'
import { STAFF_MEMBERS_QUERY_KEY, type StaffMember } from '../_lib/queries'

interface StaffMemberSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staffMember?: StaffMember | null
}

export function StaffMemberSheet({
  open,
  onOpenChange,
  staffMember,
}: StaffMemberSheetProps) {
  const { kitchen } = useKitchen()
  const queryClient = useQueryClient()
  const [fullName, setFullName] = useState(staffMember?.full_name ?? '')
  const [phone, setPhone] = useState(staffMember?.phone ?? '')
  const [role, setRole] = useState(staffMember?.role ?? '')
  const [payRate, setPayRate] = useState(staffMember ? String(staffMember.pay_rate) : '')
  const [payFrequency, setPayFrequency] =
    useState<'daily' | 'weekly' | 'monthly'>(staffMember?.pay_frequency ?? 'monthly')
  const [payCalculationType, setPayCalculationType] =
    useState<'fixed' | 'hourly'>(staffMember?.pay_calculation_type ?? 'fixed')
  const [isActive, setIsActive] = useState<'true' | 'false'>(
    staffMember?.is_active === false ? 'false' : 'true'
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!fullName.trim()) return setError('Enter the staff member name.')

    const parsedPayRate = Number(payRate)
    if (!payRate || Number.isNaN(parsedPayRate) || parsedPayRate <= 0) {
      return setError('Enter a valid pay rate greater than zero.')
    }

    startTransition(async () => {
      const payload = {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        role: role.trim() || null,
        pay_rate: parsedPayRate,
        pay_frequency: payFrequency,
        pay_calculation_type: payCalculationType,
        is_active: isActive === 'true',
      }

      const result = staffMember
        ? await updateStaffMember(kitchen.id, staffMember.id, payload)
        : await createStaffMember(kitchen.id, payload)

      if (result instanceof Error) {
        setError(result.message)
        return
      }

      queryClient.invalidateQueries({ queryKey: STAFF_MEMBERS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['staff-filter-members', kitchen.id] })
      queryClient.invalidateQueries({ queryKey: ['staff-members-picker', kitchen.id] })
      onOpenChange(false)
    })
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next)
      }}
    >
      <SheetContent
        className="flex flex-col gap-0 sm:max-w-xl"
        showCloseButton={!pending}
        onInteractOutside={(event) => {
          if (pending) event.preventDefault()
        }}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault()
        }}
      >
        <SheetHeader>
          <SheetTitle>{staffMember ? 'Edit staff member' : 'Add staff member'}</SheetTitle>
          <SheetDescription>
            Store operational staff records separately from kitchen login access.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="grid flex-1 auto-rows-min gap-6 px-4 pb-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="staff-member-name">Full Name</FieldLabel>
                <Input
                  id="staff-member-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="e.g. Samir Ahmed"
                  disabled={pending}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="staff-member-phone">Phone</FieldLabel>
                <Input
                  id="staff-member-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="e.g. +964 770 000 0000"
                  disabled={pending}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="staff-member-role">Role</FieldLabel>
                <Input
                  id="staff-member-role"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder="e.g. Cashier, Prep Cook"
                  disabled={pending}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="staff-member-pay-rate">Pay Rate</FieldLabel>
                <Input
                  id="staff-member-pay-rate"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={payRate}
                  onChange={(event) => setPayRate(event.target.value)}
                  placeholder="0.00"
                  disabled={pending}
                />
              </Field>

              <Field>
                <FieldLabel>Pay Frequency</FieldLabel>
                <Select
                  value={payFrequency}
                  onValueChange={(value) =>
                    setPayFrequency(value as 'daily' | 'weekly' | 'monthly')
                  }
                  disabled={pending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Pay Calculation</FieldLabel>
                <Select
                  value={payCalculationType}
                  onValueChange={(value) =>
                    setPayCalculationType(value as 'fixed' | 'hourly')
                  }
                  disabled={pending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {staffMember ? (
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <Select
                    value={isActive}
                    onValueChange={(value) => setIsActive(value as 'true' | 'false')}
                    disabled={pending}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
            </FieldGroup>

            {error ? <FieldError>{error}</FieldError> : null}
          </div>

          <SheetFooter>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {staffMember ? 'Save Changes' : 'Add Staff Member'}
            </Button>
            <SheetClose asChild>
              <Button variant="outline" type="button" disabled={pending}>
                Cancel
              </Button>
            </SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
