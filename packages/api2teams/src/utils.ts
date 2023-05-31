import path from 'path';
import fs from 'fs-extra';
import { OpenAPIV3 } from 'openapi-types';
import prettier from 'prettier';

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
  const name = api.operationId || api.summary || operation + url;
  return getSafeName(name);
}

export function getSafeName(tag: string): string {
  let name = tag;
  name = name.replace(/[{}]/g, '');
  const wordArr = name.split(/[ !@#$%^&*()\-_+=|:;"',.<>?/\\]/g);
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
    text: `${operation.toUpperCase()} ${url}${summary ? ': ' + summary : ''}`,
    wrap: true
  };
}

export function formatCode(code: string): string {
  const formattedCode = prettier.format(code, {
    parser: 'typescript',
    semi: true,
    singleQuote: true,
    trailingComma: 'all',
    arrowParens: 'always',
    printWidth: 80,
    tabWidth: 2
  });
  return formattedCode;
}

export function getResponseJsonResult(
  operationObject: OpenAPIV3.OperationObject | undefined
): OpenAPIV3.MediaTypeObject {
  let jsonResult =
    (operationObject?.responses?.['200'] as OpenAPIV3.ResponseObject)
      ?.content?.['application/json'] ??
    (operationObject?.responses?.['201'] as OpenAPIV3.ResponseObject)
      ?.content?.['application/json'] ??
    (operationObject?.responses?.default as OpenAPIV3.ResponseObject)
      ?.content?.['application/json'];

  if (!jsonResult) {
    jsonResult = {};
  }

  return jsonResult;
}

export function componentRefToCardName(ref: string, isArray: boolean): string {
  const refArr = ref.split('/');
  const lastName = refArr[refArr.length - 1];
  return lastName + (isArray ? 'List' : '') + 'Card';
}

export function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getSchemaRef(
  unResolvedApi: OpenAPIV3.Document
): Map<string, string> {
  const schemaRefMap = new Map<string, string>();
  for (const url in unResolvedApi.paths) {
    for (const operation in unResolvedApi.paths[url]) {
      if (operation === 'get') {
        const schema = getResponseJsonResult(unResolvedApi.paths[url]?.get)
          .schema as any;
        if (schema) {
          if (schema.type === 'array' && schema.items.$ref) {
            schemaRefMap.set(url, schema.items.$ref);
          } else if (schema.$ref) {
            schemaRefMap.set(url, schema.$ref);
          }
        }
      }
    }
  }

  return schemaRefMap;
}

export function truncateString(str: string, maxLength: number): string {
  maxLength = maxLength - 3;
  let truncatedStr = str.slice(0, maxLength);

  // Ensure that the last word is complete
  if (truncatedStr.length === maxLength) {
    const lastSpaceIndex = truncatedStr.lastIndexOf(' ');
    if (lastSpaceIndex !== -1) {
      truncatedStr = truncatedStr.slice(0, lastSpaceIndex) + '...';
    }
  }

  return truncatedStr;
}
