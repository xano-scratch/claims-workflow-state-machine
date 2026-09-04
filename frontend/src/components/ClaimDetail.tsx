import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldAlert, CheckCircle2, History, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ApiError,
  assignClaim,
  getClaim,
  listAdjusters,
  transitionClaim,
  type Adjuster,
  type ClaimDetail as ClaimDetailData,
  type TransitionBody,
} from "@/lib/api";
import {
  actionsFor,
  money,
  ROLE_LABEL,
  stateMeta,
  whenFrom,
  type ClaimState,
  type Role,
} from "@/lib/claims";

type ActionResult = { ok: boolean; message: string; status?: number };

export function ClaimDetail({
  claimId,
  role,
  onChanged,
}: {
  claimId: number;
  role: Role;
  onChanged: () => void;
}) {
  const [data, setData] = useState<ClaimDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [adjusters, setAdjusters] = useState<Adjuster[]>([]);
  const [assignee, setAssignee] = useState<string>("");

  const reload = useCallback(async () => {
    const d = await getClaim(claimId);
    setData(d);
    return d;
  }, [claimId]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setResult(null);
    reload()
      .catch(() => live && setData(null))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [reload]);

  useEffect(() => {
    if (role !== "claims_manager") return;
    let live = true;
    listAdjusters()
      .then((a) => live && setAdjusters(a))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [role]);

  async function run(label: string, fn: () => Promise<void>) {
    setActing(label);
    setResult(null);
    try {
      await fn();
      await reload();
      onChanged();
    } catch (e) {
      if (e instanceof ApiError) setResult({ ok: false, message: e.message, status: e.status });
      else setResult({ ok: false, message: e instanceof Error ? e.message : "Action failed." });
    } finally {
      setActing(null);
    }
  }

  function doTransition(to: ClaimState) {
    void run(`t:${to}`, async () => {
      await transitionClaim({
        claim_id: claimId,
        to_state: to as TransitionBody["to_state"],
        note: `Moved to ${stateMeta(to).label.toLowerCase()} by ${ROLE_LABEL[role].toLowerCase()}.`,
      });
      setResult({ ok: true, message: `Claim moved to “${stateMeta(to).label}”.` });
    });
  }

  function doAssign() {
    const adjuster_id = Number(assignee);
    if (!adjuster_id) return;
    void run("assign", async () => {
      await assignClaim({ claim_id: claimId, adjuster_id });
      const who = adjusters.find((a) => a.id === adjuster_id);
      setResult({ ok: true, message: `Assigned to ${who ? String(who.name) : "adjuster"}.` });
    });
  }

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 p-10 text-sm">
        <Loader2 className="size-4 animate-spin" /> Loading claim…
      </div>
    );
  }
  if (!data || !data.claim) {
    return <div className="text-muted-foreground p-10 text-sm">Claim not found.</div>;
  }

  const { claim, policy, adjuster, history } = data;
  const state = String(claim.state) as ClaimState;
  const meta = stateMeta(state);
  const actions = actionsFor(state, role);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Claim #{claim.id}</h2>
          <Badge variant="outline" className={meta.badge}>
            {meta.label}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          {claim.claimant_name} · {money(claim.amount_claimed)} claimed
        </p>
      </div>

      {/* Facts */}
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Fact label="Policy">
          {policy ? String(policy.policy_number) : "—"}
          {policy ? (
            <span
              className={
                String(policy.status) === "active"
                  ? "ml-1.5 text-emerald-400"
                  : "ml-1.5 text-red-400"
              }
            >
              ({String(policy.status)})
            </span>
          ) : null}
        </Fact>
        <Fact label="Coverage limit">{policy ? money(policy.coverage_limit) : "—"}</Fact>
        <Fact label="Reserve">{money(claim.reserve_amount)}</Fact>
        <Fact label="Assigned adjuster">
          {adjuster ? String(adjuster.name) : <span className="text-muted-foreground">Unassigned</span>}
        </Fact>
      </div>

      {/* Result banner — surfaces the exact API rule that fired */}
      {result ? (
        <div
          className={
            result.ok
              ? "flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
              : "flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {result.ok ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          ) : (
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          )}
          <span>
            {!result.ok && result.status ? (
              <span className="font-semibold">Blocked ({result.status}) · </span>
            ) : null}
            {result.message}
          </span>
        </div>
      ) : null}

      {/* Actions */}
      <div className="space-y-3">
        <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          Actions · as {ROLE_LABEL[role]}
        </h3>

        {role === "viewer" ? (
          <p className="text-muted-foreground flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm">
            <Lock className="size-4" /> Viewers are read-only — the API refuses every transition.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {actions.length > 0 ? (
              actions.map((a) => (
                <Button
                  key={a.to}
                  size="sm"
                  variant={a.to === "denied" ? "outline" : "default"}
                  disabled={acting !== null}
                  onClick={() => doTransition(a.to)}
                >
                  {acting === `t:${a.to}` ? <Loader2 className="size-4 animate-spin" /> : null}
                  {a.label}
                </Button>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                This claim has reached a terminal state — no further moves.
              </p>
            )}
          </div>
        )}

        {role === "claims_manager" ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger size="sm" className="w-56">
                <SelectValue placeholder="Assign an adjuster…" />
              </SelectTrigger>
              <SelectContent>
                {adjusters.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {String(a.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="secondary"
              disabled={acting !== null || !assignee}
              onClick={doAssign}
            >
              {acting === "assign" ? <Loader2 className="size-4 animate-spin" /> : null}
              Assign
            </Button>
          </div>
        ) : null}
      </div>

      <Separator />

      {/* Audit trail */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <History className="size-4" /> Transition audit trail
        </h3>
        <ol className="relative space-y-3 pl-4">
          {history.map((h) => {
            const from = h.from_state ? String(h.from_state) : "created";
            const to = String(h.to_state);
            const actorName = h.actor_name ? String(h.actor_name) : "—";
            const actorRole = h.actor_role ? String(h.actor_role) : "";
            return (
              <li key={h.id} className="border-border relative border-l pl-4">
                <span className="bg-primary absolute -left-[5px] top-1.5 size-2.5 rounded-full" />
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="text-muted-foreground">{stateMeta(from).label}</span>
                  <span className="text-muted-foreground">→</span>
                  <Badge variant="outline" className={stateMeta(to).badge}>
                    {stateMeta(to).label}
                  </Badge>
                  <span className="text-muted-foreground text-xs">{whenFrom(h.created_at)}</span>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {actorName}
                  {actorRole ? ` · ${ROLE_LABEL[actorRole as Role] ?? actorRole}` : ""}
                  {h.note ? ` — ${String(h.note)}` : ""}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium">{children}</p>
    </div>
  );
}
