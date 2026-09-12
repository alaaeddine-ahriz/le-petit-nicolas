// The client and every repository function live in `data/` (see ../../../../data/README.md),
// so `io/` and `brain/` can use them too. Re-exported here for convenience.
export { db as createAdminClient } from "@data/client";
export * from "@data/repository";
