"use client"

import {
  User,
  SlidersHorizontal,
  Settings,
  Users,
  Tag,
  Link,
  DollarSign,
  Wallet,
  Package,
  ClipboardList,
  Ruler,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export type SettingsPage =
  | "Profile"
  | "Preference"
  | "General"
  | "People"
  | "Brands"
  | "Sources"
  | "Units of Measure"
  | "Currency"
  | "Supplier"
  | "Inventory"
  | "Audit Log"

const accountNav = [
  { name: "Profile" as const, icon: User },
  { name: "Preference" as const, icon: SlidersHorizontal },
]

const kitchenNav = [
  { name: "General" as const, icon: Settings },
  { name: "People" as const, icon: Users },
  { name: "Brands" as const, icon: Tag },
  { name: "Sources" as const, icon: Link },
  { name: "Units of Measure" as const, icon: Ruler },
  { name: "Currency" as const, icon: DollarSign },
  { name: "Supplier" as const, icon: Wallet },
  { name: "Inventory" as const, icon: Package },
  { name: "Audit Log" as const, icon: ClipboardList },
]

interface SettingsSidebarProps {
  activePage: SettingsPage
  setActivePage: (page: SettingsPage) => void
}

export function SettingsSidebar({ activePage, setActivePage }: SettingsSidebarProps) {
  return (
    <Sidebar collapsible="none" className="hidden md:flex">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountNav.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    isActive={activePage === item.name}
                    onClick={() => setActivePage(item.name)}
                  >
                    <item.icon />
                    <span>{item.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Kitchen</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {kitchenNav.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    isActive={activePage === item.name}
                    onClick={() => setActivePage(item.name)}
                  >
                    <item.icon />
                    <span>{item.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}