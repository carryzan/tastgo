"use client"

import { useKitchen } from "@/hooks/use-kitchen"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"

export function General() {
  const { kitchen } = useKitchen()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-medium">General</h3>
        <p className="text-sm text-muted-foreground">
          General kitchen settings and configuration.
        </p>
      </div>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="kitchen-name">Name</FieldLabel>
          <Input id="kitchen-name" value={kitchen.name as string} disabled />
          <FieldDescription>The name of your kitchen.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="kitchen-location">Location</FieldLabel>
          <Input id="kitchen-location" value={(kitchen.location as string) ?? ''} disabled />
          <FieldDescription>Where your kitchen is based.</FieldDescription>
        </Field>
      </FieldGroup>
    </div>
  )
}