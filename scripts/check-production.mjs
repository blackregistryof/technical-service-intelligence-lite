// Regression check for the production data-source policy and HSTS, against the
// real production build (`next start`). Run `npm run build` first, then
// `npm run test:production`.
//
// For each DATA_SOURCE value it starts the server with throwaway credentials
// that exist only in this process tree, logs in, and verifies that:
// - the startup log names the expected source or configuration error;
// - every data page fails closed (no records, no configuration details);
// - HSTS is sent only for HTTPS requests (X-Forwarded-Proto: https);
// - the server log contains no secrets and no outgoing connection attempts.
//
// No database is reachable: DATABASE_URL is empty (which also stops Next from
// loading it from .env.local), the libpq PG* variables are removed, and
// scripts/no-network.mjs blocks every non-loopback connection and port 5432.

import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PORT = Number(process.env.CHECK_PORT ?? 3199);
const BASE = `http://localhost:${PORT}`;
const GUARD = new URL("no-network.mjs", import.meta.url);
const LEAK = "postgresql://check:not-a-real-secret-4711@db.example.invalid:5432/tsi";

if (!existsSync(new URL("../.next/BUILD_ID", import.meta.url))) {
  console.error("No production build found. Run `npm run build` first.");
  process.exit(1);
}

const CASES = [
  { value: "postgres", log: /\[data\] Data source: postgres\. The PostgreSQL adapter is not implemented yet/ },
  { value: "synthetic", log: /configuration error: DATA_SOURCE=synthetic is not allowed in production/ },
  { value: " synthetic ", log: /configuration error: DATA_SOURCE=synthetic is not allowed in production/ },
  { value: "", log: /configuration error: DATA_SOURCE is not set/ },
  { value: "Synthetic", log: /configuration error: Unsupported DATA_SOURCE value/ },
  { value: LEAK, log: /configuration error: Unsupported DATA_SOURCE value/ },
];
const DATA_PAGES = ["/rikketeated", "/rikketeated/syn-wo-wo-27480", "/seadmed", "/seadmed/ATM-0101"];
const RECORDS = /WO-\d{5}|Kassaline|Numera|ATM-01\d\d|TSI-SYNTH|syn-atm/;

let failures = 0;
const check = (label, name, ok, extra = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  [${label}] ${name}${extra ? `  (${extra})` : ""}`);
};

function startServer(dataSource) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/^PG/.test(key)) delete env[key];
  Object.assign(env, {
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    NODE_OPTIONS: `--import=${GUARD.href}`,
    DATABASE_URL: "",
    DATA_SOURCE: dataSource,
    APP_ACCESS_PASSWORD: randomBytes(18).toString("base64url"),
    SESSION_SECRET: randomBytes(48).toString("base64url"),
  });
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
    cwd: ROOT,
    env,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (chunk) => (log += chunk));
  child.stderr.on("data", (chunk) => (log += chunk));
  return { env, getLog: () => log, stop: () => stopServer(child) };
}

function stopServer(child) {
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  else process.kill(-child.pid, "SIGKILL");
}

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try {
      await fetch(`${BASE}/login`);
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return false;
}

const get = (path, headers = {}) => fetch(BASE + path, { redirect: "manual", headers });

async function login(password) {
  const decode = (s) => s.replaceAll("&amp;", "&").replaceAll("&quot;", '"');
  const html = await (await get("/login")).text();
  const form = html.match(/<form[^>]*>([\s\S]*?)<\/form>/)?.[1] ?? "";
  const body = new FormData();
  for (const [input] of form.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
    const name = input.match(/name="([^"]*)"/)?.[1];
    if (name) body.append(decode(name), decode(input.match(/value="([^"]*)"/)?.[1] ?? ""));
  }
  body.append("password", password);
  const res = await fetch(`${BASE}/login`, { method: "POST", body, redirect: "manual", headers: { origin: BASE } });
  return res.headers.getSetCookie().find((c) => c.startsWith("__Host-tsi_session="))?.split(";")[0];
}

async function runCase({ value, log: expectedLog }) {
  const label = value === LEAK ? "connection-string value" : JSON.stringify(value);
  const server = startServer(value);
  try {
    if (!(await waitForServer())) return check(label, "server started", false);

    const cookie = await login(server.env.APP_ACCESS_PASSWORD);
    check(label, "login works", Boolean(cookie));
    for (const path of DATA_PAGES) {
      const raw = await (await get(path, { cookie })).text();
      check(label, `${path} fails closed without records`, raw.includes("digest") && !RECORDS.test(raw.replaceAll("ATM-0101", "")));
      check(label, `${path} hides configuration details`, !/DATA_SOURCE|DataSourceConfigError|not implemented/.test(raw));
    }

    const https = await get("/login", { "x-forwarded-proto": "https" });
    check(label, "HSTS on HTTPS", https.headers.get("strict-transport-security") === "max-age=31536000; includeSubDomains");
    check(label, "no HSTS on plain HTTP", !(await get("/login")).headers.has("strict-transport-security"));
    check(label, "no HSTS for X-Forwarded-Proto: http", !(await get("/login", { "x-forwarded-proto": "http" })).headers.has("strict-transport-security"));
  } finally {
    server.stop();
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
  const log = server.getLog();
  check(label, "startup log names the source or error", expectedLog.test(log), log.match(/\[data\][^\n]*/)?.[0] ?? "no [data] line");
  const secrets = [server.env.APP_ACCESS_PASSWORD, server.env.SESSION_SECRET, "not-a-real-secret-4711"];
  check(label, "server log contains no secrets", !secrets.some((secret) => log.includes(secret)));
  check(label, "network guard active", log.includes("[no-network] outgoing connections restricted"));
  check(label, "no outgoing connection attempts", !log.includes("[no-network] BLOCKED"));
}

for (const testCase of CASES) await runCase(testCase);
console.log(failures ? `\n${failures} check(s) failed.` : "\nAll production checks passed.");
process.exit(failures ? 1 : 0);
