// Loads local environment files for Prisma CLI commands and the seed script.
// Prisma 7 no longer loads .env automatically. Variables already set in the
// process environment (e.g. on Railway) take precedence; .env.local wins over .env.
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
