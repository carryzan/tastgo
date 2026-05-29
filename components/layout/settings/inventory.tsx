"use client"

import { useState } from "react"
import { useKitchen } from "@/hooks/use-kitchen"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { PackagingSettings } from "./packaging"

export function Inventory() {
  const [tab, setTab] = useState("settings")
  const { kitchenSettings, updateSettings } = useKitchen()

  const completed =
    kitchenSettings && typeof kitchenSettings.opening_inventory_completed === "boolean"
      ? kitchenSettings.opening_inventory_completed
      : false

  const inventoryDate =
    kitchenSettings && typeof kitchenSettings.opening_inventory_date === "string"
      ? new Date(kitchenSettings.opening_inventory_date)
      : undefined

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-medium">Inventory</h3>
        <p className="text-sm text-muted-foreground">
          Track and manage your kitchen inventory items.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="packaging">Packaging</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-3 space-y-6">
          <Item className="p-0">
            <ItemContent>
              <ItemTitle>Starting inventory locked</ItemTitle>
              <ItemDescription>
                Mark the starting inventory as completed.
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Switch
                checked={completed}
                onCheckedChange={(value) =>
                  updateSettings({ opening_inventory_completed: value })
                }
              />
            </ItemActions>
          </Item>

          <FieldGroup>
            <Field>
              <FieldLabel>Starting Inventory Date</FieldLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !inventoryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon />
                    {inventoryDate ? format(inventoryDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={inventoryDate}
                    onSelect={(date) =>
                      updateSettings({
                        opening_inventory_date: date ? date.toISOString() : null,
                      })
                    }
                  />
                </PopoverContent>
              </Popover>
              <FieldDescription>
                The date when the starting inventory was recorded.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </TabsContent>

        <TabsContent value="packaging" className="mt-3">
          <PackagingSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
