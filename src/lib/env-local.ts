import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";

const ENV_PATH = path.join(process.cwd(), ".env.local");

export function readEnvLocal(): Record<string, string> {
  try {
    return Object.fromEntries(fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((match) => [match![1], match![2].replace(/^['"]|['"]$/g, "")])) as Record<string, string>;
  } catch { return {}; }
}

export async function updateEnvLocal(values: Record<string, string>) {
  const current = readEnvLocal();
  Object.assign(current, values);
  const lines = Object.entries(current).map(([key, value]) => `${key}=${value}`);
  await fsPromises.writeFile(ENV_PATH, `${lines.join("\n")}\n`, "utf8");
}
