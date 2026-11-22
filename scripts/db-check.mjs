/**
 * Startup diagnostics for DATABASE_URL (never prints the password).
 * Checks DNS, TCP and the PostgreSQL TLS handshake so connection problems are
 * visible in the hosting logs. Exits 0 even on failure — Prisma reports the error itself.
 */
import dns from "node:dns/promises";
import net from "node:net";
import tls from "node:tls";

const raw = process.env.DATABASE_URL ?? "";
let url;
try {
  url = new URL(raw.trim());
} catch {
  console.log(`[db-check] DATABASE_URL is not a valid URL (starts with: ${JSON.stringify(raw.slice(0, 14))})`);
  process.exit(0);
}
const host = url.hostname;
const port = Number(url.port || 5432);
console.log(
  `[db-check] protocol=${url.protocol} user=${url.username ? url.username.slice(0, 3) + "…" : "(none)"} password=${url.password ? "set(" + url.password.length + ")" : "MISSING"} host=${host} port=${port} db=${url.pathname} params=${[...url.searchParams.keys()].join(",") || "(none)"}`,
);
if (/\s/.test(raw.trim()) || /^['"]|['"]$/.test(raw.trim())) console.log("[db-check] WARNING: value contains spaces or quotes");

try {
  const a = await dns.lookup(host, { all: true });
  console.log(`[db-check] DNS ok: ${a.map((x) => x.address).join(", ")}`);
} catch (e) {
  console.log(`[db-check] DNS FAILED: ${e.code}`);
  process.exit(0);
}

await new Promise((resolve) => {
  const sock = net.connect({ host, port, timeout: 8000 });
  sock.on("timeout", () => {
    console.log("[db-check] TCP timeout");
    sock.destroy();
    resolve();
  });
  sock.on("error", (e) => {
    console.log(`[db-check] TCP error: ${e.code}`);
    resolve();
  });
  sock.on("connect", () => {
    // PostgreSQL SSLRequest
    const req = Buffer.alloc(8);
    req.writeInt32BE(8, 0);
    req.writeInt32BE(80877103, 4);
    sock.write(req);
  });
  sock.once("data", (d) => {
    const answer = String.fromCharCode(d[0]);
    console.log(`[db-check] TCP ok, SSLRequest answer: ${answer}`);
    if (answer !== "S") {
      sock.destroy();
      return resolve();
    }
    const t = tls.connect({ socket: sock, servername: host, timeout: 8000 }, () => {
      console.log(`[db-check] TLS ok (${t.getProtocol()})`);
      t.destroy();
      resolve();
    });
    t.on("error", (e) => {
      console.log(`[db-check] TLS error: ${e.code || e.message}`);
      resolve();
    });
  });
});
