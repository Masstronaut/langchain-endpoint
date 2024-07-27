import {
	BaseCheckpointSaver,
	Checkpoint,
	CheckpointMetadata,
	CheckpointTuple,
} from "@langchain/langgraph";
import { DBClient } from "../db/index.ts";
import { RunnableConfig } from "@langchain/core";
import { checkpoint as checkpointTable } from "../db/schema.ts";
import { load } from "@langchain/core/load";
import { Buffer } from "node:buffer";

// define Postgres checkpointer
export class PostgresSaver extends BaseCheckpointSaver {
	private db: DBClient;

	constructor(db: DBClient) {
		super();
		this.db = db;
	}

	// below 3 methods are necessary for any checkpointer implementation: getTuple, list and put
	async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
		const { thread_id, checkpoint_id } = config.configurable || {};

		try {
			if (checkpoint_id) {
				const row = await this.db.query.checkpoint.findFirst({
					columns: { checkpoint: true, parentId: true, metadata: true },
					where: (checkpoint, { eq, and }) =>
						and(
							eq(checkpoint.threadId, thread_id),
							eq(checkpoint.checkpointId, checkpoint_id),
						),
				});
				if (row) {
					return {
						config,
						checkpoint: await load<Checkpoint>(row.checkpoint.toString()),
						metadata: await load<CheckpointMetadata>(row.metadata.toString()),
						parentConfig: row.parentId
							? {
								configurable: {
									thread_id,
									checkpoint_id: row.parentId,
								},
							}
							: undefined,
					};
				}
			} else {
				const row = await this.db.query.checkpoint.findFirst({
					columns: {
						checkpoint: true,
						parentId: true,
						metadata: true,
						threadId: true,
						checkpointId: true,
					},
					where: (checkpoint, { eq }) => eq(checkpoint.threadId, thread_id),
					orderBy: (checkpoint, { desc }) => desc(checkpoint.checkpointId),
				});
				if (row) {
					return {
						config: {
							configurable: {
								thread_id: row.threadId,
								checkpoint_id: row.checkpointId,
							},
						},
						checkpoint: await load<Checkpoint>(row.checkpoint.toString()),
						metadata: await load<CheckpointMetadata>(row.metadata.toString()),
						parentConfig: row.parentId
							? {
								configurable: {
									thread_id: row.threadId,
									checkpoint_id: row.parentId,
								},
							}
							: undefined,
					};
				}
			}
		} catch (error) {
			console.error("Error retrieving checkpoint", error);
			throw error;
		}

		return undefined;
	}

	async *list(
		config: RunnableConfig,
		limit?: number,
		before?: RunnableConfig,
	): AsyncGenerator<CheckpointTuple> {
		const { thread_id } = config.configurable || {};
		const rows = await this.db.query.checkpoint.findMany({
			where: (checkpoint, { eq, and, lt }) =>
				and(
					eq(checkpoint.threadId, thread_id),
					// if the before checkpoint_id is undefined, the lt than is ignored
					lt(checkpoint.checkpointId, before?.configurable?.checkpoint_id),
				),
			orderBy: (checkpoint, { desc }) => desc(checkpoint.checkpointId),
			limit,
		});

		try {
			for (const row of rows) {
				yield {
					config: {
						configurable: {
							thread_id: row.threadId,
							checkpoint_id: row.checkpointId,
						},
					},
					checkpoint: await load<Checkpoint>(row.checkpoint.toString()),
					metadata: await load<CheckpointMetadata>(row.metadata.toString()),
					parentConfig: row.parentId
						? {
							configurable: {
								thread_id: row.threadId,
								checkpoint_id: row.parentId,
							},
						}
						: undefined,
				};
			}
		} catch (error) {
			console.error("Error listing checkpoints", error);
			throw error;
		}
	}

	async put(
		config: RunnableConfig,
		checkpoint: Checkpoint,
		metadata: CheckpointMetadata,
	): Promise<RunnableConfig> {
		try {
			const checkpointColumn = Buffer.from(JSON.stringify(checkpoint));
			const metadataColumn = Buffer.from(JSON.stringify(metadata));
			await this.db.insert(checkpointTable).values({
				threadId: config.configurable?.thread_id,
				checkpointId: checkpoint.id,
				parentId: config.configurable?.checkpoint_id,
				checkpoint: checkpointColumn,
				metadata: metadataColumn,
			}).onConflictDoUpdate({
				set: {
					checkpoint: checkpointColumn,
					metadata: metadataColumn,
				},
				target: [checkpointTable.checkpointId, checkpointTable.threadId],
			});
		} catch (error) {
			console.error("Error saving checkpoint", error);
			throw error;
		}
		return {
			configurable: {
				thread_id: config.configurable?.thread_id,
				checkpoint_id: checkpoint.id,
			},
		};
	}
}
