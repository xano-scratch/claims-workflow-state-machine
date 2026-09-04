import { query, input, s, ref, inp, cmp, expr, col } from "@xanots/sdk";
import { claimsApi } from "./groups.js";
import { claims } from "../tables/claims.js";
import { users } from "../tables/users.js";

/**
 * GET /api:cwsm_claims/list — the queue view, optionally filtered by `state`.
 *
 * Each row is enriched with `adjuster_name` (left-joined). An empty/absent
 * `state` drops the predicate (`ignoreEmpty`) and returns every claim.
 */
export const listClaimsQuery = query({
  name: "list",
  verb: "GET",
  apiGroup: claimsApi,
  auth: users,
  input: { state: input.text({ required: false }) },
  stack: [
    s.db.query({
      table: claims,
      where: cmp(col("state"), "=", inp("state"), { ignoreEmpty: true }),
      bind: [{ table: users, as: "adj", join: "left", where: expr(col("assigned_adjuster_id"), "=", col("adj.id")) }],
      eval: [{ name: "adj.name", as: "adjuster_name" }],
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
