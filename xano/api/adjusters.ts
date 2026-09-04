import { query, s, ref, c, col, expr } from "@xanots/sdk";
import { claimsApi } from "./groups.js";
import { users } from "../tables/users.js";

/**
 * GET /api:cwsm_claims/adjusters — the assignable adjuster directory (users with
 * `role = "adjuster"`), for the manager's assign control. `output` omits the
 * internal password column.
 */
export const listAdjustersQuery = query({
  name: "adjusters",
  verb: "GET",
  apiGroup: claimsApi,
  auth: users,
  stack: [
    s.db.query({
      table: users,
      where: expr(col("role"), "=", c.text("adjuster")),
      output: ["id", "name", "email", "role"],
      sort: [{ sortBy: "name", dir: "asc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
