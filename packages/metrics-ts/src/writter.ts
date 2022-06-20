import { join } from "path";
import { tracePoint } from "./rawData";
import { cwd } from "process";
import { appendFile, ensureDir, ensureFile } from "fs-extra";
import { EOL } from "os";

const metricsFolder = join(cwd(), ".metrics");
const metricsFile = join(metricsFolder, "output.txt");

export async function appendOutput(data: tracePoint): Promise<void> {
  await ensureDir(metricsFolder);
  await ensureFile(metricsFile);
  await appendFile(metricsFile, JSON.stringify(data) + EOL);
  return;
}
