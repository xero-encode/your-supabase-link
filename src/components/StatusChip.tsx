import { cn } from "@/lib/utils";

type Status = string;

const LABELS: Record<string, string> = {
  uploaded: "Just arrived",
  parsed: "Needs review",
  reviewed: "Reviewed",
  invoiced: "Invoiced",
  paid: "Paid",
};

const STYLES: Record<string, string> = {
  uploaded: "bg-muted text-muted-foreground border border-border",
  parsed: "bg-accent-red/10 text-accent-red border border-accent-red/30",
  reviewed: "bg-transparent text-foreground border border-foreground/40",
  invoiced: "bg-foreground text-background border border-foreground",
  paid: "bg-emerald-50 text-emerald-800 border border-emerald-200",
};

export function StatusChip({ status }: { status: Status }) {
  const key = status.toLowerCase();
  const label = LABELS[key] ?? status;
  const style = STYLES[key] ?? STYLES.uploaded;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase",
        style,
      )}
    >
      {label}
    </span>
  );
}
