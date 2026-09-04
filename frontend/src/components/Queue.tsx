import { useEffect, useState } from "react";
import { Loader2, Inbox } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { listClaims, type Claim } from "@/lib/api";
import { money, stateMeta, type ClaimState } from "@/lib/claims";

const FILTERS: { value: "" | ClaimState; label: string }[] = [
  { value: "", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "in_review", label: "In review" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
  { value: "paid", label: "Paid" },
];

export function Queue({
  selectedId,
  onSelect,
  reloadKey,
}: {
  selectedId: number | null;
  onSelect: (id: number) => void;
  reloadKey: number;
}) {
  const [filter, setFilter] = useState<"" | ClaimState>("");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    listClaims(filter || undefined)
      .then((rows) => {
        if (live) {
          setClaims(rows);
          setError(null);
        }
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : "Failed to load claims."))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [filter, reloadKey]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.value || "all"}
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === f.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 px-1 py-8 text-sm">
          <Loader2 className="size-4 animate-spin" /> Loading claims…
        </div>
      ) : error ? (
        <p className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {error}
        </p>
      ) : claims.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center text-sm">
          <Inbox className="size-6" />
          No claims in this queue.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {claims.map((c) => {
            const meta = stateMeta(String(c.state));
            const adjuster = c.adjuster_name ? String(c.adjuster_name) : null;
            return (
              <li key={c.id}>
                <button
                  onClick={() => onSelect(c.id)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors",
                    selectedId === c.id
                      ? "border-primary bg-accent"
                      : "border-border hover:bg-accent/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        <span className="text-muted-foreground">#{c.id}</span> {c.claimant_name}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-sm">
                        {money(c.amount_claimed)} · {adjuster ? `Adj. ${adjuster}` : "Unassigned"}
                      </p>
                    </div>
                    <Badge variant="outline" className={meta.badge}>
                      {meta.label}
                    </Badge>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
