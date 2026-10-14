import { dirname } from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
var execFileAsync = promisify(execFile);
var FULL_SHA = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i;
var READ_ONLY_GIT_INVOCATIONS = [
	["rev-parse"],
	["merge-base"],
	["show-ref"],
	[
		"diff-tree",
		"--no-commit-id",
		"--name-only",
		"-r",
		"-z"
	],
	["config", "--get"],
	["log", "--format=%H %T %cI"],
	[
		"log",
		"-p",
		"--no-merges",
		"--no-color",
		"--no-ext-diff",
		"--no-textconv",
		"--unified=3",
		"--format=%H"
	],
	[
		"diff",
		"--no-color",
		"--no-ext-diff",
		"--no-textconv",
		"--unified=3"
	],
	["patch-id", "--stable"],
	[
		"diff-tree",
		"--no-commit-id",
		"--name-status",
		"-r",
		"-z",
		"-M"
	],
	[
		"ls-tree",
		"-r",
		"--name-only",
		"-z"
	],
	[
		"--no-optional-locks",
		"status",
		"--porcelain",
		"--untracked-files=all",
		"-z"
	]
];
var LOG_PATCHES = READ_ONLY_GIT_INVOCATIONS[6];
var DIFF_PATCH = READ_ONLY_GIT_INVOCATIONS[7];
function isReadOnlyInvocation(args) {
	const prefix = READ_ONLY_GIT_INVOCATIONS.find((p) => p.every((word, i) => args[i] === word));
	if (prefix === void 0) return false;
	const rest = args.slice(prefix.length);
	switch (prefix[0]) {
		case "log":
		case "diff-tree":
		case "ls-tree": return rest.length === 1 && rest[0] !== void 0 && !rest[0].startsWith("-");
		case "diff": return rest.length === 2 && rest.every((a) => FULL_SHA.test(a));
		case "patch-id":
		case "--no-optional-locks": return rest.length === 0;
		default: return true;
	}
}
function assertWhitelisted(args) {
	if (!isReadOnlyInvocation(args)) throw new Error(`gitFacts: refused non-whitelisted git subcommand: ${args.slice(0, 2).join(" ") || "<empty>"}`);
}
var GIT_TIMEOUT_MS = 2e3;
async function runGit(repoPath, args, options = {}) {
	assertWhitelisted(args);
	try {
		const { stdout } = await execFileAsync("git", [
			"-C",
			repoPath,
			...args
		], {
			timeout: GIT_TIMEOUT_MS,
			...options.maxBuffer === void 0 ? {} : { maxBuffer: options.maxBuffer }
		});
		return {
			code: 0,
			stdout
		};
	} catch (err) {
		const code = err.code;
		return {
			code: typeof code === "number" ? code : -1,
			stdout: ""
		};
	}
}
async function runGitPiped(repoPath, producer, consumer) {
	assertWhitelisted(producer);
	assertWhitelisted(consumer);
	return new Promise((resolve) => {
		const first = spawn("git", [
			"-C",
			repoPath,
			...producer
		], {
			timeout: GIT_TIMEOUT_MS,
			stdio: [
				"ignore",
				"pipe",
				"ignore"
			]
		});
		const second = spawn("git", [
			"-C",
			repoPath,
			...consumer
		], {
			timeout: GIT_TIMEOUT_MS,
			stdio: [
				"pipe",
				"pipe",
				"ignore"
			]
		});
		first.on("error", () => {});
		second.on("error", () => {});
		const { stdout: out } = first;
		const { stdin: sink, stdout: result } = second;
		if (out == null || sink == null || result == null) {
			first.kill();
			second.kill();
			resolve({
				code: -1,
				stdout: ""
			});
			return;
		}
		const chunks = [];
		let firstCode;
		let secondCode;
		const settle = () => {
			if (firstCode === void 0 || secondCode === void 0) return;
			const ok = firstCode === 0 && secondCode === 0;
			resolve({
				code: ok ? 0 : -1,
				stdout: ok ? Buffer.concat(chunks).toString("utf8") : ""
			});
		};
		sink.on("error", () => {});
		out.pipe(sink);
		result.on("data", (chunk) => {
			chunks.push(chunk);
		});
		first.on("close", (code) => {
			firstCode = code;
			settle();
		});
		second.on("close", (code) => {
			secondCode = code;
			if (firstCode === void 0) first.kill();
			settle();
		});
	});
}
function pairLines(stdout) {
	const out = [];
	for (const line of stdout.split("\n")) {
		const [a, b] = line.trim().split(" ");
		if (a && b) out.push([a, b]);
	}
	return out;
}
function commitLines(stdout) {
	const out = [];
	for (const line of stdout.split("\n")) {
		const [commit, tree, at] = line.trim().split(" ").filter((w) => w !== "");
		if (commit && tree && at) out.push({
			commit,
			tree,
			at
		});
	}
	return out;
}
function porcelainPaths(stdout) {
	const entries = stdout.split("\0").filter((e) => e !== "");
	const paths = [];
	for (let i = 0; i < entries.length; i += 1) {
		const entry = entries[i];
		if (entry.length < 3) continue;
		paths.push(entry.slice(3));
		if (entry[0] === "R" || entry[0] === "C" || entry[1] === "R" || entry[1] === "C") {
			const source = entries[i + 1];
			if (source !== void 0) {
				paths.push(source);
				i += 1;
			}
		}
	}
	return paths;
}
async function uncommittedPaths(cwd) {
	const out = await runGit(cwd, STATUS_PORCELAIN, { maxBuffer: STATUS_MAX_BYTES });
	if (out.code !== 0) return [];
	return porcelainPaths(out.stdout);
}
var STATUS_PORCELAIN = READ_ONLY_GIT_INVOCATIONS[11];
var STATUS_MAX_BYTES = 8 * 1024 * 1024;
async function fingerprint(repoPath, producer) {
	const ids = await runGitPiped(repoPath, producer, ["patch-id", "--stable"]);
	if (ids.code !== 0) return null;
	return pairLines(ids.stdout).map(([patchId, commit]) => ({
		commit,
		patchId
	}));
}
var cache = new Map();
var changedFilesCache = new Map();
var treeFilesCache = new Map();
var renamesCache = new Map();
var existsCache = new Set();
var tipInFlight = new Map();
async function readTip(repoPath) {
	for (const short of ["main", "master"]) {
		const r = await runGit(repoPath, [
			"rev-parse",
			"--verify",
			"--quiet",
			`refs/heads/${short}`
		]);
		const sha = r.stdout.trim();
		if (r.code === 0 && sha) return {
			ref: short,
			sha
		};
	}
	const head = await runGit(repoPath, [
		"rev-parse",
		"--abbrev-ref",
		"refs/remotes/origin/HEAD"
	]);
	const name = head.stdout.trim();
	if (head.code === 0 && name.startsWith("origin/")) {
		const short = name.slice(7);
		for (const ref of [`refs/heads/${short}`, `refs/remotes/${name}`]) {
			const r = await runGit(repoPath, [
				"rev-parse",
				"--verify",
				"--quiet",
				ref
			]);
			const sha = r.stdout.trim();
			if (r.code === 0 && sha) return {
				ref: short,
				sha
			};
		}
	}
	return null;
}
async function resolveTip(repoPath) {
	const pending = tipInFlight.get(repoPath);
	if (pending !== void 0) return pending;
	const started = readTip(repoPath).finally(() => {
		tipInFlight.delete(repoPath);
	});
	tipInFlight.set(repoPath, started);
	return started;
}
async function readBranchExists(repoPath, branch) {
	const ref = await runGit(repoPath, [
		"show-ref",
		"--verify",
		"--quiet",
		`refs/heads/${branch}`
	]);
	return ref.code === 0 ? true : ref.code === 1 ? false : null;
}
async function refreshedEntry(repoPath) {
	const pair = await resolveTip(repoPath);
	const tip = pair?.sha ?? null;
	let entry = cache.get(repoPath);
	if (entry === void 0 || entry.tip !== tip) {
		entry = {
			tip,
			anchor: pair?.ref ?? null,
			ancestors: new Map(),
			standing: new Map()
		};
		cache.set(repoPath, entry);
	}
	return entry;
}
function openRepo(repoPath) {
	const facts = {
		repoPath,
		async mainTip() {
			return (await refreshedEntry(repoPath)).tip;
		},
		async isAncestorOfMain(commit) {
			const entry = await refreshedEntry(repoPath);
			if (entry.tip === null) return null;
			const cached = entry.ancestors.get(commit);
			if (cached !== void 0) return cached;
			let result;
			if ((await runGit(repoPath, [
				"rev-parse",
				"--verify",
				"--quiet",
				`${commit}^{commit}`
			])).code !== 0) result = null;
			else {
				const mb = await runGit(repoPath, [
					"merge-base",
					"--is-ancestor",
					commit,
					entry.tip
				]);
				result = mb.code === 0 ? true : mb.code === 1 ? false : null;
			}
			if (result !== null) entry.ancestors.set(commit, result);
			return result;
		},
		async branchState(branch) {
			const ref = `refs/heads/${branch}`;
			const exists = await readBranchExists(repoPath, branch);
			if (exists !== true) return {
				exists,
				merged: null,
				forkPoint: null
			};
			const entry = await refreshedEntry(repoPath);
			if (entry.tip === null) return {
				exists,
				merged: null,
				forkPoint: null
			};
			const mb = await runGit(repoPath, [
				"merge-base",
				"--is-ancestor",
				ref,
				entry.tip
			]);
			const merged = mb.code === 0 ? true : mb.code === 1 ? false : null;
			const fp = await runGit(repoPath, [
				"merge-base",
				entry.tip,
				ref
			]);
			return {
				exists,
				merged,
				forkPoint: fp.code === 0 && fp.stdout.trim() ? fp.stdout.trim() : null
			};
		},
		async changedFiles(commit) {
			const key = `${repoPath}\0${commit}`;
			const cached = FULL_SHA.test(commit) ? changedFilesCache.get(key) : void 0;
			if (cached !== void 0) return [...cached];
			const out = await runGit(repoPath, [
				"diff-tree",
				"--no-commit-id",
				"--name-only",
				"-r",
				"-z",
				commit
			]);
			if (out.code !== 0) return null;
			const files = out.stdout.split("\0").filter((l) => l !== "");
			if (FULL_SHA.test(commit)) changedFilesCache.set(key, files);
			return [...files];
		},
		async treeOf(commit) {
			const out = await runGit(repoPath, [
				"rev-parse",
				"--verify",
				"--quiet",
				`${commit}^{tree}`
			]);
			const tree = out.stdout.trim();
			return out.code === 0 && tree ? tree : null;
		},
		async mergeBaseWithMain(commit) {
			const tip = (await resolveTip(repoPath))?.sha ?? null;
			if (tip === null) return null;
			const out = await runGit(repoPath, [
				"merge-base",
				tip,
				commit
			]);
			const base = out.stdout.trim();
			return out.code === 0 && base ? base : null;
		},
		async treesBetween(from, to) {
			if (!FULL_SHA.test(from) || !FULL_SHA.test(to)) return null;
			const out = await runGit(repoPath, [
				"log",
				"--format=%H %T %cI",
				`${from}..${to}`
			]);
			if (out.code !== 0) return null;
			return commitLines(out.stdout);
		},
		async fullNameOf(name) {
			if (name.startsWith("-")) return null;
			const out = await runGit(repoPath, [
				"rev-parse",
				"--verify",
				"--quiet",
				`${name}^{commit}`
			]);
			const full = out.stdout.trim();
			return out.code === 0 && FULL_SHA.test(full) ? full : null;
		},
		async patchIdsBetween(from, to) {
			if (!FULL_SHA.test(from) || !FULL_SHA.test(to)) return null;
			return fingerprint(repoPath, [...LOG_PATCHES, `${from}..${to}`]);
		},
		async diffPatchId(from, to) {
			if (!FULL_SHA.test(from) || !FULL_SHA.test(to)) return null;
			const ids = await fingerprint(repoPath, [
				...DIFF_PATCH,
				from,
				to
			]);
			if (ids === null) return null;
			return { patchId: ids[0]?.patchId ?? null };
		},
		async anchorBranch() {
			return (await refreshedEntry(repoPath)).anchor;
		},
		async commitInfo(commit) {
			if (!FULL_SHA.test(commit)) return null;
			const out = await runGit(repoPath, [
				"log",
				"--format=%H %T %cI",
				`${commit}^!`
			]);
			if (out.code !== 0) return null;
			return commitLines(out.stdout)[0] ?? null;
		},
		async treeFiles(commit) {
			if (!FULL_SHA.test(commit)) return null;
			const cached = treeFilesCache.get(repoPath);
			if (cached !== void 0 && cached.commit === commit) return [...cached.files];
			const out = await runGit(repoPath, [
				"ls-tree",
				"-r",
				"--name-only",
				"-z",
				commit
			]);
			if (out.code !== 0) return null;
			const files = out.stdout.split("\0").filter((f) => f !== "");
			treeFilesCache.set(repoPath, {
				commit,
				files
			});
			return [...files];
		},
		async renamesIn(commit) {
			if (!FULL_SHA.test(commit)) return null;
			const cached = renamesCache.get(`${repoPath}\0${commit}`);
			if (cached !== void 0) return new Map(cached);
			const out = await runGit(repoPath, [
				"diff-tree",
				"--no-commit-id",
				"--name-status",
				"-r",
				"-z",
				"-M",
				commit
			]);
			if (out.code !== 0) return null;
			const words = out.stdout.split("\0");
			const renames = new Map();
			for (let i = 0; i < words.length;) {
				const status = words[i] ?? "";
				if (status === "") break;
				if (status.startsWith("R") || status.startsWith("C")) {
					const from = words[i + 1];
					const to = words[i + 2];
					if (from !== void 0 && to !== void 0 && status.startsWith("R")) renames.set(from, to);
					i += 3;
				} else i += 2;
			}
			renamesCache.set(`${repoPath}\0${commit}`, renames);
			return new Map(renames);
		},
		async commitExists(name) {
			if (name.startsWith("-")) return null;
			if (existsCache.has(`${repoPath}\0${name}`)) return true;
			const out = await runGit(repoPath, [
				"rev-parse",
				"--verify",
				"--quiet",
				`${name}^{commit}`
			]);
			if (out.code === 0) existsCache.add(`${repoPath}\0${name}`);
			return out.code === 0 ? true : out.code === 1 ? false : null;
		},
		async commitStanding(name) {
			const entry = await refreshedEntry(repoPath);
			const cached = entry.standing.get(name);
			if (cached !== void 0) return cached;
			const exists = await facts.commitExists(name);
			if (exists === null) return null;
			if (exists === false) return "unknown";
			const onMain = await facts.isAncestorOfMain(name);
			if (onMain === null) return null;
			const standing = onMain ? "on-main" : "not-on-main";
			entry.standing.set(name, standing);
			return standing;
		},
		async branchTip(branch) {
			if (branch.startsWith("-")) return null;
			const out = await runGit(repoPath, [
				"rev-parse",
				"--verify",
				"--quiet",
				`refs/heads/${branch}`
			]);
			if (out.code === 1) return { tip: null };
			const sha = out.stdout.trim();
			return out.code === 0 && FULL_SHA.test(sha) ? { tip: sha } : null;
		}
	};
	return facts;
}
async function sessionGitInfo(cwd) {
	const [common, top, ref, head] = await Promise.all([
		runGit(cwd, [
			"rev-parse",
			"--path-format=absolute",
			"--git-common-dir"
		]),
		runGit(cwd, ["rev-parse", "--show-toplevel"]),
		runGit(cwd, [
			"rev-parse",
			"--abbrev-ref",
			"HEAD"
		]),
		runGit(cwd, ["rev-parse", "HEAD"])
	]);
	let repoRoot = null;
	if (common.code === 0) {
		const path = common.stdout.trim();
		if (path) repoRoot = path.endsWith("/.git") ? dirname(path) : path;
	}
	const topPath = top.stdout.trim();
	const worktreeRoot = top.code === 0 && topPath ? topPath : null;
	const refName = ref.stdout.trim();
	const branch = ref.code === 0 && refName && refName !== "HEAD" ? refName : null;
	const commit = head.code === 0 && head.stdout.trim() ? head.stdout.trim() : null;
	return {
		repoRoot,
		worktreeRoot,
		branch,
		commit
	};
}
async function headAndParent(cwd) {
	const [head, parent] = await Promise.all([runGit(cwd, [
		"rev-parse",
		"--verify",
		"--quiet",
		"HEAD"
	]), runGit(cwd, [
		"rev-parse",
		"--verify",
		"--quiet",
		"HEAD^"
	])]);
	const sha = head.stdout.trim();
	if (head.code !== 0 || !FULL_SHA.test(sha)) return null;
	const up = parent.stdout.trim();
	return {
		sha,
		parent: parent.code === 0 && FULL_SHA.test(up) ? up : null
	};
}
async function repoUserName(repoPath) {
	const out = await runGit(repoPath, [
		"config",
		"--get",
		"user.name"
	]);
	if (out.code !== 0) return null;
	const name = out.stdout.trim();
	return name === "" ? null : name;
}
function repoPathSegments(path) {
	let p = path.trim();
	while (p.startsWith("./")) p = p.slice(2);
	while (p.endsWith("/")) p = p.slice(0, -1);
	if (p === "" || p.includes("\\") || p.startsWith("/")) return null;
	const segments = p.split("/");
	if (segments.some((s) => s === "" || s === "." || s === "..")) return null;
	return segments;
}
function isPathPrefix(prefix, segments) {
	if (prefix.length > segments.length) return false;
	for (let i = 0; i < prefix.length; i++) if (prefix[i] !== segments[i]) return false;
	return true;
}
var PLAIN_CALL_ID = /^[A-Za-z0-9_-]{1,128}$/;
var CALL_FOLDERS_HELD = 1e3;
var CallFolders = class {
	held = new Map();
	report(callId, folder) {
		this.held.delete(callId);
		this.held.set(callId, folder);
		while (this.held.size > CALL_FOLDERS_HELD) this.held.delete(this.held.keys().next().value);
	}
	folderOf(callId) {
		return this.held.get(callId);
	}
};
var STUB_TEMPLATE = `# CLAUDE.md

This project's context lives on a Tillage map, not in this file.

**Before any work:** call the \`start_work\` tool (Tillage MCP), with no arguments
to orient. It returns this project's brief, rules, decisions, memory and task
state.

**Before working in a new subtree of the map:** call \`start_work\` again for it —
with the node the human pointed you at, or the path of the file you are about to
touch. Rules are scoped by position on the map; the part you are entering may
carry rules your last call did not include, and a summary of an earlier call is
not a substitute for the rules themselves.

**The map is this project's memory.** A durable fact — something the human tells
you to remember, or something you would otherwise save to your own memory — is
recorded on the map, and you confirm back that it landed. Never in this file, and
never in your harness's own store: memory kept there is invisible to the human.

**If Tillage is unreachable:** stop and tell the human what failed. Do not
proceed from the code alone — this project's rules are not in the repo.

**If a lead agent dispatched you,** work from the context it handed you. You may
read the map; the lead records — report what you did, and anything worth
remembering, to the lead.

<!-- Generated by the Tillage map skill, template v2. Content added here is not
     read by the map and will be proposed for migration when the map skill next
     runs its stub check. -->
`;
var PLAIN_ID = /^[A-Za-z0-9_-]{1,128}$/;
function sessionDir(env, input) {
	const id = input.session_id;
	if (typeof id !== "string" || !PLAIN_ID.test(id)) return null;
	return `${env.dataDir}/sessions/${id}`;
}
var SESSION_TTL_MS = 10080 * 60 * 1e3;
var MARKER = "";
var MARKERS = {
	bound: "bound",
	edited: "edited",
	baseline: "baseline",
	wrote: "wrote",
	unbound: "unbound",
	unmappedSaid: "unmappedSaid",
	leadFolder: "leadFolder"
};
var EDITED_LIMIT = 500;
function marked(env, input, marker) {
	const dir = sessionDir(env, input);
	return dir !== null && env.fs.read(`${dir}/${marker}`) !== null;
}
function mark(env, input, marker) {
	const dir = sessionDir(env, input);
	if (dir === null) return;
	env.fs.write(`${dir}/${marker}`, MARKER);
}
function markBound(env, input) {
	mark(env, input, MARKERS.bound);
	const dir = sessionDir(env, input);
	if (dir !== null) env.fs.remove(`${dir}/${MARKERS.unbound}`);
}
function editedPaths(held) {
	return held === null ? [] : held.split("\n").filter((p) => p !== "");
}
function readBaseline(held) {
	const [root, ...paths] = held?.split("\n") ?? [];
	if (root === void 0 || root === "") return null;
	return {
		root,
		paths: new Set(paths)
	};
}
function newSinceStart(baseline, changed) {
	if (baseline === null) return [];
	return changed.filter((p) => !p.includes("\n") && !baseline.paths.has(p));
}
function insideSubagent(input) {
	return typeof input.agent_id === "string" && input.agent_id !== "";
}
function noteLeadFolder(input, env) {
	if (insideSubagent(input)) return null;
	const cwd = input.cwd;
	if (typeof cwd !== "string" || cwd === "") return null;
	const dir = sessionDir(env, input);
	if (dir !== null && env.fs.read(`${dir}/${MARKERS.leadFolder}`) !== cwd) env.fs.write(`${dir}/${MARKERS.leadFolder}`, cwd);
	return cwd;
}
function chatFolder(input, env) {
	if (!insideSubagent(input)) return noteLeadFolder(input, env);
	const dir = sessionDir(env, input);
	const noted = dir === null ? null : env.fs.read(`${dir}/${MARKERS.leadFolder}`);
	return noted === null || noted === "" ? null : noted;
}
async function sessionStart(input, env) {
	sweepOldSessions(input, env);
	const cwd = noteLeadFolder(input, env);
	if (cwd === null) return null;
	const project = (await env.daemon.boundProject(cwd))?.project ?? null;
	if (project === null) return null;
	markBound(env, input);
	await noteBaseline(input, env, cwd, project.root);
	return { hookSpecificOutput: {
		hookEventName: "SessionStart",
		additionalContext: `This directory is bound to the Tillage map "${project.name}" (${project.url}). ${project.openNotes} notes wait for the next agent session. Orientation is one start_work {} call.` + stubFact(env, project.root)
	} };
}
async function noteBaseline(input, env, cwd, root) {
	const dir = sessionDir(env, input);
	if (dir === null || root === null || root === "" || root.includes("\n")) return;
	const file = `${dir}/${MARKERS.baseline}`;
	if (env.fs.read(file) !== null) return;
	const named = (await env.git.changedFiles(cwd)).filter((p) => p !== "" && !p.includes("\n"));
	env.fs.write(file, [root, ...named].join("\n"));
}
function stubFact(env, root) {
	if (root === null) return "";
	const path = `${root}/CLAUDE.md`;
	const found = env.fs.read(path);
	if (found === null) return ` No CLAUDE.md could be read at ${path}; the stub that routes agents to the map is in references/stub.md of the Tillage map skill.`;
	if (found.trimEnd() === STUB_TEMPLATE.trimEnd()) return "";
	return ` ${path} differs from the Tillage stub (references/stub.md).`;
}
function sweepOldSessions(input, env) {
	const root = `${env.dataDir}/sessions`;
	const mine = typeof input.session_id === "string" ? input.session_id : null;
	const cutoff = env.now() - SESSION_TTL_MS;
	for (const { name, mtimeMs } of env.fs.sessionDirs(root)) {
		if (name === mine || mtimeMs > cutoff) continue;
		env.fs.remove(`${root}/${name}`);
	}
}
var MODES = [
	{
		file: "migration",
		words: ["migrate"]
	},
	{
		file: "structure",
		words: [
			"restructure",
			"reorganise",
			"reorganize",
			"split",
			"merge nodes"
		]
	},
	{
		file: "debugging",
		words: ["why did the agent", "trace this bug"]
	}
];
var NOT_THE_HUMAN = [
	"<agent-message",
	"<task-notification>",
	"[SYSTEM NOTIFICATION - NOT USER INPUT]"
];
var RECORD_WORDS = [
	"remember",
	"from now on",
	"always",
	"never",
	"we decided",
	"decision:"
];
function names(prompt, phrase) {
	const body = phrase.split(" ").map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
	const tail = /\w$/.test(phrase) ? "\\b" : "";
	return new RegExp(`\\b${body}${tail}`, "i").test(prompt);
}
function promptFacts(input, env) {
	const prompt = input.prompt;
	if (typeof prompt !== "string" || prompt === "") return null;
	const opening = prompt.trimStart();
	if (NOT_THE_HUMAN.some((frame) => opening.startsWith(frame))) return null;
	if (!marked(env, input, MARKERS.bound)) return null;
	const lines = [];
	const mode = MODES.find((m) => m.words.some((w) => names(prompt, w)));
	if (mode !== void 0) lines.push(`The prompt names ${mode.file}; the playbook for it is references/${mode.file}.md in the Tillage map skill.`);
	if (RECORD_WORDS.some((w) => names(prompt, w))) lines.push("The prompt states a standing rule, a decision or a fact to remember; such a statement is recorded on the map before the reply (addInstruction / addDecision with inChat / record_memory).");
	if (lines.length === 0) return null;
	return { hookSpecificOutput: {
		hookEventName: "UserPromptSubmit",
		additionalContext: lines.join("\n")
	} };
}
function toolInput(input) {
	const args = input.tool_input;
	return typeof args === "object" && args !== null && !Array.isArray(args) ? args : {};
}
async function preMapCall(input, env) {
	const folder = chatFolder(input, env);
	const callId = input.tool_use_id;
	if (folder !== null && typeof callId === "string" && PLAIN_CALL_ID.test(callId)) await env.daemon.reportCallFolder(callId, folder);
	const tool = input.tool_name;
	if (!insideSubagent(input)) return null;
	if (typeof tool !== "string" || !tool.endsWith("__start_work")) return null;
	return { hookSpecificOutput: {
		hookEventName: "PreToolUse",
		permissionDecision: "allow",
		updatedInput: {
			...toolInput(input),
			peek: true
		}
	} };
}
function preFileWrite(input, env) {
	const path = toolInput(input)["file_path"];
	if (typeof path !== "string") return null;
	noteEdited(input, env, path);
	if (!marked(env, input, MARKERS.bound)) return null;
	if (!path.includes("/.claude/projects/") || !path.includes("/memory/")) return null;
	return { hookSpecificOutput: {
		hookEventName: "PreToolUse",
		additionalContext: "The map is this project’s memory: a durable fact is recorded with record_memory, where the human can see it."
	} };
}
function noteEdited(input, env, path) {
	const dir = sessionDir(env, input);
	if (dir === null) return;
	const file = `${dir}/${MARKERS.edited}`;
	const held = env.fs.read(file);
	const paths = editedPaths(held);
	const add = path !== "" && !path.includes("\n") && !paths.includes(path) && paths.length < EDITED_LIMIT;
	if (held !== null && !add) return;
	env.fs.write(file, (held ?? MARKER) + (add ? `${path}\n` : ""));
}
var GIT_COMMIT = /\bgit\b(?:\s+\S+)*?\s+commit\b/;
function commitBeforeFile(dir, input) {
	const id = input.tool_use_id;
	return typeof id === "string" && PLAIN_ID.test(id) ? `${dir}/commit-before-${id}` : `${dir}/commit-before`;
}
function readCommitBefore(text) {
	const [cwd, sha, ...rest] = text?.split("\n") ?? [];
	if (cwd === void 0 || cwd === "" || sha === void 0 || sha === "" || rest.length > 0) return null;
	return {
		cwd,
		sha
	};
}
async function preShell(input, env) {
	const dir = sessionDir(env, input);
	const cwd = input.cwd;
	const command = toolInput(input)["command"];
	if (dir === null || typeof cwd !== "string" || cwd === "") return null;
	if (typeof command !== "string" || !GIT_COMMIT.test(command)) return null;
	const file = commitBeforeFile(dir, input);
	const head = cwd.includes("\n") ? null : await env.git.head(cwd);
	if (head === null) env.fs.remove(file);
	else env.fs.write(file, `${cwd}\n${head.sha}`);
	return null;
}
var COMMIT_LINE = /^\[[^\]\n]*\s([0-9a-f]{7,64})\]/m;
function responseStdout(response) {
	if (typeof response === "string") return response;
	if (typeof response === "object" && response !== null) {
		const { stdout } = response;
		if (typeof stdout === "string") return stdout;
	}
	return "";
}
async function postShell(input, env) {
	const dir = sessionDir(env, input);
	if (dir === null) return null;
	const command = toolInput(input)["command"];
	if (typeof command !== "string" || !GIT_COMMIT.test(command)) return null;
	const file = commitBeforeFile(dir, input);
	const before = readCommitBefore(env.fs.read(file));
	env.fs.remove(file);
	if (!marked(env, input, MARKERS.bound)) return null;
	const sha = COMMIT_LINE.exec(responseStdout(input.tool_response))?.[1] ?? await landedOn(env, before);
	if (sha === void 0) return null;
	return { hookSpecificOutput: {
		hookEventName: "PostToolUse",
		additionalContext: `A commit landed (${sha}). Its row records it: update_task_status status:"done" with commits, or addRowCommit.`
	} };
}
async function landedOn(env, before) {
	if (before === null) return void 0;
	const head = await env.git.head(before.cwd);
	return head !== null && head.parent === before.sha ? head.sha.slice(0, 7) : void 0;
}
var MAP_WRITE = /__(apply_ops|update_task_status|add_task_note|set_brief|set_project_brief|record_memory|create_project)$/;
function toolAnswer(response) {
	if (typeof response === "string") try {
		return toolAnswer(JSON.parse(response));
	} catch {
		return null;
	}
	if (typeof response !== "object" || response === null) return null;
	const list = Array.isArray(response) ? response : response.content;
	if (Array.isArray(list)) {
		const text = list.find((b) => typeof b === "object" && b !== null && typeof b.text === "string");
		return text === void 0 ? null : toolAnswer(text.text);
	}
	return response;
}
function postMapWrite(input, env) {
	const tool = input.tool_name;
	if (typeof tool !== "string" || !MAP_WRITE.test(tool)) return null;
	const answer = toolAnswer(input.tool_response);
	if (tool.endsWith("__create_project")) {
		if (answer === null || answer["ok"] !== true || typeof answer["repoPath"] !== "string") return null;
		markBound(env, input);
		mark(env, input, MARKERS.wrote);
		return null;
	}
	if (answer !== null && answer["error"] !== void 0 && answer["ok"] === void 0) return null;
	mark(env, input, MARKERS.wrote);
	return null;
}
function boundPathHits(changed, bindings) {
	const bound = bindings.flatMap((b) => b.paths.map((raw) => ({
		nodeId: b.nodeId,
		title: b.title,
		segments: repoPathSegments(raw)
	})).filter((p) => p.segments !== null));
	const paths = [];
	const seenPath = new Set();
	const titles = [];
	const seenSlice = new Set();
	for (const path of changed) {
		const segments = repoPathSegments(path);
		if (segments === null) continue;
		let hit = false;
		for (const b of bound) {
			if (!isPathPrefix(b.segments, segments)) continue;
			hit = true;
			if (!seenSlice.has(b.nodeId)) {
				seenSlice.add(b.nodeId);
				titles.push(b.title);
			}
		}
		if (hit && !seenPath.has(path)) {
			seenPath.add(path);
			paths.push(path);
		}
	}
	return {
		paths,
		titles
	};
}
var UNMAPPED_LISTED = 8;
function unmappedFact(unmapped) {
	const count = unmapped.length === 1 ? "1 changed file lies" : `${unmapped.length} changed files lie`;
	const rest = unmapped.length - UNMAPPED_LISTED;
	return `${count} under no slice: ${unmapped.slice(0, UNMAPPED_LISTED).join(", ") + (rest > 0 ? `, and ${rest} more` : "")}`;
}
async function unclaimedEdits(env, dir, cwd, root, edited, fresh, changed, hit) {
	if (root === null || env.fs.read(`${dir}/${MARKERS.unmappedSaid}`) !== null) return [];
	const prefix = root.endsWith("/") ? root : `${root}/`;
	const written = new Set([...editedPaths(edited).filter((p) => p.startsWith(prefix)).map((p) => p.slice(prefix.length)), ...fresh]);
	const mine = [...new Set(changed)].filter((p) => written.has(p) && !hit.includes(p)).slice(0, 50);
	if (mine.length === 0) return [];
	return await env.daemon.unclaimed(cwd, mine) ?? [];
}
async function stop(input, env) {
	if (input.stop_hook_active === true) return null;
	const dir = sessionDir(env, input);
	if (dir === null) return null;
	const edited = env.fs.read(`${dir}/${MARKERS.edited}`);
	const baseline = readBaseline(env.fs.read(`${dir}/${MARKERS.baseline}`));
	if (edited === null && baseline === null) return null;
	if (env.fs.read(`${dir}/${MARKERS.unbound}`) !== null) return null;
	if (env.fs.read(`${dir}/${MARKERS.wrote}`) !== null) return null;
	const cwd = input.cwd;
	if (typeof cwd !== "string" || cwd === "") return null;
	const changed = await env.git.changedFiles(cwd);
	const sinceStart = newSinceStart(baseline, changed);
	if (edited === null && sinceStart.length === 0) return null;
	const answer = await env.daemon.boundProject(cwd);
	if (answer === null) return null;
	if (answer.project === null) {
		env.fs.write(`${dir}/${MARKERS.unbound}`, MARKER);
		return null;
	}
	const fresh = baseline?.root === answer.project.root ? sinceStart : [];
	if (edited === null && fresh.length === 0) return null;
	const { paths, titles } = boundPathHits(changed, await env.daemon.bindings(answer.project.id));
	const unmapped = await unclaimedEdits(env, dir, cwd, answer.project.root, edited, fresh, changed, paths);
	if (paths.length === 0 && unmapped.length === 0) return null;
	if (unmapped.length > 0) env.fs.write(`${dir}/${MARKERS.unmappedSaid}`, MARKER);
	const sentences = [];
	if (paths.length > 0) sentences.push(`Uncommitted changes under bound paths with no map write this session: ${paths.join(", ")}. The slice(s) governing them: ${titles.join(", ")}. Record the work (a row set doing, then done with commits), or state why not.`);
	if (unmapped.length > 0) sentences.push(paths.length > 0 ? `Also: ${unmappedFact(unmapped)}.` : `${unmappedFact(unmapped)}. If this work belongs on the map, offer to map its area; if it does not (a README, a lockfile, tooling), say so and end the reply.`);
	return {
		decision: "block",
		reason: sentences.join(" ")
	};
}
function parseHookInput(raw) {
	if (raw.trim() === "") return null;
	let parsed;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
	return parsed;
}
async function runHook(moment, input, env) {
	switch (moment) {
		case "session-start": return await sessionStart(input, env);
		case "prompt": return promptFacts(input, env);
		case "pre-map-call": return await preMapCall(input, env);
		case "lead-folder":
			noteLeadFolder(input, env);
			return null;
		case "pre-file-write": return preFileWrite(input, env);
		case "pre-shell": return await preShell(input, env);
		case "post-shell": return await postShell(input, env);
		case "post-map-write": return postMapWrite(input, env);
		case "stop": return await stop(input, env);
		default: return null;
	}
}
export { isPathPrefix as a, openRepo as c, uncommittedPaths as d, PLAIN_CALL_ID as i, repoUserName as l, runHook as n, repoPathSegments as o, CallFolders as r, headAndParent as s, parseHookInput as t, sessionGitInfo as u };
