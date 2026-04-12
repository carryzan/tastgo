"use client"
import { useState } from "react"
import { ChefHat, ChevronDown, LogOut, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
import { logout } from "@/lib/actions/auth"
import { setLastKitchen } from "@/lib/actions/kitchen"
import { SettingsDialog } from "./settings/settings-dialog"

interface KitchenSwitcherProps {
  kitchens: { id: string; name: string }[]
  activeKitchenId: string
}

export function KitchenSwitcher({ kitchens, activeKitchenId }: KitchenSwitcherProps) {
  const router = useRouter()
  const activeKitchen = kitchens.find((k) => k.id === activeKitchenId)
  const [showSettings, setShowSettings] = useState(false)
  if (!activeKitchen) return null

  async function handleSwitch(kitchenId: string) {
    if (kitchenId === activeKitchenId) return
    await setLastKitchen(kitchenId)
    router.push(`/${kitchenId}/dashboard`)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="w-fit px-1.5">
              <div className="flex aspect-square size-5 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <ChefHat className="size-3" />
              </div>
              <span className="truncate font-medium">{activeKitchen.name}</span>
              <ChevronDown className="opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start" side="bottom" sideOffset={4}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Kitchens</DropdownMenuLabel>
              {kitchens.map((kitchen) => (
                <DropdownMenuItem key={kitchen.id} onSelect={() => void handleSwitch(kitchen.id)}>
                  <ChefHat />
                  <span className="truncate">{kitchen.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => setShowSettings(true)}>
                <Settings />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => void logout()}>
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      </SidebarMenuItem>
    </SidebarMenu>
  )
}