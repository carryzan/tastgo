'use client'
import { useKitchen } from '@/hooks/use-kitchen'
import { Input } from '@/components/ui/input'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item'
import { ChangePassword } from '@/components/layout/settings/change-password'

export function Profile() {
  const { membership } = useKitchen()
  const { full_name, phone } = membership.profiles as { full_name: string; phone: string | null }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account profile information.
        </p>
      </div>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" value={full_name} disabled />
          <FieldDescription>Your display name visible to others.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
          <Input id="phone" type="tel" value={phone ?? ''} disabled />
          <FieldDescription>Used for account recovery and notifications.</FieldDescription>
        </Field>
      </FieldGroup>
      <Item className="p-0">
        <ItemContent>
          <ItemTitle>Password</ItemTitle>
          <ItemDescription>Update your account password.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <ChangePassword />
        </ItemActions>
      </Item>
    </div>
  )
}