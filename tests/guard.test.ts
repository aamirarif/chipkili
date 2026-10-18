import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const GUARD = path.join(import.meta.dirname, "..", ".claude", "hooks", "guard.cjs");

function run(tool_name: string, tool_input: Record<string, unknown>): number | null {
  return spawnSync(process.execPath, [GUARD], { input: JSON.stringify({ tool_name, tool_input }), encoding: "utf8" }).status;
}

test("guard blocks reading .env files but allows .env.example", () => {
  assert.equal(run("Read", { file_path: "C:/x/.env.local" }), 2);
  assert.equal(run("Read", { file_path: "C:/x/.env.example" }), 0);
});

test("guard blocks Grep and Glob aimed at .env files", () => {
  assert.equal(run("Grep", { pattern: "KEY", path: "site/.env.local" }), 2);
  assert.equal(run("Grep", { pattern: "KEY", glob: ".env*" }), 2);
  assert.equal(run("Glob", { pattern: "**/.env.production" }), 2);
  assert.equal(run("Grep", { pattern: "KEY", path: "site/.env.example" }), 0);
  assert.equal(run("Grep", { pattern: "otp", path: "lib" }), 0);
});

test("guard blocks any bash command naming a .env file unless it starts with git or ls", () => {
  assert.equal(run("Bash", { command: "cat .env.local" }), 2);
  assert.equal(run("Bash", { command: "node -e \"require('fs').readFileSync('.env')\"" }), 2);
  assert.equal(run("Bash", { command: "cat .env.example" }), 0);
  assert.equal(run("Bash", { command: "ls -la .env.local" }), 0);
  assert.equal(run("Bash", { command: "git check-ignore .env.local" }), 0);
  assert.equal(run("Bash", { command: "npm test" }), 0);
});

test("guard blocks deploy commands", () => {
  assert.equal(run("Bash", { command: "ssh rtx ls" }), 2);
});
