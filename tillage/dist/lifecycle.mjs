import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
function tillageHome(env = process.env) {
	const override = env.TILLAGE_HOME?.trim();
	if (override) return resolve(override);
	return join(homedir(), ".tillage");
}
function portfilePath(home) {
	return join(home, "daemon.json");
}
function projectsDir(home) {
	return join(home, "projects");
}
var UnsafeProjectIdError = class extends Error {
	constructor(projectId) {
		super(`Unsafe project id: ${JSON.stringify(projectId)}`);
		this.name = "UnsafeProjectIdError";
	}
};
var SAFE_PROJECT_ID = /^[A-Za-z0-9._-]+$/;
function isSafeProjectId(projectId) {
	if (projectId.length === 0 || projectId.length > 128) return false;
	if (projectId === "." || projectId === "..") return false;
	return SAFE_PROJECT_ID.test(projectId);
}
function assertSafeProjectId(projectId) {
	if (!isSafeProjectId(projectId)) throw new UnsafeProjectIdError(projectId);
	return projectId;
}
function projectDir(home, projectId) {
	return join(projectsDir(home), assertSafeProjectId(projectId));
}
function opsLogPath(home, projectId) {
	return join(projectDir(home, projectId), "ops.jsonl");
}
function snapshotPath(home, projectId) {
	return join(projectDir(home, projectId), "snapshot.json");
}
function metaPath(home, projectId) {
	return join(projectDir(home, projectId), "meta.json");
}
function eventsPath(home, projectId) {
	return join(projectDir(home, projectId), "events.jsonl");
}
function idempotencyPath(home, projectId) {
	return join(projectDir(home, projectId), "idempotency.jsonl");
}
function codeIndexPath(home, projectId) {
	return join(projectDir(home, projectId), "code-index.jsonl");
}
var DaemonUnavailableError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "DaemonUnavailableError";
	}
};
function isPortfile(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const { port, pid, version } = value;
	if (typeof port !== "number" || !Number.isInteger(port) || port < 1 || port > 65535) return false;
	if (typeof pid !== "number" || !Number.isInteger(pid) || pid < 1) return false;
	if (typeof version !== "string" || version.length === 0) return false;
	return true;
}
async function readPortfile(home) {
	let raw;
	try {
		raw = await readFile(portfilePath(home), "utf8");
	} catch {
		return null;
	}
	try {
		const parsed = JSON.parse(raw);
		return isPortfile(parsed) ? {
			port: parsed.port,
			pid: parsed.pid,
			version: parsed.version
		} : null;
	} catch {
		return null;
	}
}
async function writePortfile(home, portfile) {
	await mkdir(home, { recursive: true });
	const target = portfilePath(home);
	const temp = `${target}.${process.pid}.tmp`;
	await writeFile(temp, `${JSON.stringify(portfile)}\n`, "utf8");
	try {
		await rename(temp, target);
	} catch (err) {
		await rm(temp, { force: true });
		throw err;
	}
}
async function clearPortfileIfOwned(home, pid) {
	const current = await readPortfile(home);
	if (!current || current.pid !== pid) return;
	await rm(portfilePath(home), { force: true });
}
function assessClaim(current, self, isProcessAlive) {
	if (!current) return "unclaimed";
	if (current.pid === self.pid && current.port === self.port) return "ours";
	return isProcessAlive(current.pid) ? "lost" : "unclaimed";
}
var NUMERIC_FIELD = /^\d+$/;
function isNewerVersion(a, b) {
	const fields = Math.max(a.split(".").length, b.split(".").length);
	const x = parseVersion(a, fields);
	const y = parseVersion(b, fields);
	if (x === null || y === null) return false;
	for (let i = 0; i < fields; i += 1) if (x[i] !== y[i]) return x[i] > y[i];
	return false;
}
function parseVersion(version, fields) {
	const raw = version.split(".");
	const out = [];
	for (let i = 0; i < fields; i += 1) {
		const field = raw[i];
		if (field === void 0) {
			out.push(0);
			continue;
		}
		if (!NUMERIC_FIELD.test(field)) return null;
		out.push(Number(field));
	}
	return out;
}
var DEFAULT_READY_TIMEOUT_MS = 1e4;
var DEFAULT_POLL_INTERVAL_MS = 50;
var where = (deps) => `(TILLAGE_HOME=${deps.home})`;
function unusableDaemonMessage(deps, daemonVersion) {
	return `The tillage daemon is version ${daemonVersion}, ${isNewerVersion(daemonVersion, deps.version) ? `newer than this session's plugin (${deps.version})` : `and this session's plugin (${deps.version}) may replace a running daemon only when it is strictly newer`} ${where(deps)}. Restart this Claude Code session to pick up the update.`;
}
function timeoutMessage(deps, timeout, lastVersionSeen) {
	if (lastVersionSeen !== null) {
		if (isNewerVersion(lastVersionSeen, deps.version)) return unusableDaemonMessage(deps, lastVersionSeen);
		return `Timed out after ${timeout}ms waiting for a tillage daemon at version ${deps.version} ${where(deps)}: a daemon at version ${lastVersionSeen} holds the port instead. Run \`tillage daemon\` in a terminal to see what it reports.`;
	}
	return `Timed out after ${timeout}ms waiting for a tillage daemon at version ${deps.version} ${where(deps)}. Run \`tillage daemon\` in a terminal to see why it is not starting.`;
}
async function waitForHealthy(deps) {
	const timeout = deps.readyTimeoutMs ?? DEFAULT_READY_TIMEOUT_MS;
	const interval = deps.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
	const deadline = deps.now() + timeout;
	let lastVersionSeen = null;
	for (;;) {
		const portfile = await readPortfile(deps.home);
		lastVersionSeen = null;
		if (portfile) {
			const health = await deps.probe(portfile.port);
			if (health) {
				if (health.version === deps.version) return {
					port: portfile.port,
					pid: health.pid,
					version: health.version
				};
				lastVersionSeen = health.version;
			}
		}
		if (deps.now() >= deadline) throw new DaemonUnavailableError(timeoutMessage(deps, timeout, lastVersionSeen));
		await deps.sleep(interval);
	}
}
async function waitForGone(deps, old, servingVersion) {
	const timeout = deps.readyTimeoutMs ?? DEFAULT_READY_TIMEOUT_MS;
	const interval = deps.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
	const deadline = deps.now() + timeout;
	for (;;) {
		const portfile = await readPortfile(deps.home);
		if (!portfile || portfile.pid !== old.pid || !deps.isProcessAlive(old.pid)) return;
		if (deps.now() >= deadline) throw new DaemonUnavailableError(`The tillage daemon is still running version ${servingVersion} ${timeout}ms after being asked to restart onto version ${deps.version} ${where(deps)}. Run \`tillage daemon\` in a terminal to see why it is not shutting down.`);
		await deps.sleep(interval);
	}
}
async function settle(deps) {
	const portfile = await readPortfile(deps.home);
	if (!portfile || !deps.isProcessAlive(portfile.pid)) return { kind: "none" };
	const health = await deps.probe(portfile.port);
	if (!health) return { kind: "none" };
	if (health.version === deps.version) return {
		kind: "reuse",
		daemon: {
			port: portfile.port,
			pid: health.pid,
			version: health.version
		}
	};
	if (!isNewerVersion(deps.version, health.version)) throw new DaemonUnavailableError(unusableDaemonMessage(deps, health.version));
	return {
		kind: "displaceable",
		portfile,
		health
	};
}
async function ensureDaemon(deps) {
	const settlement = await settle(deps);
	if (settlement.kind === "reuse") return {
		...settlement.daemon,
		outcome: "reused"
	};
	if (settlement.kind === "displaceable") return await displace(deps, settlement.portfile, settlement.health);
	await deps.spawnDaemon();
	return {
		...await waitForHealthy(deps),
		outcome: "spawned"
	};
}
async function displace(deps, old, serving) {
	const outcome = await deps.requestRestart(old.port, deps.version);
	if (outcome.kind === "refused") return await afterRefusal(deps, outcome.daemonVersion);
	await waitForGone(deps, old, serving.version);
	const settlement = await settle(deps);
	if (settlement.kind === "reuse") return {
		...settlement.daemon,
		outcome: "restarted"
	};
	await deps.spawnDaemon();
	return {
		...await waitForHealthy(deps),
		outcome: "restarted"
	};
}
async function afterRefusal(deps, refusedBy) {
	const settlement = await settle(deps);
	if (settlement.kind === "reuse") return {
		...settlement.daemon,
		outcome: "reused"
	};
	if (settlement.kind === "displaceable") throw new DaemonUnavailableError(`The tillage daemon (version ${settlement.health.version}) refused this session's request to shut down so version ${deps.version} could take over ${where(deps)}. Run \`tillage daemon\` in a terminal to see what it reports, or stop it by hand.`);
	if (refusedBy !== null && isNewerVersion(refusedBy, deps.version)) throw new DaemonUnavailableError(unusableDaemonMessage(deps, refusedBy));
	await deps.spawnDaemon();
	return {
		...await waitForHealthy(deps),
		outcome: "spawned"
	};
}
export { readPortfile as a, codeIndexPath as c, metaPath as d, opsLogPath as f, tillageHome as g, snapshotPath as h, isNewerVersion as i, eventsPath as l, projectsDir as m, clearPortfileIfOwned as n, writePortfile as o, projectDir as p, ensureDaemon as r, UnsafeProjectIdError as s, assessClaim as t, idempotencyPath as u };
