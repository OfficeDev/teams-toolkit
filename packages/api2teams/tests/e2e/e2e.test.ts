import fs from 'fs-extra';
import { start } from '../../src/index';
import path from 'path';

describe('e2e', function() {
  this.timeout(5000*60);

  beforeEach(() => {
    fs.rmSync(__dirname + 'e2e-test-output/', {
      recursive: true,
      force: true
    });
  });

  afterEach(() => {});

  it('should not throw error for all test yaml file', async () => {
    const yamlFiles = getAllTestYamlFiles(__dirname + '/swagger-files');
    for (let i = 0; i < yamlFiles.length; i++) {
      console.log("genernate app: " + yamlFiles[i]);
      process.argv = [
        'node',
        'cli.js',
        yamlFiles[i],
        '--output',
        __dirname + '/e2e-test-output/' + i,
        '-f'
      ];
      await start();
    }
  });
});

function getAllTestYamlFiles(dirPath: string): string[] {
  let files: string[] = [];

  // Get all files and directories in the current directory
  const items = fs.readdirSync(dirPath);

  // Iterate over each item
  for (const item of items) {
    const itemPath = path.join(dirPath, item);

    // If the item is a directory, recursively call this function
    if (fs.statSync(itemPath).isDirectory()) {
      files = files.concat(getAllTestYamlFiles(itemPath));
    }

    // If the item is a YAML file, add it to the list of files
    if (
      path.extname(itemPath) === '.yaml' ||
      path.extname(itemPath) === '.yml'
    ) {
      files.push(itemPath);
    }
  }
  return files;
}
