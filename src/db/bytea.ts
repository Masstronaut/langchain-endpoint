import { customType } from "drizzle-orm/pg-core";
import { Buffer } from "node:buffer";

export const bytea = customType<
	{ data: Buffer; notNull: false; default: false }
>({
	dataType() {
		return "bytea";
	},
});
