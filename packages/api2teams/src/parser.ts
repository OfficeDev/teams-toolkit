import fs from 'fs-extra';
import { CliOptions } from './interfaces';
import { isFolderEmpty } from './utils';

export async function parseApi(yaml: string, options: CliOptions) {
  if (!(await isArgsValid(yaml, options))) {
    return;
  }

  console.log(`yaml file path is: ${yaml}`);
  console.log(`output folder is: ${options.output}`);
}

async function isArgsValid(
  yaml: string,
  options: CliOptions
): Promise<boolean> {
  if (!fs.existsSync(yaml)) {
    console.error('yaml file path is not exist in the path: ' + yaml);
    return false;
  }
  const isOutputEmpty = await isFolderEmpty(options.output);

  if (!options.force && !isOutputEmpty) {
    console.error(
      'output folder is not empty, and you can use -f parameter to overwrite output folder'
    );
    return false;
  }

  return true;
}
