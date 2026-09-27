// Face lib/ importabil din scripturile de proba (npm run proba:reguli): rezolva
// `@/…` si extensiile .ts lipsa si transpileaza TypeScript cu compilatorul
// proiectului, care stie ce importuri sunt doar de tip.
import { register } from "node:module";
import { pathToFileURL } from "node:url";
register("data:text/javascript," + encodeURIComponent(`
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const RAD = ${JSON.stringify(pathToFileURL(process.cwd() + "/").href)};
const ts = createRequire(RAD)("typescript");
export async function resolve(spec, ctx, next) {
  let s = spec.startsWith("@/") ? new URL(spec.slice(2), RAD).href : spec;
  if ((s.startsWith("file:") || s.startsWith(".")) && !/\\.[cm]?[jt]sx?$/.test(s)) {
    const baza = s.startsWith(".") ? new URL(s, ctx.parentURL).href : s;
    for (const ext of [".ts", ".tsx", "/index.ts"]) {
      if (existsSync(fileURLToPath(baza + ext))) return { url: baza + ext, shortCircuit: true };
    }
  }
  return next(s, ctx);
}
export async function load(url, ctx, next) {
  if (/\\.m?tsx?$/.test(url) && url.startsWith("file:")) {
    const src = readFileSync(fileURLToPath(url), "utf8");
    const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
    return { format: "module", source: out.outputText, shortCircuit: true };
  }
  return next(url, ctx);
}`), pathToFileURL("./"));
