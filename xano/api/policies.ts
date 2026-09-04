import { query, s, ref } from "@xanots/sdk";
import { claimsApi } from "./groups.js";
import { policies } from "../tables/policies.js";
import { users } from "../tables/users.js";

/**
 * GET /api:cwsm_claims/policies — every policy, for the file-a-claim form's
 * policy picker (the form shows each policy's status + coverage limit).
 */
export const listPoliciesQuery = query({
  name: "policies",
  verb: "GET",
  apiGroup: claimsApi,
  auth: users,
  stack: [
    s.db.query({ table: policies, sort: [{ sortBy: "policy_number", dir: "asc" }], as: "rows" }),
  ],
  response: ref("rows"),
});
