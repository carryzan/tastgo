import { LogoutButton } from "./_components/logout-button";
import { ThemeToggleButton } from "./_components/theme-toggle-button";

export default function DashboardPage() {
  return (
    <main className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">Protected route — session OK.</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggleButton />
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
