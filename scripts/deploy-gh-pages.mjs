#!/usr/bin/env node
/**
 * Build China-friendly static site and push to gh-pages branch.
 * GitHub Pages: https://asd6666667.github.io/creator-vault/
 */
import { execSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const git = process.env.GIT_PATH || "git";
const remote = process.env.DEPLOY_REMOTE || "origin";
const branch = "gh-pages";

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", cwd: opts.cwd || root, env: { ...process.env, ...opts.env } });
}

console.log("Building for GitHub Pages (relative assets)...");
run("npm run build:china");

const tmp = mkdtempSync(join(tmpdir(), "cv-gh-pages-"));
cpSync(join(root, "dist"), tmp, { recursive: true });

const gitEnv = {
  GIT_AUTHOR_NAME: "Creator Vault",
  GIT_AUTHOR_EMAIL: "creator-vault@users.noreply.github.com",
  GIT_COMMITTER_NAME: "Creator Vault",
  GIT_COMMITTER_EMAIL: "creator-vault@users.noreply.github.com",
};

try {
  run(`${git} init`, { cwd: tmp });
  run(`${git} checkout -b ${branch}`, { cwd: tmp, env: gitEnv });
  run(`${git} add -A`, { cwd: tmp });
  run(`${git} commit -m "deploy: ${new Date().toISOString()}"`, { cwd: tmp, env: gitEnv });
  const repo = process.env.REPO_URL || "https://github.com/asd6666667/creator-vault.git";
  run(`${git} push -f ${repo} HEAD:${branch}`, { cwd: tmp, env: gitEnv });
  console.log("\nChina / domestic URL:");
  console.log("  https://asd6666667.github.io/creator-vault/");
  console.log("\nInternational: deploy main to Vercel (auto on git push).");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
