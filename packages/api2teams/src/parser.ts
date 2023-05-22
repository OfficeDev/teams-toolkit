import fs from 'fs-extra';
import {
  ActionHandlerResult,
  CliOptions,
  ResponseObjectResult
} from './interfaces';
import {
  isFolderEmpty,
  getResponseJsonResult,
  componentRefToName,
  formatCode,
  capitalizeFirstLetter
} from './utils';
import SwaggerParser from '@apidevtools/swagger-parser';
import { generateRequestCard } from './generateRequestCard';
import { OpenAPIV3 } from 'openapi-types';
import { AdaptiveCardResult } from './interfaces';
import path from 'path';
import { generateResponseCard } from './generateResponseCard';
import { generateResponseObject } from './generateResponseObject';
import { generateActionHandler } from './generateActionHandler';

export async function parseApi(yaml: string, options: CliOptions) {
  if (!(await isArgsValid(yaml, options))) {
    return;
  }

  console.log(`yaml file path is: ${yaml}`);
  console.log(`output folder is: ${options.output}`);

  try {
    if (fs.existsSync(options.output)) {
      console.log(
        'output folder already existed, and will override this folder'
      );
    } else {
      const output = options.output;
      fs.mkdirSync(output, { recursive: true });
    }
  } catch (e) {
    console.error(
      `Cannot create output folder with error: ${(e as Error).message}`
    );
    throw e;
  }

  const unResolvedApi = (await SwaggerParser.parse(yaml)) as OpenAPIV3.Document;
  const apis = (await SwaggerParser.validate(yaml)) as OpenAPIV3.Document;

  console.log(
    'yaml file information: API name: %s, Version: %s',
    apis.info.title,
    apis.info.version
  );

  const apiResponseToSchemaRef = new Map<string, string>();
  for (const url in apis.paths) {
    for (const operation in apis.paths[url]) {
      if (operation === 'get') {
        const schema = getResponseJsonResult(unResolvedApi.paths[url]!.get!)
          .schema as any;
        if (schema) {
          if (schema.type === 'array') {
            apiResponseToSchemaRef.set(url, schema.items.$ref);
          } else if (schema.$ref) {
            apiResponseToSchemaRef.set(url, schema.$ref);
          }
        }
      }
    }
  }

  console.log('start analyze swagger files\n');

  const requestCards: AdaptiveCardResult[] = await generateRequestCard(apis);
  const responseCards: AdaptiveCardResult[] = await generateResponseCard(apis);
  const sampleResponse: ResponseObjectResult[] = await generateResponseObject(
    apis
  );

  for (const card of requestCards) {
    const cardPath = path.join(
      options.output,
      'src/adaptiveCards',
      `${card.name}.json`
    );
    await fs.outputJSON(cardPath, card.content, { spaces: 2 });
  }

  for (const card of responseCards) {
    if (apiResponseToSchemaRef.has(card.url)) {
      const ref = apiResponseToSchemaRef.get(card.url);
      card.name =
        componentRefToName(ref!) + (card.isArray ? 'List' : '') + 'Card';
    }
    const cardPath = path.join(
      options.output,
      'src/adaptiveCards',
      `${card.name}.json`
    );
    await fs.outputJson(cardPath, card.content, { spaces: 2 });
  }

  for (const card of responseCards) {
    const cardActionHandler: ActionHandlerResult = await generateActionHandler(
      card.tag,
      card.name,
      card.id
    );

    const cardActionHandlerPath = path.join(
      options.output,
      'src/cardActions',
      `${cardActionHandler.name}.ts`
    );

    await fs.outputFile(cardActionHandlerPath, cardActionHandler.code);
  }

  const apiFunctionsByTag: Record<string, string[]> = {};
  const emptyFunctionsByTag: Record<string, string[]> = {};
  for (const sampleJsonResult of sampleResponse) {
    const jsonString = JSON.stringify(sampleJsonResult.content, null, 2);
    const tag = sampleJsonResult.tag;
    const apiFuncTemplate = fs.readFileSync(
      path.join(__dirname, './resources/apiFuncTemplate.txt'),
      'utf-8'
    );
    const mockApiFunction = apiFuncTemplate
      .replace('{{functionName}}', sampleJsonResult.name)
      .replace('{{returnJsonObject}}', `return ${jsonString};`);
    const emptyApiFunction = apiFuncTemplate
      .replace('{{functionName}}', sampleJsonResult.name)
      .replace('{{returnJsonObject}}', '');
    if (!apiFunctionsByTag[tag]) {
      apiFunctionsByTag[tag] = [];
    }
    apiFunctionsByTag[tag].push(mockApiFunction);

    if (!emptyFunctionsByTag[tag]) {
      emptyFunctionsByTag[tag] = [];
    }
    emptyFunctionsByTag[tag].push(emptyApiFunction);
  }

  let realApiProviderCode =
    '// Update this code to call real backend service\n';
  let mockApiProviderCode = '';
  for (const tag in apiFunctionsByTag) {
    const apiClassTemplate = fs.readFileSync(
      path.join(__dirname, './resources/apiClassTemplate.txt'),
      'utf-8'
    );
    const mockApiClass = apiClassTemplate
      .replace('{{className}}', capitalizeFirstLetter(tag) + 'Api')
      .replace('{{apiList}}', apiFunctionsByTag[tag].join('\n'));

    const realApiClass = apiClassTemplate
      .replace('{{className}}', capitalizeFirstLetter(tag) + 'Api')
      .replace('{{apiList}}', emptyFunctionsByTag[tag].join('\n'));
    mockApiProviderCode += mockApiClass + '\n';
    realApiProviderCode += realApiClass + '\n';
  }

  fs.outputFileSync(
    path.join(options.output, 'src/apis', 'mockApiProvider.ts'),
    formatCode(mockApiProviderCode),
    'utf-8'
  );

  fs.outputFileSync(
    path.join(options.output, 'src/apis', 'realApiProvider.ts'),
    formatCode(realApiProviderCode),
    'utf-8'
  );
}

async function isArgsValid(
  yaml: string,
  options: CliOptions
): Promise<boolean> {
  if (!fs.existsSync(yaml)) {
    console.error('yaml file path is not exist in the path: ' + yaml);
    return false;
  }

  if (await fs.pathExists(options.output)) {
    const isOutputEmpty = await isFolderEmpty(options.output);

    if (!options.force && !isOutputEmpty) {
      console.error(
        'output folder is not empty, and you can use -f parameter to overwrite output folder'
      );
      return false;
    }
  }

  return true;
}
