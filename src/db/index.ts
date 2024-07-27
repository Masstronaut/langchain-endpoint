import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "./schema.ts";

import { env } from "../env.ts";

// for query purposes
const queryClient = postgres(env.DATABASE_URL, { ssl: "require" });

// @ts-expect-error the queryClient type doesn't match expectations because it's a deno port of the same postgresjs package.
export const db = drizzle(queryClient, { schema });

export type DBClient = typeof db;
