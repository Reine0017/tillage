import { g as tillageHome, r as ensureDaemon } from "./lifecycle.mjs";
import { a as spawnDetachedDaemon, i as sleep, n as probeDaemon, r as requestDaemonRestart, t as isProcessAlive } from "./runtime.mjs";
import { basename } from "node:path";
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline";
var DEFAULT_REQUEST_TIMEOUT_MS = 6e4;
function isRequestTimeout(err) {
	return typeof err === "object" && err !== null && err.name === "TimeoutError";
}
function remedyFor(err, timeoutMs) {
	if (err instanceof Error && err.name === "DaemonUnavailableError") return err.message;
	if (isRequestTimeout(err)) return `tillage daemon did not answer within ${timeoutMs}ms: it accepted the connection but never replied, so it is likely wedged. Remedy: run \`tillage daemon\` in a terminal to inspect it, or kill the stuck daemon process so the next tillage invocation cold-starts a fresh one.`;
	return `tillage daemon unreachable: ${err instanceof Error ? err.message : String(err)}. Remedy: run \`tillage daemon\` in a terminal to see why it is not starting; if the Tillage plugin was updated or removed, reinstall it.`;
}
var STOP_INSTRUCTION = "Stop and tell the human what failed. Do not proceed from the code alone — this project’s rules live on the map, not in the repo.";
async function runMcpShim(io) {
	const doFetch = io.fetchImpl ?? fetch;
	const label = io.labelOverride ?? basename(io.cwd);
	const timeoutMs = io.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
	const sessionId = randomUUID();
	let port = (await io.ensure()).port;
	async function post(frame) {
		const res = await doFetch(`http://127.0.0.1:${port}/api/mcp`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				accept: "application/json, text/event-stream",
				"x-tillage-cwd": io.cwd,
				"x-tillage-label": label,
				"x-tillage-session": sessionId
			},
			body: frame,
			signal: AbortSignal.timeout(timeoutMs)
		});
		return {
			status: res.status,
			body: await res.text()
		};
	}
	async function forward(frame) {
		let reply;
		try {
			reply = await post(frame);
		} catch (err) {
			if (isRequestTimeout(err)) {
				unreachable(frame, err);
				return;
			}
			try {
				port = (await io.ensure()).port;
				reply = await post(frame);
			} catch (retryErr) {
				unreachable(frame, retryErr);
				return;
			}
		}
		if (reply.status === 202 || reply.body.length === 0) return;
		io.writeOut(reply.body);
	}
	function unreachable(frame, err) {
		const message = `${remedyFor(err, timeoutMs)} ${STOP_INSTRUCTION}`;
		const framed = frameId(frame);
		if (framed) io.writeOut(JSON.stringify({
			jsonrpc: "2.0",
			id: framed.id,
			error: {
				code: -32603,
				message
			}
		}));
		else io.stderr(message);
	}
	const lines = createInterface({
		input: io.input,
		crlfDelay: Infinity
	});
	for await (const line of lines) {
		if (line.length === 0) continue;
		await forward(line);
	}
	return 0;
}
function frameId(frame) {
	try {
		const parsed = JSON.parse(frame);
		if (parsed !== null && typeof parsed === "object" && "id" in parsed) return { id: parsed.id };
	} catch {}
	return null;
}
var MIN_NODE_VERSION = "22.12.0";
function majorMinor(version) {
	const [major, minor] = version.split(".");
	return [Number.parseInt(major ?? "", 10), Number.parseInt(minor ?? "", 10)];
}
var [FLOOR_MAJOR, FLOOR_MINOR] = majorMinor(MIN_NODE_VERSION);
`${FLOOR_MAJOR}${FLOOR_MINOR}`;
function meetsNodeFloor(version) {
	const [major, minor] = majorMinor(version);
	if (Number.isNaN(major)) return false;
	if (major !== FLOOR_MAJOR) return major > FLOOR_MAJOR;
	return !Number.isNaN(minor) && minor >= FLOOR_MINOR;
}
var DAEMON_VERSION = "0.16.0";
function parseCommand(argv) {
	const verb = argv[0];
	if (verb === void 0) return { kind: "app" };
	switch (verb) {
		case "mcp": return { kind: "mcp" };
		case "daemon": return { kind: "daemon" };
		case "hook": return {
			kind: "hook",
			moment: argv[1] ?? ""
		};
		case "help":
		case "--help":
		case "-h": return { kind: "help" };
		default: return {
			kind: "unknown",
			verb
		};
	}
}
var USAGE = `tillage — the local daemon behind your project maps

Usage:
  tillage             Ensure the daemon is running and print the app URL
  tillage mcp         Run the stdio MCP shim (invoked by the plugin, not by hand)
  tillage daemon      Run the daemon in the foreground (debugging)
  tillage hook <m>    Run one Claude Code hook moment (invoked by the plugin)
  tillage --help      Show this message

Store root: TILLAGE_HOME (defaults to ~/.tillage)`;
function errorMessage(err) {
	return err instanceof Error ? err.message : String(err);
}
async function main(argv, io) {
	const command = parseCommand(argv);
	if (command.kind === "help") {
		io.stdout(USAGE);
		return 0;
	}
	if (command.kind === "unknown") {
		io.stderr(`Unknown command: ${command.verb}\n\n${USAGE}`);
		return 2;
	}
	if (command.kind === "hook") {
		try {
			const line = await io.runHook(command.moment, await io.readStdin());
			if (line !== null) io.stdout(line);
		} catch {}
		return 0;
	}
	if (!meetsNodeFloor(io.nodeVersion)) {
		io.stderr(`tillage needs Node ${MIN_NODE_VERSION} or newer; this is Node ${io.nodeVersion}. Upgrade the \`node\` on your PATH and try again.`);
		return 1;
	}
	if (command.kind === "daemon") return await io.runDaemon();
	let daemon;
	try {
		daemon = await io.ensure();
	} catch (err) {
		io.stderr(errorMessage(err));
		return 1;
	}
	if (command.kind === "mcp") return await runMcpShim({
		input: process.stdin,
		writeOut: (line) => process.stdout.write(`${line}\n`),
		stderr: io.stderr,
		ensure: io.ensure,
		cwd: process.cwd(),
		labelOverride: process.env["TILLAGE_SESSION_LABEL"]
	});
	io.stdout(`Tillage is running at http://127.0.0.1:${daemon.port}`);
	return 0;
}
function defaultIo() {
	const home = tillageHome();
	const ensure = () => ensureDaemon({
		home,
		version: DAEMON_VERSION,
		probe: probeDaemon,
		spawnDaemon: spawnDetachedDaemon,
		requestRestart: requestDaemonRestart,
		isProcessAlive,
		now: () => Date.now(),
		sleep
	});
	return {
		stdout: (line) => process.stdout.write(`${line}\n`),
		stderr: (line) => process.stderr.write(`${line}\n`),
		nodeVersion: process.versions.node,
		ensure,
		runDaemon: () => runDaemonForeground(home),
		readStdin: readAllStdin,
		runHook: async (moment, stdin) => {
			const { defaultWiring, runHookCommand } = await import("./hookEnv.mjs");
			return await runHookCommand(moment, stdin, defaultWiring(ensure));
		}
	};
}
async function readAllStdin() {
	if (process.stdin.isTTY === true) return "";
	const chunks = [];
	for await (const chunk of process.stdin) chunks.push(chunk);
	return Buffer.concat(chunks).toString("utf8");
}
async function runDaemonForeground(home, options = {}) {
	const { startServer } = await import("./server.mjs");
	let finish = null;
	const daemon = await startServer({
		home,
		version: DAEMON_VERSION,
		port: options.port,
		onRestartRequested: () => {
			process.stderr.write(`[tillage] daemon ${DAEMON_VERSION} shutting down: a newer plugin version asked to take over; it will start the replacement\n`);
			daemon.close().then(() => finish?.(0));
		},
		onClaimLost: () => {
			daemon.close().then(() => finish?.(0));
		},
		claimIntervalMs: options.claimIntervalMs,
		claimSettleMs: options.claimSettleMs
	});
	process.stderr.write(`[tillage] daemon ${DAEMON_VERSION} listening at ${daemon.url} (home=${home})\n`);
	return await new Promise((resolve) => {
		const shutdown = () => {
			daemon.close().then(() => done(0));
		};
		const done = (code) => {
			process.removeListener("SIGINT", shutdown);
			process.removeListener("SIGTERM", shutdown);
			resolve(code);
		};
		finish = done;
		process.once("SIGINT", shutdown);
		process.once("SIGTERM", shutdown);
	});
}
main(process.argv.slice(2), defaultIo()).then((code) => {
	process.exitCode = code;
}).catch((err) => {
	process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
	process.exitCode = 1;
});
