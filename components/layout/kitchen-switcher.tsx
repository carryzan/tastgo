"use client"

import * as React from "react"
import { ChevronDown, Plus } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export interface KitchenSwitcherKitchen {
  name: string
  logo: React.ElementType
  plan: string
}

export function KitchenSwitcher({
  kitchens,
}: {
  kitchens: KitchenSwitcherKitchen[]
}) {
  const [activeKitchen, setActiveKitchen] = React.useState(kitchens[0])

  if (!activeKitchen) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="w-fit">
              <activeKitchen.logo />
              <span>{activeKitchen.name}</span>
              <ChevronDown className="opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-54" align="start" side="bottom" sideOffset={4}>
            <DropdownMenuLabel>Kitchens</DropdownMenuLabel>
            {kitchens.map((kitchen, index) => (
              <DropdownMenuItem key={kitchen.name} onClick={() => setActiveKitchen(kitchen)}>
                <kitchen.logo />
                {kitchen.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <Plus />
              Add team
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

