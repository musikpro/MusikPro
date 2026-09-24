import "server-only";

/**
 * Re-exports the untagged implementation so app code keeps the client-bundling guard.
 * The "server-only" package throws unconditionally when actually executed (not just when
 * bundled for a client component), so standalone tooling (e.g. scripts/i18n-sync.mts, which
 * runs outside Next's webpack build) must import ./secrets-core directly instead of this file.
 */
export * from "./secrets-core";
