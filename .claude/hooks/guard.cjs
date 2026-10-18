#!/usr/bin/env node
'use strict';

// Claude Code PreToolUse guard for the ChipKili repo.
// Reads the hook JSON from stdin: {tool_name, tool_input}.
// Exit 2 blocks the tool call (reason goes to stderr). Anything else exits 0.
// No dependencies. Bad or empty input exits 0 so a broken hook never blocks work.

const fs = require('fs');

const ENV_FILE_RE = /^\.env(\..+)?$/;
const ENV_ALLOWED = new Set(['.env.example']);
const ENV_TOKEN_RE = /\.env(?:\.[A-Za-z0-9_-]+)?\b/g;
const SAFE_START_RE = /^\s*(git|ls)\b/;
const DEPLOY_RE = /\b(docker\s+(build|run|compose|stop|rm|restart)|ssh\s+(rtx|vps)|scp\b.*(rtx|vps):)/;

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch (err) {
    return '';
  }
}

function referencesSecretEnv(command) {
  const tokens = command.match(ENV_TOKEN_RE) || [];
  return tokens.some((token) => !ENV_ALLOWED.has(token));
}

function fileToolReason(input) {
  const filePath = typeof input.file_path === 'string' ? input.file_path : '';
  const base = filePath.split(/[\\/]/).pop() || '';
  if (ENV_FILE_RE.test(base) && !ENV_ALLOWED.has(base)) {
    return 'Blocked: ' + base + ' holds secrets. Read .env.example for variable names instead.';
  }
  return null;
}

function searchReason(input) {
  const targets = [input.path, input.pattern, input.glob].filter((v) => typeof v === 'string');
  if (targets.some(referencesSecretEnv)) {
    return 'Blocked: this search targets a .env file. Read .env.example for variable names instead.';
  }
  return null;
}

function bashReason(input) {
  const command = typeof input.command === 'string' ? input.command : '';
  if (referencesSecretEnv(command) && !SAFE_START_RE.test(command)) {
    return 'Blocked: this command would print a .env file. Name only the non-secret variable you need.';
  }
  if (DEPLOY_RE.test(command)) {
    return 'Blocked: deploy or server change needs owner GO. Run it outside the guarded session.';
  }
  return null;
}

function blockReason(payload) {
  const input = payload.tool_input && typeof payload.tool_input === 'object' ? payload.tool_input : {};
  if (payload.tool_name === 'Read' || payload.tool_name === 'Edit' || payload.tool_name === 'Write') {
    return fileToolReason(input);
  }
  if (payload.tool_name === 'Grep' || payload.tool_name === 'Glob') {
    return searchReason(input);
  }
  if (payload.tool_name === 'Bash') {
    return bashReason(input);
  }
  return null;
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readStdin());
  } catch (err) {
    return 0;
  }
  if (!payload || typeof payload !== 'object') {
    return 0;
  }
  const reason = blockReason(payload);
  if (reason) {
    process.stderr.write(reason + '\n');
    return 2;
  }
  return 0;
}

process.exitCode = main();
