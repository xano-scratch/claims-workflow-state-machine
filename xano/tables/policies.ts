import { table, f } from "@xanots/sdk";

/**
 * The insurance policies a claim is filed against. A claim can only be filed on
 * an `active` policy, and its amount must sit within the policy `coverage_limit`
 * — both enforced by the `claims/file` endpoint.
 */
export const policies = table({
  name: "policies",
  schema: {
    policy_number: f.text({ required: true }),
    holder_name: f.text({ required: true }),
    coverage_limit: f.decimal({ required: true }),
    status: f.enum(["active", "lapsed"], { required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "policy_number" }] }],
});
