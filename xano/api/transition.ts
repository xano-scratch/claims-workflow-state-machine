import { query, input, s, ref, inp, auth, c, expr, and, or } from "@xanots/sdk";
import { claimsApi } from "./groups.js";
import { claims } from "../tables/claims.js";
import { users } from "../tables/users.js";
import { reserveLimits } from "../tables/reserve_limits.js";
import { claimTransitions } from "../tables/claim_transitions.js";

/**
 * POST /api:cwsm_claims/transition — the state-machine engine.
 *
 * Guards run in order, and the FIRST to fail returns a 403 naming the rule:
 *   1. legal edge  — `to_state` is an allowed next state for the current state.
 *   2. role        — the caller's role may perform this move.
 *   3. reserve     — an approval is at/under the caller role's reserve limit.
 * On pass it updates `state` and appends a `claim_transitions` audit row.
 *
 * The whole check lives in the API layer (RBAC), not in any row-level policy.
 */
export const transitionClaimQuery = query({
  name: "transition",
  verb: "POST",
  apiGroup: claimsApi,
  auth: users,
  input: {
    claim_id: input.int({ required: true }),
    to_state: input.enum(["in_review", "approved", "denied", "paid"], { required: true }),
    note: input.text({ required: false, default: "" }),
  },
  stack: [
    // The acting user's role is read from the DB (authoritative), not the token.
    s.db.get_by_id({ table: users, id: auth("id"), as: "me" }),
    s.db.get_by_id({ table: claims, id: inp("claim_id"), as: "claim" }),
    s.precondition({
      expr: expr(ref("claim", { safe: true }), "!=", c.null()),
      error: c.text("Claim not found."),
      error_type: "notfound",
    }),

    // GUARD 1 — legal edge in the state machine.
    s.precondition({
      expr: or(
        and(expr(ref("claim.state"), "=", c.text("submitted")), expr(inp("to_state"), "=", c.text("in_review"))),
        and(expr(ref("claim.state"), "=", c.text("submitted")), expr(inp("to_state"), "=", c.text("denied"))),
        and(expr(ref("claim.state"), "=", c.text("in_review")), expr(inp("to_state"), "=", c.text("approved"))),
        and(expr(ref("claim.state"), "=", c.text("in_review")), expr(inp("to_state"), "=", c.text("denied"))),
        and(expr(ref("claim.state"), "=", c.text("approved")), expr(inp("to_state"), "=", c.text("paid"))),
      ),
      error: c.text("Illegal transition — that is not an allowed move from the claim's current state."),
      error_type: "accessdenied",
    }),

    // GUARD 2 — the caller's role may perform this move.
    // A claims_manager may perform any legal move; an adjuster may do anything
    // except mark a claim `paid`; a viewer is read-only (neither branch).
    s.precondition({
      expr: or(
        expr(ref("me.role"), "=", c.text("claims_manager")),
        and(expr(ref("me.role"), "=", c.text("adjuster")), expr(inp("to_state"), "!=", c.text("paid"))),
      ),
      error: c.text("Your role is not permitted to perform this transition."),
      error_type: "accessdenied",
    }),

    // GUARD 3 — reserve limit, only when approving.
    s.conditional({
      when: expr(inp("to_state"), "=", c.text("approved")),
      then: [
        s.db.get({ table: reserveLimits, fieldName: "role", fieldValue: ref("me.role"), as: "limit" }),
        s.precondition({
          expr: expr(ref("limit", { safe: true }), "!=", c.null()),
          error: c.text("No reserve approval limit is configured for your role."),
          error_type: "accessdenied",
        }),
        s.precondition({
          expr: expr(ref("claim.amount_claimed"), "<=", ref("limit.max_approval_amount")),
          error: c.text("Approval blocked — the claim amount exceeds your role's reserve approval limit."),
          error_type: "accessdenied",
        }),
      ],
    }),

    // Apply the move and append the audit row (from_state captured pre-edit).
    s.db.edit({
      table: claims,
      fieldName: "id",
      fieldValue: inp("claim_id"),
      row: { state: inp("to_state") },
      as: "updated",
    }),
    s.db.add({
      table: claimTransitions,
      row: {
        claim_id: inp("claim_id"),
        from_state: ref("claim.state"),
        to_state: inp("to_state"),
        actor_id: auth("id"),
        note: inp("note"),
      },
      as: "audit",
    }),
  ],
  response: ref("updated"),
});
