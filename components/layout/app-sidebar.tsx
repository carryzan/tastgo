"use client"

import * as React from "react"
import {
  AudioWaveform,
  Command,
  CookingPot,
  Home,
  Inbox,
  Search,
  Sparkles,
} from "lucide-react"

import { NavMain } from "@/components/layout/nav-main"
import { KitchenSwitcher } from "@/components/layout/kitchen-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  kitchens: [
    {
      name: "Acme Inc",
      logo: CookingPot,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Search",
      url: "#",
      icon: Search,
    },
    {
      title: "Ask AI",
      url: "#",
      icon: Sparkles,
    },
    {
      title: "Home",
      url: "#",
      icon: Home,
      isActive: true,
    },
    {
      title: "Inbox",
      url: "#",
      icon: Inbox,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <KitchenSwitcher kitchens={data.kitchens} />
        <NavMain items={data.navMain} />
      </SidebarHeader>
      <SidebarContent />
    </Sidebar>
  )
}

