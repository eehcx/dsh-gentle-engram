import { randomUUID } from "node:crypto";

//#region src/index.ts
const name = "dsh-gentle-engram";
const inject = ["tools"];
const DEFAULTS = {
	serverName: "engram",
	contextLimit: 8e3,
	captureToolResults: true
};
const CAPTURE_LIMIT = 4e3;
const REDACTED = "[REDACTED]";
const TRUNCATION_MARKER = "...[truncated by dsh-gentle-engram]";
function createInjectedMessage(text) {
	return {
		id: randomUUID(),
		role: "user",
		content: [{
			type: "text",
			text
		}],
		source: {
			kind: "plugin",
			plugin: name
		}
	};
}
function sessionIdOf(agent) {
	return typeof agent?.id === "string" ? agent.id : void 0;
}
function directoryOf(agent) {
	try {
		const directory = agent?.session?.requestHeader?.()?.cwd;
		return typeof directory === "string" && directory.trim() ? directory : void 0;
	} catch {
		return;
	}
}
function isToolFailure(result) {
	return !result || result.isError === true;
}
function isUserOriginatedMessage(value) {
	if (!value || typeof value !== "object") return false;
	try {
		const message = value;
		const source = message.source;
		return message.role === "user" && !!source && typeof source === "object" && Object.hasOwn(source, "kind") && source.kind === "user";
	} catch {
		return false;
	}
}
function redactPrivateText(text) {
	let output = "";
	let visibleFrom = 0;
	let depth = 0;
	for (const match of text.matchAll(/<\/?private>/gi)) {
		const index = match.index ?? 0;
		if (!match[0].startsWith("</")) {
			if (depth === 0) output += `${text.slice(visibleFrom, index)}${REDACTED}`;
			depth++;
		} else if (depth > 0) {
			depth--;
			if (depth === 0) visibleFrom = index + match[0].length;
		}
	}
	if (depth === 0) output += text.slice(visibleFrom);
	return output;
}
function textOf(value) {
	if (typeof value === "string") return value;
	if (!value || typeof value !== "object") return "";
	const record = value;
	if (typeof record.text === "string") return record.text;
	if (Array.isArray(record.content)) return record.content.filter((item) => !!item && typeof item === "object" && item.type === "text").map((item) => typeof item.text === "string" ? item.text : "").filter(Boolean).join("\n");
	return "";
}
function bounded(text, limit) {
	return text.length <= limit ? text : `${text.slice(0, Math.max(0, limit - 120))}\n${TRUNCATION_MARKER}`;
}
function isTrivialLearning(text) {
	const trimmed = text.trim();
	return trimmed.length <= 3 || /^(?:ok(?:ay)?|done|success(?:ful)?|complete(?:d)?|true|false|no output|n\/a|none)[.!?]*$/i.test(trimmed);
}
function keyLearningsFrom(text) {
	const lines = text.split(/\r?\n/);
	const heading = lines.findIndex((line) => line.trim() === "## Key Learnings:");
	if (heading < 0) return void 0;
	const learnings = [];
	for (const line of lines.slice(heading + 1)) {
		const trimmed = line.trim();
		if (/^#{1,6}\s/.test(trimmed)) break;
		const item = trimmed.match(/^(?:[-*]|\d+[.)])\s+(.+?)\s*$/)?.[1];
		if (item && !isTrivialLearning(item)) learnings.push(item.trim());
	}
	return learnings.length ? `## Key Learnings:\n${learnings.map((item) => `- ${item}`).join("\n")}` : void 0;
}
function apply(ctx, rawConfig = {}) {
	const config = {
		...DEFAULTS,
		...rawConfig
	};
	const tools = ctx.tools;
	const sessions = /* @__PURE__ */ new WeakMap();
	const tails = /* @__PURE__ */ new WeakMap();
	const call = (agent, rawName, args) => {
		const id = sessionIdOf(agent);
		if (!id || !agent) return Promise.resolve(void 0);
		const publicName = `mcp__${config.serverName}__${rawName}`;
		if (!tools.get(publicName, agent)) return Promise.resolve(void 0);
		const operation = async () => tools.execute({
			callId: `engram-${randomUUID()}`,
			name: publicName,
			arguments: args,
			agent,
			signal: new AbortController().signal
		});
		const next = (tails.get(agent) || Promise.resolve()).catch(() => void 0).then(operation);
		tails.set(agent, next.catch(() => void 0));
		return next.catch((error) => {
			ctx.logger?.warn(`engram ${rawName} failed for ${id}: ${String(error)}`);
		});
	};
	const callWhenReady = (agent, rawName, args) => {
		const state = agent ? sessions.get(agent) : void 0;
		if (!agent || !state || state.disposed) return Promise.resolve(void 0);
		return state.ready.then((ready) => ready && !state.disposed ? call(agent, rawName, args) : void 0);
	};
	const contextText = async (agent) => {
		return bounded(textOf(await call(agent, "mem_context", {})), config.contextLimit);
	};
	ctx.on("agent/session-start", (payload) => {
		const { agent } = payload;
		const id = sessionIdOf(agent);
		if (sessions.has(agent)) return;
		const directory = directoryOf(agent);
		const state = {
			ready: Promise.resolve(false),
			started: false,
			disposed: false
		};
		sessions.set(agent, state);
		if (!id || !directory) return;
		state.ready = call(agent, "mem_session_start", {
			id,
			directory
		}).then((result) => {
			if (isToolFailure(result)) return false;
			state.started = true;
			return true;
		});
		state.ready.then(async (ready) => {
			if (!ready || state.disposed) return;
			const context = await contextText(agent);
			if (context && !state.disposed) agent.inject(createInjectedMessage(`Relevant persistent Engram context for this session:

${context}`));
		});
	});
	ctx.on("agent/inbox/inserted", (payload) => {
		const state = sessions.get(payload.agent);
		if (!state || state.disposed || !isUserOriginatedMessage(payload.message)) return;
		const content = bounded(redactPrivateText(textOf(payload.message)), CAPTURE_LIMIT);
		if (content.length <= 10 || content.includes("Relevant persistent Engram context")) return;
		callWhenReady(payload.agent, "mem_save_prompt", {
			content,
			session_id: sessionIdOf(payload.agent)
		});
	});
	ctx.on("tools/result", (exec, result) => {
		if (!config.captureToolResults || !exec.agent || exec.name.startsWith(`mcp__${config.serverName}__`)) return;
		const state = sessions.get(exec.agent);
		if (!state || state.disposed || !result || typeof result !== "object" || isToolFailure(result)) return;
		const rawOutput = redactPrivateText(textOf(result));
		const output = bounded(rawOutput, CAPTURE_LIMIT);
		if (!output || /password|token|secret/i.test(output)) return;
		const content = keyLearningsFrom(output);
		if (!content) return;
		const boundedContent = bounded(redactPrivateText(rawOutput.length > CAPTURE_LIMIT ? `${content}\n${TRUNCATION_MARKER}` : content), CAPTURE_LIMIT);
		callWhenReady(exec.agent, "mem_capture_passive", {
			content: boundedContent,
			session_id: sessionIdOf(exec.agent),
			source: "dsh-tools-result"
		});
	});
	ctx.on("agent/turn-stopping", (payload) => {
		const { agent } = payload;
		const state = sessions.get(agent);
		if (!state) return tails.get(agent) || void 0;
		return state.ready.then(() => tails.get(agent) || void 0);
	});
	ctx.on("agent/disposed", (payload) => {
		const { agent } = payload;
		const id = sessionIdOf(agent);
		const state = sessions.get(agent);
		if (!id || !state || state.disposed) return;
		state.disposed = true;
		state.ready.then(async (ready) => {
			if (!ready || !state.started) return;
			try {
				await call(agent, "mem_session_summary", {
					content: `## Goal\nPreserve the completed DeepSeek Harness session in Engram.\n\n## Accomplished\n- Session lifecycle and relevant tool activity were captured automatically.\n\n## Next Steps\n- Review the session memories when continuing work.\n\n## Relevant Files\n- Session ${id}`,
					session_id: id
				});
			} finally {
				await call(agent, "mem_session_end", {
					id,
					summary: "DeepSeek Harness session ended."
				});
			}
		}).finally(() => {
			sessions.delete(agent);
		});
	});
	ctx.get("systemPrompt")?.section({
		name: "engram:protocol",
		order: 40,
		text: "Engram memory is available through the mcp__engram__mem_* tools. At session start use the recovered context; save concise structured observations after meaningful decisions, fixes, and discoveries; use progressive disclosure (search, timeline, full observation); never store secrets or entire noisy tool outputs."
	});
	ctx.provide("engramMemory", {
		sessionIdOf,
		search: (agent, query) => callWhenReady(agent, "mem_search", { query }),
		save: (agent, args) => callWhenReady(agent, "mem_save", {
			...args,
			session_id: sessionIdOf(agent)
		})
	});
}

//#endregion
export { apply, inject, name };