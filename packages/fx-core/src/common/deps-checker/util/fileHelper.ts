/**
 * @author Xiaofu Huang <xiaofhua@microsoft.com>
 */
import * as fs from "fs-extra";
import * as path from "path";

export async function createSymlink(target: string, linkFilePath: string): Promise<void> {
  // TODO: check if destination already exists
  try {
    const stat = await fs.lstat(linkFilePath);
    if (stat.isSymbolicLink()) {
      await fs.unlink(linkFilePath);
    }
  } catch (error: unknown) {
    const statError = error as { code?: string };
    if (statError.code !== "ENOENT") {
      throw error;
    }
  }
  await fs.mkdir(path.dirname(linkFilePath), { recursive: true, mode: 0o777 });
  return await fs.ensureSymlink(
    target,
    linkFilePath,
    // /* Only used for Windows. Directory junction is similar to directory link but does not require admin permission. */
    "junction"
  );
}

export async function rename(oldPath: string, newPath: string): Promise<void> {
  await fs.rename(oldPath, newPath);
}

//createSymlink("C:\\Users\\xiaofhua\\.fx\\bin\\func\\6f1d8433-5245-4722-aef3-eca96c8870c9")
