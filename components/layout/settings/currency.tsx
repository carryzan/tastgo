"use client"

import { useKitchen } from "@/hooks/use-kitchen"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function Currency() {
  const { kitchenSettings } = useKitchen()
  const currency =
  kitchenSettings && typeof kitchenSettings.currency === "string"
    ? kitchenSettings.currency
    : "Unknown"

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-medium">Currency</h3>
        <p className="text-sm text-muted-foreground">
          Configure currency formats and exchange rates.
        </p>
      </div>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="default-currency">Default Currency</FieldLabel>
          <Select defaultValue={currency} disabled>
            <SelectTrigger id="default-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={currency}>
                  {currency}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            The primary currency used across your kitchen.
          </FieldDescription>
        </Field>
      </FieldGroup>
    </div>
  )
}