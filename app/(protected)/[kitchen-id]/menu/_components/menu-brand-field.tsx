'use client'

import { useMemo } from 'react'
import { useKitchen } from '@/hooks/use-kitchen'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface MenuBrandOption {
  id: string
  name: string
}

/** Kitchen brands for menu flows — sourced from `useKitchen()`. */
export function useMenuBrandOptions(): MenuBrandOption[] {
  const { brands } = useKitchen()
  return useMemo(() => brands as MenuBrandOption[], [brands])
}

interface MenuBrandFieldProps {
  id: string
  value: string
  onValueChange: (brandId: string) => void
  disabled?: boolean
  selectTriggerClassName?: string
  /** Raise dropdown above dialog/sheet overlays */
  selectContentClassName?: string
}

export function MenuBrandField({
  id,
  value,
  onValueChange,
  disabled,
  selectTriggerClassName,
  selectContentClassName,
}: MenuBrandFieldProps) {
  const brands = useMenuBrandOptions()
  if (brands.length === 0) return null

  return (
    <Field>
      <FieldLabel htmlFor={id}>Brand</FieldLabel>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          className={cn('w-full', selectTriggerClassName)}
        >
          <SelectValue placeholder="Select brand" />
        </SelectTrigger>
        <SelectContent className={cn('z-100', selectContentClassName)}>
        <SelectGroup>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}
