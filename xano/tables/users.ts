import { table, f } from "@xanots/sdk";

/**
 * The auth table that backs RBAC. `role` carries the caller's permissions into
 * every guarded endpoint (read server-side via `s.db.get_by_id(auth("id"))`),
 * and staff with `role = "adjuster"` are the assignable adjuster directory.
 *
 * Permissions are enforced at the API layer (RBAC), not by any row-level policy.
 */
export const users = table({
  name: "users",
  auth: true, // backs authentication (login mints a token against this table)
  schema: {
    email: f.email({ required: true }),
    password: f.password({ required: true }),
    name: f.text({ required: true }),
    role: f.enum(["adjuster", "claims_manager", "viewer"], { required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "email" }] }],
});
