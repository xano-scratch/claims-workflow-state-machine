import { query, input, s, ref, inp, c, expr } from "@xanots/sdk";
import { authApi } from "./groups.js";
import { users } from "../tables/users.js";

/**
 * POST /api:cwsm_auth/login — the RBAC seam.
 *
 * Verifies the submission against the users auth table and mints a token the
 * client sends as `Authorization: Bearer <token>` on every guarded call. The
 * password is taken as `input.text` (NOT `input.password`) so it is not
 * double-hashed before `check_password`.
 */
export const loginQuery = query({
  name: "login",
  verb: "POST",
  apiGroup: authApi,
  auth: false,
  input: {
    email: input.text({ required: true }),
    password: input.text({ required: true }),
  },
  stack: [
    // `output` MUST name password — the column is access:"internal" and is
    // otherwise absent from the row.
    s.db.get({
      table: users,
      fieldName: "email",
      fieldValue: inp("email"),
      output: ["id", "password"],
      as: "u",
    }),
    s.precondition({
      expr: expr(ref("u", { safe: true }), "!=", c.null()),
      error: c.text("Invalid email or password."),
      error_type: "unauthorized",
    }),
    s.security.check_password({
      text_password: inp("password"),
      hash_password: ref("u.password"),
      as: "ok",
    }),
    s.precondition({
      expr: expr(ref("ok"), "=", c.bool(true)),
      error: c.text("Invalid email or password."),
      error_type: "unauthorized",
    }),
    s.security.create_auth_token({ table: users, id: ref("u.id"), as: "token" }),
    // Re-read the row WITHOUT the internal password so the response is clean.
    s.db.get_by_id({ table: users, id: ref("u.id"), as: "me" }),
  ],
  response: { token: ref("token"), user: ref("me") },
});
