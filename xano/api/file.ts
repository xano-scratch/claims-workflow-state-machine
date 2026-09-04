import { query, input, s, ref, inp, auth, c, expr } from "@xanots/sdk";
import { claimsApi } from "./groups.js";
import { policies } from "../tables/policies.js";
import { claims } from "../tables/claims.js";
import { claimTransitions } from "../tables/claim_transitions.js";
import { users } from "../tables/users.js";

/**
 * POST /api:cwsm_claims/file — file a new claim in `submitted`.
 *
 * Preconditions: authenticated; the policy exists and is `active`; the claim
 * amount is within the policy coverage limit. On success it writes the claim and
 * the first `claim_transitions` audit row.
 */
export const fileClaimQuery = query({
  name: "file",
  verb: "POST",
  apiGroup: claimsApi,
  auth: users,
  input: {
    policy_id: input.int({ required: true }),
    claimant_name: input.text({ required: true }),
    amount_claimed: input.decimal({ required: true }),
    reserve_amount: input.decimal({ required: false, default: 0 }),
  },
  stack: [
    s.db.get_by_id({ table: policies, id: inp("policy_id"), as: "policy" }),
    s.precondition({
      expr: expr(ref("policy", { safe: true }), "!=", c.null()),
      error: c.text("Policy not found."),
      error_type: "notfound",
    }),
    s.precondition({
      expr: expr(ref("policy.status"), "=", c.text("active")),
      error: c.text("Policy is not active — a claim can only be filed against an active policy."),
      error_type: "badrequest",
    }),
    s.precondition({
      expr: expr(inp("amount_claimed"), "<=", ref("policy.coverage_limit")),
      error: c.text("Claim amount exceeds the policy coverage limit."),
      error_type: "badrequest",
    }),
    s.db.add({
      table: claims,
      row: {
        policy_id: inp("policy_id"),
        claimant_name: inp("claimant_name"),
        amount_claimed: inp("amount_claimed"),
        reserve_amount: inp("reserve_amount"),
        state: "submitted",
        assigned_adjuster_id: 0, // unassigned sentinel
      },
      as: "claim",
    }),
    s.db.add({
      table: claimTransitions,
      row: {
        claim_id: ref("claim.id"),
        from_state: "",
        to_state: "submitted",
        actor_id: auth("id"),
        note: "Claim filed.",
      },
      as: "audit",
    }),
  ],
  response: ref("claim"),
});
