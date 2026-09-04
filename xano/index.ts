import { workspace } from "@xanots/sdk";

import { users } from "./tables/users.js";
import { policies } from "./tables/policies.js";
import { claims } from "./tables/claims.js";
import { claimTransitions } from "./tables/claim_transitions.js";
import { reserveLimits } from "./tables/reserve_limits.js";

import { authApi, claimsApi, seedApi } from "./api/groups.js";
import { loginQuery } from "./api/login.js";
import { fileClaimQuery } from "./api/file.js";
import { transitionClaimQuery } from "./api/transition.js";
import { assignClaimQuery } from "./api/assign.js";
import { getClaimQuery } from "./api/get.js";
import { listClaimsQuery } from "./api/list.js";
import { listPoliciesQuery } from "./api/policies.js";
import { listAdjustersQuery } from "./api/adjusters.js";
import { seedResetQuery } from "./api/seed.js";

/**
 * The claims-workflow-state-machine backend: a governed insurance claims stack
 * where each claim moves through an enforced state machine, illegal transitions
 * and over-threshold approvals are blocked at the API layer (RBAC), and every
 * move is written to a readable audit trail.
 */
export default workspace("claims-workflow-state-machine")
  .registerTables([users, policies, claims, claimTransitions, reserveLimits])
  .registerApiGroups([authApi, claimsApi, seedApi])
  .registerQueries([
    loginQuery,
    fileClaimQuery,
    transitionClaimQuery,
    assignClaimQuery,
    getClaimQuery,
    listClaimsQuery,
    listPoliciesQuery,
    listAdjustersQuery,
    seedResetQuery,
  ]);
