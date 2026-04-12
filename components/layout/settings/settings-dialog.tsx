"use client"
import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { SidebarProvider } from "@/components/ui/sidebar"
import { SettingsSidebar, type SettingsPage } from "./settings-sidebar"
import { Profile } from "./profile"
import { Preference } from "./preference"
import { General } from "./general"
import { People } from "./people"
import { Brands } from "./brands"
import { Sources } from "./sources"
import { UnitsOfMeasure } from "./units-of-measure"
import { Currency } from "./currency"
import { Supplier } from "./supplier"
import { Inventory } from "./inventory"
import { AuditLog } from "./audit-log"

const pageComponents: Record<SettingsPage, React.ComponentType> = {
  Profile,
  Preference,
  General,
  People,
  Brands,
  Sources,
  "Units of Measure": UnitsOfMeasure,
  Currency,
  Supplier,
  Inventory,
  "Audit Log": AuditLog,
}

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SettingsDialogContent key={String(open)} />
    </Dialog>
  )
}

function SettingsDialogContent() {
  const [activePage, setActivePage] = React.useState<SettingsPage>("Preference")

  return (
    <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[900px] bg-background">
      <DialogTitle className="sr-only">Settings</DialogTitle>
      <DialogDescription className="sr-only">
        Customize your settings here.
      </DialogDescription>
      <SidebarProvider className="min-w-0 items-start">
        <SettingsSidebar activePage={activePage} setActivePage={setActivePage} />
        <main className="flex h-[480px] flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-9">
            {React.createElement(pageComponents[activePage])}
          </div>
        </main>
      </SidebarProvider>
    </DialogContent>
  )
}