import { apiGroup } from "@xanots/sdk";

// Canonical slugs are pinned so public paths stay stable and `getPath()` resolves
// in the browser bundle without a lock. A canonical is unique across the whole
// INSTANCE (not per workspace), so these are namespaced with the app id (`cwsm` =
// claims-workflow-state-machine) to avoid colliding with other generated apps
// that share an instance.
export const authApi = apiGroup({ name: "auth", canonical: "cwsm_auth" });
export const claimsApi = apiGroup({ name: "claims", canonical: "cwsm_claims" });
export const seedApi = apiGroup({ name: "seed", canonical: "cwsm_seed" });
