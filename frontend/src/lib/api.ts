// The one contract: paths, request bodies, and response shapes are all derived
// from the xanots query defs. Change a def and the client follows — no
// hand-typed URL, no hand-mirrored response interface.
//
// Importing the lean query defs (no agent/stack-heavy graphs here) pulls the SDK
// runtime floor once; the types (`InferInput`/`InferResponse`) erase to nothing.

import type { InferInput, InferResponse } from "@xanots/sdk";

import { loginQuery } from "../../../xano/api/login.js";
import { fileClaimQuery } from "../../../xano/api/file.js";
import { transitionClaimQuery } from "../../../xano/api/transition.js";
import { assignClaimQuery } from "../../../xano/api/assign.js";
import { getClaimQuery } from "../../../xano/api/get.js";
import { listClaimsQuery } from "../../../xano/api/list.js";
import { listPoliciesQuery } from "../../../xano/api/policies.js";
import { listAdjustersQuery } from "../../../xano/api/adjusters.js";
import { seedResetQuery } from "../../../xano/api/seed.js";

/**
 * The deployed Xano backend's base URL. Injected as `window.XANO_HOST` by
 * `xanots deploy --static`, or read from `VITE_XANO_HOST` in dev.
 */
export const XANO_HOST: string =
  (typeof window !== "undefined" && (window as { XANO_HOST?: string }).XANO_HOST) ||
  import.meta.env.VITE_XANO_HOST ||
  "";

// ── Types derived from the defs ──────────────────────────────────────────────
export type LoginBody = InferInput<typeof loginQuery>;
export type LoginResponse = InferResponse<typeof loginQuery>;
export type SessionUser = NonNullable<LoginResponse["user"]>;

export type Claim = InferResponse<typeof listClaimsQuery>[number];
export type ClaimDetail = InferResponse<typeof getClaimQuery>;
export type HistoryRow = ClaimDetail["history"][number];
export type Policy = InferResponse<typeof listPoliciesQuery>[number];
export type Adjuster = InferResponse<typeof listAdjustersQuery>[number];

export type FileClaimBody = InferInput<typeof fileClaimQuery>;
export type TransitionBody = InferInput<typeof transitionClaimQuery>;
export type AssignBody = InferInput<typeof assignClaimQuery>;

// ── Session token ────────────────────────────────────────────────────────────
const TOKEN_KEY = "cwsm_token";
let authToken: string | null =
  typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

export function setToken(token: string | null): void {
  authToken = token;
  if (typeof localStorage === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
export function getToken(): string | null {
  return authToken;
}

/** An HTTP error carrying the status and the backend's message (the rule text). */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function call<T>(
  path: string,
  method: string,
  body?: unknown,
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (auth && authToken) headers["authorization"] = `Bearer ${authToken}`;
  const res = await fetch(XANO_HOST + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : "") || `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

// ── Endpoint wrappers ────────────────────────────────────────────────────────
export const login = (body: LoginBody) =>
  call<LoginResponse>(loginQuery.getPath(), loginQuery.verb, body, false);

export const listClaims = (state?: string) =>
  call<Claim[]>(
    listClaimsQuery.getPath() + (state ? `?state=${encodeURIComponent(state)}` : ""),
    listClaimsQuery.verb,
  );

export const getClaim = (id: number) =>
  call<ClaimDetail>(
    getClaimQuery.getPath({ params: { claim_id: String(id) } }),
    getClaimQuery.verb,
  );

export const fileClaim = (body: FileClaimBody) =>
  call<Claim>(fileClaimQuery.getPath(), fileClaimQuery.verb, body);

export const transitionClaim = (body: TransitionBody) =>
  call<Claim>(transitionClaimQuery.getPath(), transitionClaimQuery.verb, body);

export const assignClaim = (body: AssignBody) =>
  call<Claim>(assignClaimQuery.getPath(), assignClaimQuery.verb, body);

export const listPolicies = () =>
  call<Policy[]>(listPoliciesQuery.getPath(), listPoliciesQuery.verb);

export const listAdjusters = () =>
  call<Adjuster[]>(listAdjustersQuery.getPath(), listAdjustersQuery.verb);

export const seedReset = () =>
  call<{ ok: boolean }>(seedResetQuery.getPath(), seedResetQuery.verb, undefined, false);
