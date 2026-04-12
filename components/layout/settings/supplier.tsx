"use client"

import { useKitchen } from "@/hooks/use-kitchen"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item"

export function Supplier() {
  const { kitchenSettings, updateSettings } = useKitchen()

  const completed =
    kitchenSettings && typeof kitchenSettings.balance_completed === "boolean"
      ? kitchenSettings.balance_completed
      : false

  const balanceDate =
    kitchenSettings && typeof kitchenSettings.balance_date === "string"
      ? new Date(kitchenSettings.balance_date)
      : undefined

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-medium">Supplier</h3>
        <p className="text-sm text-muted-foreground">
          Manage opening balance and settings for your suppliers.
        </p>
      </div>

      <Item className="p-0">
        <ItemContent>
          <ItemTitle>Opening balance finalized</ItemTitle>
          <ItemDescription>
            Mark the opening balance as completed.
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <Switch
            checked={completed}
            onCheckedChange={(value) =>
              updateSettings({ balance_completed: value })
            }
          />
        </ItemActions>
      </Item>

      <FieldGroup>
        <Field>
          <FieldLabel>Opening Balance Date</FieldLabel>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !balanceDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon />
                {balanceDate ? format(balanceDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto" align="start">
              <Calendar
                mode="single"
                selected={balanceDate}
                onSelect={(date) =>
                  updateSettings({
                    balance_date: date ? date.toISOString() : null,
                  })
                }
              />
            </PopoverContent>
          </Popover>
          <FieldDescription>
            The date when the opening balance for suppliers was recorded.
          </FieldDescription>
        </Field>
      </FieldGroup>
    </div>
  )
}