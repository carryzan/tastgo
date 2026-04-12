export function AuditLog() {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h3 className="text-lg font-medium">Audit Log</h3>
          <p className="text-sm text-muted-foreground">
            View activity and change history.
          </p>
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="aspect-video max-w-3xl rounded-xl bg-muted/50" />
        ))}
      </div>
    )
  }