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

export function getSafeCardName(
  api: OpenAPIV3.OperationObject,
  url: string,
  operation: string
): string {
  let name = api.operationId || api.summary || operation + url;
  name = name.replace(/[{}]/g, '');
  const wordArr = name.split(/[ /.-]/g);
  let safeName = wordArr[0];
  for (let i = 1; i < wordArr.length; i++) {
    safeName += wordArr[i].charAt(0).toUpperCase() + wordArr[i].slice(1);
  }
  safeName = safeName.charAt(0).toLowerCase() + safeName.slice(1);
  if (safeName.match(/^\d+/)) {
    safeName = `_${safeName}`;
  }
  return safeName;
}

export function wrapperCard(
  body: any,
  adaptiveCardName: string,
  operation: string | undefined = undefined
): any {
  const fullCard = {
    type: 'AdaptiveCard',
    body,
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.5'
  } as any;

  if (operation) {
    fullCard.actions = [
      {
        type: 'Action.Execute',
        verb: adaptiveCardName,
        title: `${operation.toUpperCase()}`
      }
    ];
  }

  return fullCard;
}

export function getCardTitle(
  operation: string,
  url: string,
  summary: string | undefined = undefined
) {
  return {
    type: 'TextBlock',
    text: `${operation.toUpperCase()} ${url}: ${summary ?? ''}`,
    wrap: true
  };
}
