import path from 'path';
import fs from 'fs-extra';

export function getVersion(): string {
  const pkgPath = path.resolve(__dirname, '..', 'package.json');
  const pkgContent = fs.readJsonSync(pkgPath);
  return pkgContent.version;
}

export async function isFolderEmpty(folderPath: string): Promise<boolean> {
  const files = await fs.readdir(folderPath);
  return files.length === 0;
}
