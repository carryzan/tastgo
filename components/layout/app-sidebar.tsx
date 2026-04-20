"use client"

import {
  LayoutDashboard,
  SquareMenu,
  Soup,
  PackageOpen,
  CookingPot,
  Van,
  ClipboardCheck,
  Receipt,
  Scale,
  Users,
  Calculator,
} from "lucide-react"
import { NavMain } from "@/components/layout/nav-main"
import { KitchenSwitcher } from "@/components/layout/kitchen-switcher"
import { useKitchen } from "@/hooks/use-kitchen"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar"

const NAV_ITEMS = [
  {
    title: "Dashboard",
    segment: "dashboard",
    icon: LayoutDashboard,
    permission: "kitchen.read",
  },
  {
    title: "Orders",
    segment: "orders",
    icon: SquareMenu,
    permission: "orders.read",
  },
  {
    title: "Menu",
    segment: "menu",
    icon: Soup,
    permission: "menu.read",
  },
  {
    title: "Inventory",
    segment: "inventory",
    icon: PackageOpen,
    permission: "inventory.read",
  },
  {
    title: "Production",
    segment: "production",
    icon: CookingPot,
    permission: "production.read",
  },
  {
    title: "Procurement",
    segment: "procurement",
    icon: Van,
    permission: "procurement.read",
  },
  {
    title: "Stock Control",
    segment: "stock-control",
    icon: ClipboardCheck,
    permission: "stock_count.read",
  },
  {
    title: "Expenses",
    segment: "expenses",
    icon: Receipt,
    permission: "expenses.read",
  },
  {
    title: "Finance",
    segment: "finance",
    icon: Calculator,
    permission: "accounting.read",
  },
  {
    title: "Staff & Scheduling",
    segment: "staff",
    icon: Users,
    permission: "staff.read",
  },
  {
    title: "Reconciliation",
    segment: "reconciliation",
    icon: Scale,
    permission: "reconciliation.read",
  },
] as const

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { kitchen, kitchens, permissions } = useKitchen()
  const pathname = usePathname()

  const items = NAV_ITEMS.filter((item) => permissions.has(item.permission)).map(
    (item) => ({
      title: item.title,
      url: `/${kitchen.id}/${item.segment}`,
      icon: item.icon,
      isActive: pathname.startsWith(`/${kitchen.id}/${item.segment}`),
    })
  )

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <KitchenSwitcher
          kitchens={kitchens as { id: string; name: string }[]}
          activeKitchenId={kitchen.id}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items} />
      </SidebarContent>
    </Sidebar>
  )
}