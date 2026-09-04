import { table, f } from "@xanots/sdk";

/**
 * Maps a role to the largest claim it may approve. An adjuster is capped low, a
 * claims_manager high; the `claims/transition` engine blocks an approval whose
 * `amount_claimed` exceeds the caller role's `max_approval_amount`. Looked up by
 * `role`, so `role` is unique.
 */
export const reserveLimits = table({
  name: "reserve_limits",
  schema: {
    role: f.enum(["adjuster", "claims_manager"], { required: true }),
    max_approval_amount: f.decimal({ required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "role" }] }],
});
