"use client"

import { useTheme } from "next-themes"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function Preference() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-medium">Preference</h3>
        <p className="text-sm text-muted-foreground">
          Customize your personal preferences.
        </p>
      </div>

      <Item className="p-0">
        <ItemContent>
          <ItemTitle>Theme</ItemTitle>
          <ItemDescription>
            Select your preferred theme.
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="system">Use system setting</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </ItemActions>
      </Item>

      <Item className="p-0">
        <ItemContent>
          <ItemTitle>Language</ItemTitle>
          <ItemDescription>
            Choose your preferred language.
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <Select defaultValue="en" disabled>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="en">English</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </ItemActions>
      </Item>

      <Item className="p-0">
        <ItemContent>
          <ItemTitle>Time Zone</ItemTitle>
          <ItemDescription>
            Set your local time zone.
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <Select defaultValue="baghdad" disabled>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="baghdad">(GMT+3:00) Baghdad</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </ItemActions>
      </Item>
    </div>
  )
}