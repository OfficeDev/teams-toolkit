import path from 'path';
import fs from 'fs-extra';
import { OpenAPIV3 } from 'openapi-types';

export function getVersion(): string {
  const pkgPath = path.resolve(__dirname, '..', 'package.json');
  const pkgContent = fs.readJsonSync(pkgPath);
  return pkgContent.version;
}

export async function isFolderEmpty(folderPath: string): Promise<boolean> {
  const files = await fs.readdir(folderPath);
  return files.length === 0;
}

export function getSafeAdaptiveCardName(
  api: OpenAPIV3.OperationObject,
  url: string,
  operation: string
): string {
  let name = api.operationId || api.summary || operation + url;
  name = name.replace(/[{}]/g, '');
  const wordArr = name.split(/[ /.-]/g);
  let newStr = wordArr[0];
  for (let i = 1; i < wordArr.length; i++) {
    newStr += wordArr[i].charAt(0).toUpperCase() + wordArr[i].slice(1);
  }
  newStr = newStr.charAt(0).toLowerCase() + newStr.slice(1);
  if (newStr.match(/^\d+/)) {
    newStr = `_${newStr}`;
  }
  return newStr;
}
