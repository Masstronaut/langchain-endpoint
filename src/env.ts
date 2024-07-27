// import { load } from "@std/dotenv";
// export const env = (await load({ envPath: ".env" })) as Record<
// 	"OPENAI_API_KEY" | "DATABASE_URL",
// 	string
// >;

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const DATABASE_URL = Deno.env.get("DATABASE_URL");

if (!OPENAI_API_KEY) {
	throw new Error(
		"An OPENAI_API_KEY environment variable is required and not found.",
	);
}
if (!DATABASE_URL) {
	throw new Error(
		"A DATABASE_URL environment variable is required and not found.",
	);
}

const env = {
	OPENAI_API_KEY,
	DATABASE_URL,
};
export { env };
