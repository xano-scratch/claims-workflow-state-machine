import { query, s, ref, c } from "@xanots/sdk";
import { seedApi } from "./groups.js";
import { users } from "../tables/users.js";
import { policies } from "../tables/policies.js";
import { reserveLimits } from "../tables/reserve_limits.js";
import { claims } from "../tables/claims.js";
import { claimTransitions } from "../tables/claim_transitions.js";

/**
 * POST /api:cwsm_seed/reset — truncate every table (resetting id sequences) and
 * reseed a small, coherent fixture so the environment is immediately browsable
 * and the demo flow is reproducible. Public on purpose (a reviewer can reset).
 *
 * Foreign keys are wired from each insert's `as` output, so the fixture does not
 * depend on hardcoded ids. Passwords are the plaintext `demo1234` — the column
 * hashes on write, so the seeded accounts log in like any other. These are
 * deliberately public demo credentials.
 */
export const seedResetQuery = query({
  name: "reset",
  verb: "POST",
  apiGroup: seedApi,
  auth: false,
  stack: [
    // Wipe children first; reset restarts the id sequences.
    s.db.truncate({ table: claimTransitions, reset: true }),
    s.db.truncate({ table: claims, reset: true }),
    s.db.truncate({ table: reserveLimits, reset: true }),
    s.db.truncate({ table: policies, reset: true }),
    s.db.truncate({ table: users, reset: true }),

    // Users — one per role, two adjusters.
    s.db.add({ table: users, row: { email: "manager@demo.test", password: "demo1234", name: "Morgan Reyes", role: "claims_manager" }, as: "manager" }),
    s.db.add({ table: users, row: { email: "adjuster@demo.test", password: "demo1234", name: "Alex Turner", role: "adjuster" }, as: "adj1" }),
    s.db.add({ table: users, row: { email: "adjuster2@demo.test", password: "demo1234", name: "Priya Shah", role: "adjuster" }, as: "adj2" }),
    s.db.add({ table: users, row: { email: "viewer@demo.test", password: "demo1234", name: "Sam Rivera", role: "viewer" }, as: "viewer" }),

    // Reserve limits — adjuster capped low, manager high.
    s.db.add({ table: reserveLimits, row: { role: "adjuster", max_approval_amount: 5000 }, as: "rl_adj" }),
    s.db.add({ table: reserveLimits, row: { role: "claims_manager", max_approval_amount: 100000 }, as: "rl_mgr" }),

    // Policies.
    s.db.add({ table: policies, row: { policy_number: "POL-24001", holder_name: "Dana Whitfield", coverage_limit: 50000, status: "active" }, as: "p1" }),
    s.db.add({ table: policies, row: { policy_number: "POL-24002", holder_name: "Chris Nguyen", coverage_limit: 25000, status: "active" }, as: "p2" }),
    s.db.add({ table: policies, row: { policy_number: "POL-24003", holder_name: "Pat Morales", coverage_limit: 10000, status: "lapsed" }, as: "p3" }),

    // Claims spanning the state machine.
    //  c1 submitted, unassigned, within an adjuster's reserve limit.
    //  c2 in_review, ABOVE the adjuster limit (an adjuster is blocked; a manager approves).
    //  c3 approved, ready to be marked paid by a manager.
    s.db.add({ table: claims, row: { policy_id: ref("p1.id"), claimant_name: "Dana Whitfield", amount_claimed: 3200, reserve_amount: 3200, state: "submitted", assigned_adjuster_id: 0 }, as: "c1" }),
    s.db.add({ table: claims, row: { policy_id: ref("p1.id"), claimant_name: "Dana Whitfield", amount_claimed: 18000, reserve_amount: 18000, state: "in_review", assigned_adjuster_id: ref("adj1.id") }, as: "c2" }),
    s.db.add({ table: claims, row: { policy_id: ref("p2.id"), claimant_name: "Chris Nguyen", amount_claimed: 2400, reserve_amount: 2400, state: "approved", assigned_adjuster_id: ref("adj1.id") }, as: "c3" }),

    // Audit trail for the pre-advanced claims.
    s.db.add({ table: claimTransitions, row: { claim_id: ref("c1.id"), from_state: "", to_state: "submitted", actor_id: ref("adj1.id"), note: "Claim filed." }, as: "t1" }),
    s.db.add({ table: claimTransitions, row: { claim_id: ref("c2.id"), from_state: "", to_state: "submitted", actor_id: ref("adj1.id"), note: "Claim filed." }, as: "t2" }),
    s.db.add({ table: claimTransitions, row: { claim_id: ref("c2.id"), from_state: "submitted", to_state: "in_review", actor_id: ref("adj1.id"), note: "Started review." }, as: "t3" }),
    s.db.add({ table: claimTransitions, row: { claim_id: ref("c3.id"), from_state: "", to_state: "submitted", actor_id: ref("adj1.id"), note: "Claim filed." }, as: "t4" }),
    s.db.add({ table: claimTransitions, row: { claim_id: ref("c3.id"), from_state: "submitted", to_state: "in_review", actor_id: ref("adj1.id"), note: "Started review." }, as: "t5" }),
    s.db.add({ table: claimTransitions, row: { claim_id: ref("c3.id"), from_state: "in_review", to_state: "approved", actor_id: ref("adj1.id"), note: "Approved within reserve limit." }, as: "t6" }),
  ],
  response: { ok: c.bool(true), users: c.int(4), policies: c.int(3), claims: c.int(3) },
});
