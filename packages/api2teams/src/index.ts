import { program } from 'commander';
import { getVersion } from './utils';
import { parseApi } from './parser';
import { CliOptions } from './interfaces';

export async function start() {
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
      await parseApi(yaml, options);
    })
    .showHelpAfterError();

  program.parse(process.argv);
}
