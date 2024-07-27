import { z } from "zod";
import { app } from "./agent/agent.ts";
import { nanoid } from "nanoid";

const requestSchema = z.object({
	scenario: z.string(),
	thread_id: z.string().optional(),
});

Deno.serve(async (request) => {
	if (request.method !== "POST") {
		return new Response("Invalid request. Only POST requests are allowed.", {
			status: 400,
		});
	}
	const url = new URL(request.url);

	if (url.pathname !== "/skit") {
		return new Response(
			"Invalid request. Only POST requests to /skit are allowed.",
			{
				status: 400,
			},
		);
	}
	const parseResult = requestSchema.safeParse(await request.json());
	if (!parseResult.success) {
		return new Response(
			"Invalid request. The request body is required and must be in JSON format with the required string field 'query' and optional string field 'thread_id' to continue a previous conversation.",
			{ status: 400 },
		);
	}
	const scenario = parseResult.data.scenario;
	const thread_id = parseResult.data.thread_id || `thread_${nanoid()}`;

	const responseBody = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			const enqueueMessage = (event: string, data: string) => {
				controller.enqueue(
					encoder.encode(`event: ${event}\ndata: ${data}\n\n`),
				);
			};

			enqueueMessage(
				"init",
				`Initiating agent to ${
					parseResult.data.thread_id ? "continue" : "begin"
				} conversation thread ${thread_id}.`,
			);
			for await (
				const chunk of await app.stream(
					{ messages: [], topic: scenario },
					{
						configurable: {
							thread_id,
						},
						streamMode: "updates",
					},
				)
			) {
				enqueueMessage("stateupdate", JSON.stringify(chunk));
			}
			enqueueMessage("close", "Stream ended.");
			controller.close();
		},
	});

	return new Response(responseBody, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			"Connection": "keep-alive",
		},
	});
});
