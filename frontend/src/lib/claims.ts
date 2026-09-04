// Client-side view of the state machine — for rendering the right buttons and
// badges. The backend is the ENFORCER; this only decides what to show. When the
// UI offers a move the server forbids (e.g. an adjuster approving an over-limit
// claim), the server's 403 + rule text is surfaced, which is the whole point.

export type Role = "adjuster" | "claims_manager" | "viewer";
export type ClaimState = "submitted" | "in_review" | "approved" | "denied" | "paid";

export const ROLE_LABEL: Record<Role, string> = {
  adjuster: "Adjuster",
  claims_manager: "Claims manager",
  viewer: "Viewer",
};

/** Allowed next states per current state (the legal edges the engine enforces). */
export const NEXT_STATES: Record<ClaimState, ClaimState[]> = {
  submitted: ["in_review", "denied"],
  in_review: ["approved", "denied"],
  approved: ["paid"],
  denied: [],
  paid: [],
};

const TRANSITION_LABEL: Record<ClaimState, string> = {
  submitted: "Reopen", // not offered, present for completeness
  in_review: "Start review",
  approved: "Approve",
  denied: "Deny",
  paid: "Mark paid",
};

export interface ClaimAction {
  to: ClaimState;
  label: string;
}

/**
 * The action buttons to show for a claim in `state`, for a caller with `role`.
 * A claims_manager may perform any legal move; an adjuster may do anything
 * except mark a claim paid; a viewer gets none (read-only).
 */
export function actionsFor(state: ClaimState, role: Role): ClaimAction[] {
  return (NEXT_STATES[state] ?? [])
    .filter((to) => role === "claims_manager" || (role === "adjuster" && to !== "paid"))
    .map((to) => ({ to, label: TRANSITION_LABEL[to] }));
}

export const STATE_META: Record<ClaimState, { label: string; badge: string }> = {
  submitted: {
    label: "Submitted",
    badge: "border-zinc-500/30 bg-zinc-500/15 text-zinc-300",
  },
  in_review: {
    label: "In review",
    badge: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  },
  approved: {
    label: "Approved",
    badge: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  },
  denied: {
    label: "Denied",
    badge: "border-red-500/30 bg-red-500/15 text-red-300",
  },
  paid: {
    label: "Paid",
    badge: "border-sky-500/30 bg-sky-500/15 text-sky-300",
  },
};

export function stateMeta(state: string): { label: string; badge: string } {
  return STATE_META[state as ClaimState] ?? { label: state, badge: STATE_META.submitted.badge };
}

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function money(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return USD.format(Number.isFinite(n) ? n : 0);
}

export function whenFrom(createdAt: number | string | null | undefined): string {
  if (createdAt == null) return "";
  const ms = typeof createdAt === "string" ? Number(createdAt) : createdAt;
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
