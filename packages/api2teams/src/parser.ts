import fs from 'fs-extra';
import path from 'path';
import SwaggerParser from '@apidevtools/swagger-parser';
import { OpenAPIV3 } from 'openapi-types';
import { CliOptions, CodeResult, AdaptiveCardResult } from './interfaces';
import {
  isFolderEmpty,
  componentRefToName,
  formatCode,
  getSchemaRef
} from './utils';
import { generateRequestCard } from './generateRequestCard';
import { generateResponseCard } from './generateResponseCard';
import { generateActionHandler } from './generateActionHandler';
import { generateCommandHandler } from './generateCommandHandler';
import { generateIndexFile } from './generateIndexFile';
import { generateApi } from './generateApi';

export async function parseApi(yaml: string, options: CliOptions) {
  if (!(await isArgsValid(yaml, options))) {
    return;
  }

  console.log(`yaml file path is: ${yaml}`);
  console.log(`output folder is: ${options.output}`);

  try {
    if (await fs.pathExists(options.output)) {
      console.log(
        'output folder already existed, and will override this folder'
      );
    } else {
      const output = options.output;
      await fs.mkdir(output, { recursive: true });
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

  console.log('start analyze swagger files\n');

  const requestCards: AdaptiveCardResult[] = await generateRequestCard(apis);
  const responseCards: AdaptiveCardResult[] = await generateResponseCard(apis);

  for (const card of requestCards) {
    const cardPath = path.join(
      options.output,
      'src/adaptiveCards',
      `${card.name}.json`
    );
    await fs.outputJSON(cardPath, card.content, { spaces: 2 });
  }

  const schemaRefMap = getSchemaRef(unResolvedApi);
  for (const card of responseCards) {
    if (schemaRefMap.has(card.url)) {
      const ref = schemaRefMap.get(card.url);
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
    const cardActionHandler: CodeResult = await generateActionHandler(
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

  for (const card of responseCards) {
    const commandHandler: CodeResult = await generateCommandHandler(
      card.api,
      card.name,
      card.id,
      card.url,
      card.tag
    );

    const cardActionHandlerPath = path.join(
      options.output,
      'src/commands',
      `${commandHandler.name}.ts`
    );

    await fs.outputFile(cardActionHandlerPath, commandHandler.code);
  }

  const apiProviders = await generateApi(apis);
  for (const apiProviderResult of apiProviders) {
    await fs.outputFile(
      path.join(options.output, 'src/apis', apiProviderResult.name + '.ts'),
      formatCode(apiProviderResult.code),
      'utf-8'
    );
  }

  const indexFile = await generateIndexFile(responseCards);
  await fs.outputFile(
    path.join(options.output, 'src/index.ts'),
    indexFile.code,
    'utf-8'
  );
}

async function isArgsValid(
  yaml: string,
  options: CliOptions
): Promise<boolean> {
  if (!(await fs.pathExists(yaml))) {
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
