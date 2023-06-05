import fs from 'fs-extra';
import path from 'path';
import SwaggerParser from '@apidevtools/swagger-parser';
import { OpenAPIV3 } from 'openapi-types';
import { CliOptions, CodeResult, AdaptiveCardResult } from './interfaces';
import { formatCode, getSchemaRef, componentRefToCardName } from './utils';
import { generateRequestCard } from './generateRequestCard';
import { generateResponseCard } from './generateResponseCard';
import { generateActionHandler } from './generateActionHandler';
import { generateCommandHandler } from './generateCommandHandler';
import { generateIndexFile } from './generateIndexFile';
import { generateApi } from './generateApi';
import { generateCommandIntellisenses } from './generateCommandIntellisenses';

export async function parseApi(yaml: string, options: CliOptions) {
  try {
    if (await fs.pathExists(options.output)) {
      console.warn(
        '[WARNING] output folder already existed, and will override this folder'
      );

      await fs.rm(path.join(options.output, 'src'), {
        recursive: true,
        force: true
      });
    } else {
      const output = options.output;
      await fs.mkdir(output, { recursive: true });
    }
  } catch (e) {
    console.error(
      `[ERROR] Cannot create output folder with error: ${(e as Error).message}`
    );
    throw e;
  }

  console.log('start analyze swagger files');
  console.log(` > input yaml file path: ${yaml}`);
  console.log(` > output folder: ${options.output}`);

  const unResolvedApi = (await SwaggerParser.parse(yaml)) as OpenAPIV3.Document;
  const apis = (await SwaggerParser.validate(yaml)) as OpenAPIV3.Document;

  console.log(
    ' > yaml file information: API name: %s, Version: %s',
    apis.info.title,
    apis.info.version
  );

  console.log('analyze requests');
  const requestCards: AdaptiveCardResult[] = await generateRequestCard(apis);
  console.log(' > analyze successfully');

  console.log('analyze responses');
  const responseCards: AdaptiveCardResult[] = await generateResponseCard(apis);
  console.log(' > analyze successfully');

  console.log('generate request cards');
  for (const card of requestCards) {
    const cardPath = path.join(
      options.output,
      'src/adaptiveCards',
      `${card.name}.json`
    );
    await fs.outputJSON(cardPath, card.content, { spaces: 2 });
    console.log(` > generate ${card.name} successfully!`);
  }

  console.log('generate response cards');
  const schemaRefMap = getSchemaRef(unResolvedApi);
  for (const card of responseCards) {
    if (schemaRefMap.has(card.url)) {
      const ref = schemaRefMap.get(card.url);
      card.name = componentRefToCardName(ref!, card.isArray);
    }
    const cardPath = path.join(
      options.output,
      'src/adaptiveCards',
      `${card.name}.json`
    );
    await fs.outputJson(cardPath, card.content, { spaces: 2 });
    console.log(` > generate ${card.name} successfully!`);
  }

  console.log('generate help command card');
  await fs.copy(
    __dirname + '/resources/helpCard.json',
    options.output + '/src/adaptiveCards/helpCard.json'
  );

  console.log('generate action cards');
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
    console.log(` > generate ${cardActionHandler.name} successfully!`);
  }

  console.log('generate command handlers');
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
    console.log(` > generate ${commandHandler.name} successfully!`);
  }

  console.log('generate help command handler');
  await fs.copy(
    __dirname + '/resources/helpCommandHandler.txt',
    options.output + '/src/commands/helpCommandHandler.ts'
  );

  console.log('generate apis');
  const apiProviders = await generateApi(apis);
  for (const apiProviderResult of apiProviders) {
    const apiProviderPath = path.join(
      options.output,
      'src/apis',
      `${apiProviderResult.name}.ts`
    );
    await fs.outputFile(
      apiProviderPath,
      formatCode(apiProviderResult.code),
      'utf-8'
    );

    console.log(` > generate ${apiProviderResult.name} successfully!`);
  }

  console.log('generate index file');
  const indexFile = await generateIndexFile(responseCards);
  const indexFilePath = path.join(
    options.output,
    'src',
    `${indexFile.name}.ts`
  );
  await fs.outputFile(indexFilePath, formatCode(indexFile.code), 'utf-8');
  console.log(` > generate ${indexFile.name} successfully!`);

  console.log('copy project template');
  const resourcePath = path.join(__dirname, './resources/project-template');
  await fs.copy(resourcePath, options.output);
  console.log(` > copy template successfully!`);

  console.log('update manifest file');
  const intellisenses = await generateCommandIntellisenses(requestCards);
  const teamsAppMainifestPath = path.join(
    options.output,
    '/appPackage/manifest.json'
  );
  const manifestJson = await fs.readJSON(teamsAppMainifestPath, 'utf8');
  manifestJson.bots[0].commandLists[0].commands = intellisenses;
  await fs.outputJSON(teamsAppMainifestPath, manifestJson, { spaces: 2 });
  console.log(` > update manifest successfully!`);

  console.log('generate code successfully!');
}
