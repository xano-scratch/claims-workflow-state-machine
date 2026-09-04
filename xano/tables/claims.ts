import { table, f } from "@xanots/sdk";
import { policies } from "./policies.js";
import { users } from "./users.js";

/**
 * A claim moving through the enforced state machine:
 *   submitted → in_review → approved → paid
 *                        ↘ denied
 * `state` transitions are guarded by `claims/transition`. `assigned_adjuster_id`
 * uses the `0` sentinel for "unassigned" (an optional foreign key stores an int,
 * and a null in it is unqueryable — see the SDK fields guide).
 */
export const claims = table({
  name: "claims",
  schema: {
    policy_id: f.tableRef(policies, { required: true }),
    claimant_name: f.text({ required: true }),
    amount_claimed: f.decimal({ required: true }),
    reserve_amount: f.decimal({ default: 0 }),
    state: f.enum(["submitted", "in_review", "approved", "denied", "paid"], {
      required: true,
    }),
    assigned_adjuster_id: f.tableRef(users, { required: true, default: 0 }),
  },
});
