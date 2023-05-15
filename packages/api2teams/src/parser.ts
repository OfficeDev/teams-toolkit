import fs from 'fs-extra';
import { CliOptions } from './interfaces';
import {
  isFolderEmpty,
  getResponseJsonResult,
  componentRefToName
} from './utils';
import SwaggerParser from '@apidevtools/swagger-parser';
import { generateRequestCard } from './generateRequestCard';
import { OpenAPIV3 } from 'openapi-types';
import { AdaptiveCardResult } from './interfaces';
import path from 'path';
import { generateResponseCard } from './generateResponseCard';

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

  const unResolveApi = (await SwaggerParser.parse(yaml)) as OpenAPIV3.Document;
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
        const schema = getResponseJsonResult(unResolveApi.paths[url]!.get!)
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

  for (const card of requestCards) {
    const cardPath = path.join(options.output, `${card.name}RequestCard.json`);
    await fs.outputJSON(cardPath, card.content, { spaces: 2 });
  }

  for (const card of responseCards) {
    let cardPath = path.join(options.output, `${card.name}ResponseCard.json`);
    if (apiResponseToSchemaRef.has(card.url)) {
      const ref = apiResponseToSchemaRef.get(card.url);
      cardPath = path.join(
        options.output,
        componentRefToName(ref!) + (card.isArray ? 'List' : '') + 'Card.json'
      );
    }
    await fs.outputJson(cardPath, card.content, { spaces: 2 });
  }
}

async function isArgsValid(
  yaml: string,
  options: CliOptions
): Promise<boolean> {
  if (!fs.existsSync(yaml)) {
    console.error('yaml file path is not exist in the path: ' + yaml);
    return false;
  }

  if (await fs.existsSync(options.output)) {
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
