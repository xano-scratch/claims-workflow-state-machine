import { query, input, s, ref, inp, c, expr, col } from "@xanots/sdk";
import { claimsApi } from "./groups.js";
import { claims } from "../tables/claims.js";
import { policies } from "../tables/policies.js";
import { users } from "../tables/users.js";
import { claimTransitions } from "../tables/claim_transitions.js";

/**
 * GET /api:cwsm_claims/get/{claim_id} — one claim joined to its policy, its
 * assigned adjuster (null when unassigned), and its full ordered transition
 * history (each row enriched with the actor's name + role). This is the audit
 * trail a human reads.
 *
 * The id is a PATH segment (a GET that looks one row up belongs in the path).
 */
export const getClaimQuery = query({
  name: "get/{claim_id}",
  verb: "GET",
  apiGroup: claimsApi,
  auth: users,
  input: { claim_id: input.int({ required: true }) },
  stack: [
    s.db.get_by_id({ table: claims, id: inp("claim_id"), as: "claim" }),
    s.precondition({
      expr: expr(ref("claim", { safe: true }), "!=", c.null()),
      error: c.text("Claim not found."),
      error_type: "notfound",
    }),
    s.db.get({ table: policies, fieldName: "id", fieldValue: ref("claim.policy_id"), as: "policy" }),
    // Field-match get binds null on the `0` sentinel (unassigned), where
    // get_by_id would 400 on id < 1.
    s.db.get({
      table: users,
      fieldName: "id",
      fieldValue: ref("claim.assigned_adjuster_id"),
      output: ["id", "name", "email", "role"],
      as: "adjuster",
    }),
    s.db.query({
      table: claimTransitions,
      where: expr(col("claim_id"), "=", inp("claim_id")),
      bind: [{ table: users, as: "actor", join: "left", where: expr(col("actor_id"), "=", col("actor.id")) }],
      eval: [
        { name: "actor.name", as: "actor_name" },
        { name: "actor.role", as: "actor_role" },
      ],
      sort: [{ sortBy: "created_at", dir: "asc" }],
      as: "history",
    }),
  ],
  response: {
    claim: ref("claim"),
    policy: ref("policy"),
    adjuster: ref("adjuster"),
    history: ref("history"),
  },
});
