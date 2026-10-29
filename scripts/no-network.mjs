// Preloaded into the server started by check-production.mjs (NODE_OPTIONS=--import).
// Blocks every outgoing TCP connection except to loopback, and always blocks
// the PostgreSQL port, so the check can never reach a real database or any
// external service. Blocked attempts are logged and fail the check.
import net from "node:net";

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const connect = net.Socket.prototype.connect;

net.Socket.prototype.connect = function guardedConnect(...args) {
  let options = Array.isArray(args[0]) ? args[0][0] : args[0];
  let host;
  let port;
  if (options && typeof options === "object") ({ host, port } = options);
  else if (/^\d+$/.test(String(options))) [port, host] = [Number(options), args[1]];
  else options = { path: options }; // IPC pipe / Unix socket

  if (!options.path && (!LOOPBACK.has(host ?? "localhost") || Number(port) === 5432)) {
    console.error(`[no-network] BLOCKED outgoing connection to ${host}:${port}`);
    process.nextTick(() => this.destroy(new Error("no-network: outgoing connection blocked")));
    return this;
  }
  return connect.apply(this, args);
};
console.log("[no-network] outgoing connections restricted to loopback");
