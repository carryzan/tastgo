import type { ReactNode } from "react"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

import { LogoutButton } from "./dashboard/_components/logout-button"
import { ThemeToggleButton } from "./dashboard/_components/theme-toggle-button"

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
          </div>
          <div className="ml-auto px-3">
            <ThemeToggleButton />
            <LogoutButton />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 px-4 py-10">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

