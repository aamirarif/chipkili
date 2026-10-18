import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { resolve as pathResolve } from "node:path";

const root = pathResolve(import.meta.dirname, "..");

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("lib/")) {
    const file = pathResolve(root, `${specifier}.ts`);
    if (existsSync(file)) return next(pathToFileURL(file).href, context);
  }
  return next(specifier, context);
}
