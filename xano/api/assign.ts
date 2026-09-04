import { query, input, s, ref, inp, auth, c, expr, withFilters, fl } from "@xanots/sdk";
import { claimsApi } from "./groups.js";
import { claims } from "../tables/claims.js";
import { users } from "../tables/users.js";
import { claimTransitions } from "../tables/claim_transitions.js";

/**
 * POST /api:cwsm_claims/assign — assign an adjuster to a claim.
 *
 * Precondition: the caller is a claims_manager. The assignee must be a user with
 * `role = "adjuster"`. Records the assignment as a `claim_transitions` audit row
 * (state unchanged).
 */
export const assignClaimQuery = query({
  name: "assign",
  verb: "POST",
  apiGroup: claimsApi,
  auth: users,
  input: {
    claim_id: input.int({ required: true }),
    adjuster_id: input.int({ required: true }),
  },
  stack: [
    s.db.get_by_id({ table: users, id: auth("id"), as: "me" }),
    s.precondition({
      expr: expr(ref("me.role"), "=", c.text("claims_manager")),
      error: c.text("Only a claims manager can assign adjusters."),
      error_type: "accessdenied",
    }),
    s.db.get_by_id({ table: claims, id: inp("claim_id"), as: "claim" }),
    s.precondition({
      expr: expr(ref("claim", { safe: true }), "!=", c.null()),
      error: c.text("Claim not found."),
      error_type: "notfound",
    }),
    s.db.get_by_id({ table: users, id: inp("adjuster_id"), as: "assignee" }),
    s.precondition({
      expr: expr(ref("assignee", { safe: true }), "!=", c.null()),
      error: c.text("Assignee not found."),
      error_type: "notfound",
    }),
    s.precondition({
      expr: expr(ref("assignee.role"), "=", c.text("adjuster")),
      error: c.text("The assignee must be a user with the adjuster role."),
      error_type: "badrequest",
    }),
    s.db.edit({
      table: claims,
      fieldName: "id",
      fieldValue: inp("claim_id"),
      row: { assigned_adjuster_id: inp("adjuster_id") },
      as: "updated",
    }),
    s.db.add({
      table: claimTransitions,
      row: {
        claim_id: inp("claim_id"),
        from_state: ref("claim.state"),
        to_state: ref("claim.state"),
        actor_id: auth("id"),
        note: withFilters(c.text("Assigned adjuster: "), fl.concat(ref("assignee.name"))),
      },
      as: "audit",
    }),
  ],
  response: ref("updated"),
});
