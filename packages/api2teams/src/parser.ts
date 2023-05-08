import fs from 'fs-extra';
import { CliOptions } from './interfaces';
import { isFolderEmpty } from './utils';
import SwaggerParser from '@apidevtools/swagger-parser';
import { generateRequestAdaptiveCard } from './generateRequestAdaptiveCard';
import { OpenAPIV3 } from 'openapi-types';

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

  const apis: OpenAPIV3.Document = (await SwaggerParser.validate(
    yaml
  )) as OpenAPIV3.Document;

  console.log(
    'yaml file information: API name: %s, Version: %s',
    apis.info.title,
    apis.info.version
  );

  console.log('start analyze swagger files\n');

  await generateRequestAdaptiveCard(apis, options.output);
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
