// Test-only: lets node resolve the project's baseUrl imports ("lib/types") to ./lib/types.ts.
import { register } from "node:module";
register("./alias-hooks.mjs", import.meta.url);
