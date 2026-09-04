import { table, f } from "@xanots/sdk";
import { claims } from "./claims.js";
import { users } from "./users.js";

/**
 * The immutable audit log. One row is appended per move (and per assignment),
 * never edited or deleted; `created_at` is the timeline a human reads on the
 * claim detail screen. This is the "trigger-quality audit log" the app proves.
 */
export const claimTransitions = table({
  name: "claim_transitions",
  schema: {
    claim_id: f.tableRef(claims, { required: true }),
    from_state: f.text(),
    to_state: f.text({ required: true }),
    actor_id: f.tableRef(users, { required: true }),
    note: f.text({ default: "" }),
  },
});
