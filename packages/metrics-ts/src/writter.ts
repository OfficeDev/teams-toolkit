import { join } from "path";
import { tracePoint } from "./rawData";
import { appendFile, ensureDir, ensureFile } from "fs-extra";
import { EOL, tmpdir } from "os";

const metricsFolder = join(tmpdir(), ".metrics");
const metricsFile = join(metricsFolder, "output.txt");

export async function appendOutput(data: tracePoint): Promise<void> {
  await ensureDir(metricsFolder);
  await ensureFile(metricsFile);
  await appendFile(metricsFile, JSON.stringify(data) + EOL);
  return;
}
