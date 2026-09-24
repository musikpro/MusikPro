import "server-only";

// See secrets.ts for why this re-exports an untagged core module instead of holding the
// implementation directly: standalone tooling (scripts/i18n-sync.mts) needs to import the
// real logic without triggering the "server-only" package's unconditional runtime throw.
export * from "./provider-core";
