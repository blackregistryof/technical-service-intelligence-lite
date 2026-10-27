import "server-only";

// Server-only entry point for data access; see repository-instance.ts for why
// the repository is cached in module scope rather than on globalThis.
export { getRepository } from "./repository-instance";
