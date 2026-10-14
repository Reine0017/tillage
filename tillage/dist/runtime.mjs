import { access, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { request } from "node:http";
import { setTimeout } from "node:timers/promises";
var PROBE_TIMEOUT_MS = 2e3;
function requestJson(options) {
	const payload = options.body === void 0 ? null : Buffer.from(JSON.stringify(options.body), "utf8");
	return new Promise((resolve) => {
		const req = request({
			host: "127.0.0.1",
			port: options.port,
			path: options.path,
			method: options.method,
			timeout: options.timeoutMs,
			headers: {
				accept: "application/json",
				...payload ? {
					"content-type": "application/json",
					"content-length": payload.byteLength
				} : {}
			}
		}, (res) => {
			const chunks = [];
			res.on("data", (chunk) => chunks.push(chunk));
			res.on("end", () => {
				const raw = Buffer.concat(chunks).toString("utf8");
				try {
					resolve({
						status: res.statusCode ?? 0,
						body: JSON.parse(raw)
					});
				} catch {
					resolve({
						status: res.statusCode ?? 0,
						body: null
					});
				}
			});
		});
		req.on("error", () => resolve(null));
		req.on("timeout", () => {
			req.destroy();
			resolve(null);
		});
		if (payload) req.write(payload);
		req.end();
	});
}
async function probeDaemon(port) {
	const res = await requestJson({
		port,
		path: "/api/health",
		method: "GET",
		timeoutMs: PROBE_TIMEOUT_MS
	});
	if (!res || res.status !== 200) return null;
	const body = res.body;
	if (typeof body !== "object" || body === null) return null;
	const { ok, version, pid } = body;
	if (ok !== true || typeof version !== "string" || typeof pid !== "number") return null;
	return {
		version,
		pid
	};
}
async function requestDaemonRestart(port, version) {
	const res = await requestJson({
		port,
		path: "/api/restart",
		method: "POST",
		timeoutMs: PROBE_TIMEOUT_MS,
		body: { version }
	});
	if (!res) return { kind: "gone" };
	if (res.status === 202) return { kind: "accepted" };
	if (res.status === 409) return {
		kind: "refused",
		daemonVersion: daemonVersionOf(res.body)
	};
	return { kind: "gone" };
}
function daemonVersionOf(body) {
	if (typeof body !== "object" || body === null) return null;
	const { daemonVersion } = body;
	return typeof daemonVersion === "string" && daemonVersion.length > 0 ? daemonVersion : null;
}
function isProcessAlive(pid) {
	try {
		process.kill(pid, 0);
		return true;
	} catch (err) {
		return err.code === "EPERM";
	}
}
var EntrypointMissingError = class extends Error {
	constructor(entrypoint, reason) {
		super(`tillage cannot start the daemon: its entrypoint is gone from disk (${entrypoint || "<empty argv[1]>"}) — ${reason}. This usually means the Tillage plugin was updated or uninstalled, or the checkout it was launched from was removed. Reinstall or update the plugin, or run \`tillage daemon\` from a valid checkout.`);
		this.name = "EntrypointMissingError";
	}
};
async function resolveEntrypoint(scriptPath = process.argv[1]) {
	if (!scriptPath) throw new EntrypointMissingError("", "process.argv[1] is empty");
	const entrypoint = resolve(scriptPath);
	let stats;
	try {
		stats = await stat(entrypoint);
	} catch {
		throw new EntrypointMissingError(entrypoint, "no such file");
	}
	if (!stats.isFile()) throw new EntrypointMissingError(entrypoint, "not a file");
	try {
		await access(entrypoint, constants.R_OK);
	} catch {
		throw new EntrypointMissingError(entrypoint, "not readable");
	}
	return entrypoint;
}
async function spawnDetachedDaemon(scriptPath) {
	const entrypoint = await resolveEntrypoint(scriptPath);
	spawn(process.execPath, [entrypoint, "daemon"], {
		detached: true,
		stdio: "ignore",
		env: process.env
	}).unref();
}
var sleep = async (ms) => {
	await setTimeout(ms);
};
export { spawnDetachedDaemon as a, sleep as i, probeDaemon as n, requestDaemonRestart as r, isProcessAlive as t };
