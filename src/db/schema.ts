// import {
// 	jsonb,
// 	pgTable,
// 	primaryKey,
// 	text,
// 	uniqueIndex,
// } from "drizzle-orm/pg-core";
// import type { Checkpoint, CheckpointMetadata } from "@langchain/core";

// export const checkpoint = pgTable("checkpoint", {
// 	threadId: text("thread_id").notNull(),
// 	checkpointId: text("checkpoint_id").notNull(),
// 	parentId: text("parent_id"),
// 	checkpoint: jsonb("checkpoint").$type<Checkpoint>().notNull(),
// 	metadata: jsonb("metadata").$type<CheckpointMetadata>().notNull(),
// }, (table) => {
// 	return {
// 		pk: primaryKey({ columns: [table.threadId, table.checkpointId] }),
// 	};
// });

// export type SelectCheckpoint = typeof checkpoint.$inferSelect;
// export type InsertCheckpoint = typeof checkpoint.$inferInsert;

import { pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { bytea } from "./bytea.ts";

export const checkpoint = pgTable("checkpoint", {
	threadId: text("thread_id").notNull(),
	checkpointId: text("checkpoint_id").notNull(),
	parentId: text("parent_id"),
	checkpoint: bytea("checkpoint").notNull(),
	metadata: bytea("metadata").notNull(),
}, (table) => {
	return {
		pk: primaryKey({ columns: [table.threadId, table.checkpointId] }),
	};
});

export type SelectCheckpoint = typeof checkpoint.$inferSelect;
export type InsertCheckpoint = typeof checkpoint.$inferInsert;
