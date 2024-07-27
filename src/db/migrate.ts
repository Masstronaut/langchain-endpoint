import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.ts";
import { env } from "../env.ts";

const migrationClient = postgres(
	env.DATABASE_URL,
	{
		max: 5,
		ssl: "require",
	},
);
const db = drizzle(migrationClient, { schema });
try {
	await migrate(db, { migrationsFolder: "./db/migrations" });
	console.log(`migrations applied.`);
} catch (e) {
	console.log("migration error:", e);
} finally {
	await migrationClient.end();
}
