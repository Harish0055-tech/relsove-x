import { QueryStatus, QueryPriority } from "@/types/query";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<QueryStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-[hsl(var(--info))] text-[hsl(var(--info-foreground))]" },
  "in-progress": { label: "In Progress", className: "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]" },
  resolved: { label: "Resolved", className: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground" },
};

const priorityConfig: Record<QueryPriority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", className: "bg-[hsl(var(--info))]/15 text-[hsl(var(--info))] border-[hsl(var(--info))]/30" },
  high: { label: "High", className: "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30" },
  critical: { label: "Critical", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export function StatusBadge({ status }: { status: QueryStatus }) {
  const config = statusConfig[status];
  return (
    <Badge className={cn("border-transparent font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: QueryPriority }) {
  const config = priorityConfig[priority];
  return (
    <Badge variant="outline" className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
