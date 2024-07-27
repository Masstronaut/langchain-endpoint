import { HumanMessage } from "@langchain/core/messages";

import { ChatOpenAI } from "@langchain/openai";
import { START, StateGraph, StateGraphArgs } from "@langchain/langgraph";

import { PostgresSaver } from "./postgrescheckpointer.ts";
import { db } from "../db/index.ts";
import { SystemMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
// Define the state interface
interface AgentState {
	messages: Array<HumanMessage>;
	topic: string;
}

/**
 * Rough workflow outline:
 * 1. The host introduces the show to the audience and asks the audience for a topic for today's skit.
 * 2. The audience (human participant) provides a topic.
 * 3. The host sets the scene for the skit.
 * 4. The comedians take turns acting out the scene, taking two turns each.
 * 5. The audience can provide a new topic or twist for the scene.
 * 6. continue from step 3.
 */

// Defines the graph state reducer
// It concatenate all messages into a single chat history,
// and uses the most recently provided topic.
const graphState: StateGraphArgs<AgentState>["channels"] = {
	messages: {
		value: (x: HumanMessage[], y: HumanMessage[]) => x.concat(y),
		default: () => [],
	},
	topic: {
		value: (x: string, y: string) => y ?? x ?? "",
		default: () => "",
	},
};

const model = new ChatOpenAI({
	model: "gpt-4o-mini",
	temperature: 1,
});

const systemPrompt = await ChatPromptTemplate.fromMessages([
	[
		"system",
		"You are a famed comedian participating in a hilarious new live improv show starring some of the greatest comedians of all time." +
		" A member of the audience will provide a topic for a scene." +
		" One comedian will act as the host, who is responsible for setting the scene for a skit two other comedians will act out." +
		" The two comedians performing the skit will take turns acting out the scene." +
		" Each of the two acting comedians will act out the scene started by the host, playing off the other comedian for two rounds." +
		" After the two rounds, the host will step in and ask the audience how to continue the scene." +
		" The audience will provide a new topic for the scene, and the comedians will continue the skit with the new topic." +
		"\n\n{systemMessage}",
	],
]);
const hostPrompt = await systemPrompt.format({
	systemMessage:
		"You are Sarah Silverman, the host comedian for the skit. Start things off by introducing the show to the audience" +
		" and asking them to provide a topic for the show. Once asking, stop your response immediately until you are provided with the topic." +
		" After you are provided the topic prompt, use that prompt to describe the scene for a skit. After describing the scene, stop responding immediately." +
		" You will be provided with the back and forth of the two comedians." +
		` Only speak as the host. Do not break character, and do not try to take actions or speak lines as the other characters.` +
		` Act as though the show is happening live - speak and act in the present tense as if you are hosting a show with the other comedians currently on stage.`,
});

const chappellePrompt = await systemPrompt.format({
	systemMessage:
		`You are Dave Chappelle, the famous comedian. You are currently starring in a live improv show in front of a studio audience.` +
		` Begin all responses with your name followed by a colon, as if in a written film script. For example, "Chappelle: What's the deal with airline food?"` +
		` You are sharing the stage with another comedian. You are not to speak or act as the other comedian, only as yourself acting as one of the characters introduced by the host.` +
		` Play off whatever the other comedian is doing while sticking to the most recent topic provided by the audience.` +
		` Only respond as your own character as described by the host. Do not break character, and do not try to take actions or speak lines as the other characters.` +
		` The show is happening live: speak and act in the present tense. You are currently on stage with the other comedian, and need to create opportunities for them to introduce their own humor to the skit.`,
});

const burrPrompt = await systemPrompt.format({
	systemMessage:
		`You are Bill Burr, the famous comedian. You are currently starring in a live improv show in front of a studio audience.` +
		` Begin all responses with your name followed by a colon, as if in a written film script. For example, "Burr: What's the deal with airline food?"` +
		` You are sharing the stage with another comedian. You are not to speak or act as the other comedian, only as yourself acting as one of the characters introduced by the host.` +
		` Play off whatever the other comedian is doing while sticking to the most recent topic provided by the audience.` +
		` Only respond as your own character as described by the host. Do not break character, and do not try to take actions or speak lines as the other characters.` +
		` The show is happening live: speak and act in the present tense. You are currently on stage with the other comedian, and need to create opportunities for them to introduce their own humor to the skit.`,
});

async function comedianAgent(state: AgentState, systemPrompt: string) {
	// The message history is generated this way so each "comedian" can have a different system prompt and the same
	// message history for the improv skit.
	const messages = [
		new SystemMessage(systemPrompt),
		...state.messages,
	];
	const response = await model.invoke(messages);
	return { messages: [response] };
}
function audienceNode(state: AgentState) {
	const message = `Audience: ${state.topic}`;
	return { messages: [message], topic: "" };
}

const workflow = new StateGraph<AgentState>({ channels: graphState })
	.addNode(
		"hostIntro",
		(state: AgentState) =>
			state.messages.length > 0 ? {} : comedianAgent(state, hostPrompt),
	)
	.addEdge(START, "hostIntro")
	.addNode("audience", audienceNode)
	.addEdge("hostIntro", "audience")
	.addNode("hostScene", (state: AgentState) => comedianAgent(state, hostPrompt))
	.addEdge("audience", "hostScene")
	.addNode("burr", (state: AgentState) => comedianAgent(state, burrPrompt))
	.addEdge("hostScene", "burr")
	.addNode(
		"chappelle",
		(state: AgentState) => comedianAgent(state, chappellePrompt),
	)
	.addEdge("burr", "chappelle")
	.addNode("burr2", (state: AgentState) => comedianAgent(state, burrPrompt))
	.addEdge("chappelle", "burr2")
	.addNode(
		"chappelle2",
		(state: AgentState) => comedianAgent(state, chappellePrompt),
	)
	.addEdge("burr2", "chappelle2")
	.addEdge("chappelle2", "audience");

// Initialize memory to persist state between graph runs
const checkpointer = new PostgresSaver(db);

export const app = workflow.compile({
	checkpointer,
	interruptAfter: ["chappelle2"],
});
