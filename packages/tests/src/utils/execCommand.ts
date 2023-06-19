import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

export async function execCommand(
  testFolder: string,
  command: string
): Promise<any> {
  const result = await execAsync(command, {
    cwd: testFolder,
    env: process.env,
  });

  if (result.stderr) {
    console.log(`[CLI] ${result.stderr}`);
  }
  return result;
}
