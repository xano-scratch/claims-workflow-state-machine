import { useEffect, useState } from "react";
import { Loader2, FilePlus2, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, fileClaim, listPolicies, type Policy } from "@/lib/api";
import { money } from "@/lib/claims";

export function FileClaim({ onFiled }: { onFiled: (claimId: number) => void }) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [policyId, setPolicyId] = useState("");
  const [claimant, setClaimant] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);

  useEffect(() => {
    let live = true;
    listPolicies()
      .then((p) => live && setPolicies(p))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const selected = policies.find((p) => String(p.id) === policyId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const claim = await fileClaim({
        policy_id: Number(policyId),
        claimant_name: claimant,
        amount_claimed: Number(amount),
      });
      onFiled(claim.id);
    } catch (err) {
      if (err instanceof ApiError) setError({ message: err.message, status: err.status });
      else setError({ message: err instanceof Error ? err.message : "Could not file the claim." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <FilePlus2 className="size-5" /> File a claim
        </h2>
        <p className="text-muted-foreground text-sm">
          A claim can only be filed against an <span className="text-foreground">active</span> policy,
          and its amount must sit within the policy coverage limit — both enforced by the API.
        </p>
      </div>

      {error ? (
        <div className="border-destructive/50 bg-destructive/10 text-destructive flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            {error.status ? <span className="font-semibold">Rejected ({error.status}) · </span> : null}
            {error.message}
          </span>
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-1.5">
          <Label>Policy</Label>
          <Select value={policyId} onValueChange={setPolicyId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a policy…" />
            </SelectTrigger>
            <SelectContent>
              {policies.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {String(p.policy_number)} — {String(p.holder_name)} · {money(p.coverage_limit)} ·{" "}
                  {String(p.status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selected ? (
            <p className="text-muted-foreground text-xs">
              Coverage {money(selected.coverage_limit)} ·{" "}
              <span className={String(selected.status) === "active" ? "text-emerald-400" : "text-red-400"}>
                {String(selected.status)}
              </span>
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="claimant">Claimant name</Label>
            <Input
              id="claimant"
              placeholder="Jamie Rivera"
              value={claimant}
              onChange={(e) => setClaimant(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount claimed (USD)</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              step="1"
              placeholder="4200"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        </div>

        <Button type="submit" disabled={submitting || !policyId || !claimant || !amount}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <FilePlus2 className="size-4" />}
          File claim
        </Button>
      </form>
    </div>
  );
}
