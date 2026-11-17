import { spawn } from "node:child_process";

const port = Number(process.env.PORT ?? 8787);
const server = spawn(
  "npx",
  ["wrangler", "dev", "--local", "--port", String(port), "--persist-to", ".wrangler/state"],
  { stdio: ["ignore", "pipe", "pipe"] },
);

let logs = "";
let ready = false;
const timeout = setTimeout(() => {
  finish(new Error(`Worker did not start on port ${port}.\n${logs}`));
}, 30_000);

server.stdout.setEncoding("utf8").on("data", (chunk) => {
  logs += chunk;
  if (logs.includes("Ready on")) ready = true;
});
server.stderr.setEncoding("utf8").on("data", (chunk) => {
  logs += chunk;
  if (logs.includes("Ready on")) ready = true;
});
server.on("error", (error) => finish(error));
server.on("exit", (code) => {
  if (!finished) finish(new Error(`Worker exited with code ${code}.\n${logs}`));
});

let finished = false;
function finish(error) {
  if (finished) return;
  finished = true;
  clearTimeout(timeout);
  server.kill("SIGTERM");
  if (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

for (let attempt = 0; attempt < 60 && !finished; attempt += 1) {
  if (ready) {
    try {
      const [page, health] = await Promise.all([
        fetch(`http://127.0.0.1:${port}/`),
        fetch(`http://127.0.0.1:${port}/api/health`),
      ]);
      const html = await page.text();
      const body = await health.json();

      if (!page.ok || !html.includes("Ecstasy — Mini App")) {
        throw new Error(`SPA smoke check failed: HTTP ${page.status}`);
      }
      if (health.status !== 200 || body.status !== "ok" || body.database !== "available") {
        throw new Error(`Health smoke check failed: HTTP ${health.status} ${JSON.stringify(body)}`);
      }

      console.log("Local Worker smoke check passed: SPA and D1 health endpoint responded.");
      finish();
      break;
    } catch (error) {
      finish(error);
      break;
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

if (!finished && !ready) {
  finish(new Error(`Worker did not become ready on port ${port}.\n${logs}`));
}
