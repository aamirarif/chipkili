// One-time Admin setup. Prints the env lines for ADMIN_USER and ADMIN_PASSWORD_HASH.
// The second sign-in step is a code texted to the owner's phone (emailed as a backup).
// Usage: node scripts/admin-setup.mjs <user> <password> [--write .env.local]
import { randomBytes, scryptSync } from "node:crypto";
import { promises as fs } from "node:fs";

const [user = "owner", password] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!password || password.length < 10) {
  console.error("Usage: node scripts/admin-setup.mjs <user> <password (10+ characters)> [--write .env.local]");
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
const hash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
const lines = [`ADMIN_USER=${user}`, `ADMIN_PASSWORD_HASH=${hash}`];
const wIdx = process.argv.indexOf("--write");
if (wIdx > -1) {
  const file = process.argv[wIdx + 1] ?? ".env.local";
  let cur = "";
  try { cur = await fs.readFile(file, "utf8"); } catch {}
  const kept = cur.split(/\r?\n/).filter((l) => l && !/^ADMIN_(USER|PASSWORD_HASH|TOTP_SECRET)=/.test(l));
  await fs.writeFile(file, [...kept, ...lines].join("\n") + "\n");
  console.log(`Admin settings written to ${file}.`);
} else {
  console.log(lines.join("\n"));
}
