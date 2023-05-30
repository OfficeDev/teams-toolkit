import fs from 'fs-extra';
import { Command } from 'commander';
import { getVersion, isFolderEmpty } from './utils';
import { parseApi } from './parser';
import { CliOptions } from './interfaces';

export async function start() {
  const program = new Command();
  program
    .description('Convert swagger yaml file to Teams APP project')
    .argument('<yaml>', 'yaml file path to convert')
    .option(
      '-o, --output [string]',
      'output folder for teams app',
      './generated-teams-app'
    )
    .option('-f, --force', 'force overwrite the output folder')
    .version(getVersion(), '-v, --version', 'output the current version')
    .action(async (yaml: string, options: CliOptions) => {
      if (!(await fs.pathExists(yaml))) {
        console.error('yaml file path is not exist in the path: ' + yaml);
        return;
      }

      if (await fs.pathExists(options.output)) {
        const isOutputEmpty = await isFolderEmpty(options.output);

        if (!options.force && !isOutputEmpty) {
          console.error(
            'output folder is not empty, and you can use -f parameter to overwrite output folder'
          );
          return;
        }
      }

      await parseApi(yaml, options);
    })
    .showHelpAfterError()
    .allowUnknownOption();

  program.parse(process.argv);
}
