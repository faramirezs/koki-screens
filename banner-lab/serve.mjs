/**
 * serve.mjs — the banner lab's gallery server.
 *
 * Static files plus one endpoint: POST /feedback appends a verdict to feedback.jsonl. The
 * file is the interface between us — it records the banner id AND the axis values, so
 * "which combination makes a good design" is a join, not a guess.
 *
 *   node serve.mjs [--port 7788] [--open]
 */
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { appendFileSync, existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FEEDBACK = path.join(HERE, "feedback.jsonl");
const argv = process.argv.slice(2);
const arg = (n, d) => (argv.indexOf(`--${n}`) >= 0 ? argv[argv.indexOf(`--${n}`) + 1] : d);
const PORT = Number(arg("port", 7788));
const HOST = arg("host", "0.0.0.0");

const TYPES = {
  // .mjs matters: the browser refuses to import a module served as application/octet-stream
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml",
  ".webm": "video/webm", ".mp4": "video/mp4", ".woff2": "font/woff2",
};

const json = (res, code, body) => {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/feedback" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const rec = JSON.parse(body);
        rec.at = new Date().toISOString();
        appendFileSync(FEEDBACK, JSON.stringify(rec) + "\n");
        json(res, 200, { ok: true });
      } catch (e) {
        json(res, 400, { ok: false, error: String(e.message) });
      }
    });
    return;
  }

  if (url.pathname === "/feedback") {
    const lines = existsSync(FEEDBACK) ? readFileSync(FEEDBACK, "utf8").trim().split("\n").filter(Boolean) : [];
    res.writeHead(200, { "content-type": "application/x-ndjson" });
    res.end(lines.join("\n"));
    return;
  }

  const rel = url.pathname === "/" ? "/gallery.html" : url.pathname;
  const file = path.join(HERE, path.normalize(rel).replace(/^(\.\.[/\\])+/, ""));
  if (!file.startsWith(HERE) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});

// 0.0.0.0 so the gallery is reachable over Tailscale; nothing else listens on this port
server.listen(PORT, HOST, () => {
  for (const [, addrs] of Object.entries(networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === "IPv4" && !a.internal) console.log(`banner lab  ->  http://${a.address}:${PORT}/`);
    }
  }
  console.log(`banner lab  ->  http://127.0.0.1:${PORT}/`);
  console.log(`feedback    ->  ${FEEDBACK}`);
});
