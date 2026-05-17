import { createServer } from "http";
import { readFileSync, existsSync, statSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const root = fileURLToPath(new URL(".", import.meta.url));
const distDir = join(root, "dist");
const hasDist = existsSync(join(distDir, "index.html"));
const port = Number(process.env.PORT) || 5173;
const PARASWAP = "https://api.paraswap.io";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".wasm": "application/wasm",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

function safePath(urlPath) {
  return urlPath.replace(/^\//, "").replace(/\.\./g, "");
}

function tryFile(filePath) {
  if (filePath.startsWith(root) && existsSync(filePath) && statSync(filePath).isFile()) {
    return filePath;
  }
  return null;
}

function resolveFile(urlPath) {
  const rel = safePath(urlPath);
  if (hasDist) {
    const fromDist = tryFile(join(distDir, rel));
    if (fromDist) return fromDist;
  }
  const candidates = [join(root, rel), join(root, "public", rel)];
  for (const p of candidates) {
    const hit = tryFile(p);
    if (hit) return hit;
  }
  return null;
}

async function proxyParaswap(req, res) {
  const url = new URL(req.url || "/", `http://localhost:${port}`);
  if (!url.pathname.startsWith("/api/swap/paraswap")) return false;

  const sub = url.pathname.replace("/api/swap/paraswap", "") + url.search;
  const init = {
    method: req.method,
    headers: {
      "Content-Type": req.headers["content-type"] || "application/json",
      "User-Agent": "EasyWallet/1.0",
    },
  };

  if (req.method === "POST" || req.method === "PUT") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    init.body = Buffer.concat(chunks);
  }

  try {
    const upstream = await fetch(`${PARASWAP}${sub}`, init);
    const body = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
      "Cache-Control": "public, max-age=10",
    });
    res.end(body);
  } catch (e) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: e?.message || "swap proxy failed" }));
  }
  return true;
}

createServer(async (req, res) => {
  if (await proxyParaswap(req, res)) return;

  let urlPath = req.url?.split("?")[0] || "/";

  if (urlPath === "/") {
    if (hasDist) {
      urlPath = "/index.html";
    } else {
      res.writeHead(503, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!DOCTYPE html><html lang="zh-CN"><body style="font-family:sans-serif;padding:2rem">
        <h1>Easy Wallet 尚未构建</h1>
        <p>请执行 <code>npm run dev</code> 进行开发，或 <code>npm run build</code> 后 <code>node server.mjs</code></p>
      </body></html>`);
      return;
    }
  }

  let filePath = resolveFile(urlPath);
  if (!filePath && hasDist && !extname(urlPath)) {
    filePath = join(distDir, "index.html");
  }
  if (!filePath) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found: " + urlPath);
    return;
  }

  const ext = extname(filePath);
  res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
  res.end(readFileSync(filePath));
}).listen(port, () => {
  console.log(`Easy Wallet: http://localhost:${port}`);
  console.log(`闪兑代理: /api/swap/paraswap`);
});
