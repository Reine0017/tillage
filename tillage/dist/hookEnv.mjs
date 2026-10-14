import { a as readPortfile, g as tillageHome } from "./lifecycle.mjs";
import { d as uncommittedPaths, n as runHook, s as headAndParent, t as parseHookInput } from "./hooks.mjs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
var PLUGIN_DATA_FALLBACK = join(homedir(), ".claude", "plugins", "data", "tillage");
function pluginDataDir(env = process.env) {
	const set = env["CLAUDE_PLUGIN_DATA"];
	return typeof set === "string" && set.trim() !== "" ? set : PLUGIN_DATA_FALLBACK;
}
var hookFs = {
	read(path) {
		try {
			return readFileSync(path, "utf8");
		} catch {
			return null;
		}
	},
	write(path, text) {
		try {
			mkdirSync(dirname(path), { recursive: true });
			writeFileSync(path, text, "utf8");
		} catch {}
	},
	remove(path) {
		try {
			rmSync(path, {
				recursive: true,
				force: true
			});
		} catch {}
	},
	sessionDirs(path) {
		let entries;
		try {
			entries = readdirSync(path, { withFileTypes: true });
		} catch {
			return [];
		}
		const dirs = [];
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			try {
				dirs.push({
					name: entry.name,
					mtimeMs: statSync(join(path, entry.name)).mtimeMs
				});
			} catch {}
		}
		return dirs;
	}
};
var DAEMON_TIMEOUT_MS = 1500;
function defaultWiring(ensure) {
	return {
		home: tillageHome(),
		dataDir: pluginDataDir(),
		ensure,
		readPort: readPortfile,
		fetch: (url, init) => globalThis.fetch(url, init),
		changedFiles: uncommittedPaths,
		head: headAndParent,
		now: () => Date.now()
	};
}
async function ask(wiring, port, path, body) {
	try {
		const res = await wiring.fetch(`http://127.0.0.1:${port}${path}`, {
			...body === void 0 ? {} : {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body)
			},
			signal: AbortSignal.timeout(DAEMON_TIMEOUT_MS)
		});
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}
function readBoundProject(body) {
	if (typeof body !== "object" || body === null || !("project" in body)) return null;
	const { project } = body;
	if (project === null) return { project: null };
	if (typeof project !== "object") return null;
	const { id, name, url, openNotes, root } = project;
	if (typeof id !== "string" || typeof name !== "string" || typeof url !== "string") return null;
	if (typeof openNotes !== "number") return null;
	if (typeof root !== "string" && root !== null) return null;
	return { project: {
		id,
		name,
		url,
		openNotes,
		root
	} };
}
function readBindings(body) {
	const list = body?.bindings;
	if (!Array.isArray(list)) return [];
	const out = [];
	for (const entry of list) {
		if (typeof entry !== "object" || entry === null) continue;
		const { nodeId, title, paths } = entry;
		if (typeof nodeId !== "string" || typeof title !== "string" || !Array.isArray(paths)) continue;
		out.push({
			nodeId,
			title,
			paths: paths.filter((p) => typeof p === "string")
		});
	}
	return out;
}
function readUnclaimed(body, asked) {
	const list = body?.unclaimed;
	if (!Array.isArray(list)) return null;
	return list.every((p) => typeof p === "string" && asked.includes(p)) ? list : null;
}
async function runHookCommand(moment, stdin, wiring) {
	const input = parseHookInput(stdin);
	if (input === null) return null;
	let pending = null;
	const port = async () => {
		pending ??= (async () => {
			try {
				if (moment === "session-start") return (await wiring.ensure()).port;
				return (await wiring.readPort(wiring.home))?.port ?? null;
			} catch {
				return null;
			}
		})();
		return await pending;
	};
	const output = await runHook(moment, input, {
		dataDir: wiring.dataDir,
		daemon: {
			boundProject: async (cwd) => {
				const p = await port();
				return p === null ? null : readBoundProject(await ask(wiring, p, `/api/bind?cwd=${encodeURIComponent(cwd)}`));
			},
			bindings: async (projectId) => {
				const p = await port();
				return p === null ? [] : readBindings(await ask(wiring, p, `/api/projects/${encodeURIComponent(projectId)}/bindings`));
			},
			unclaimed: async (cwd, paths) => {
				const p = await port();
				return p === null ? null : readUnclaimed(await ask(wiring, p, "/api/unclaimed", {
					cwd,
					paths
				}), paths);
			},
			reportCallFolder: async (callId, folder) => {
				const p = await port();
				if (p !== null) await ask(wiring, p, "/api/call-folder", {
					callId,
					folder
				});
			}
		},
		fs: hookFs,
		git: {
			changedFiles: wiring.changedFiles,
			head: wiring.head
		},
		now: wiring.now
	});
	return output === null ? null : JSON.stringify(output);
}
export { defaultWiring, runHookCommand };
