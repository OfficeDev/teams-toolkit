const Codeowners = require('codeowners');

// workingDir is optional, defaults to process.cwd()
const repos = new Codeowners();
const list = process.env.TODO_LIST;
if (!list) {
    list.exit(1);
}
// let content = `
// ./packages/tests/src/utils/playwrightOperation.ts:804:        // TODO validate content
// ./packages/tests/src/utils/playwrightOperation.ts:1044:      // TODO: add person
// `;
const lines = list.split('\n');
for (const line of lines) {
    const parts = line.split(':');
    if (parts.length < 1) {
        continue;
    }
    const file = parts[0];
    const filename = file.substring(2);
    const owners = repos.getOwner(filename); // => array of owner strings, e.g. ['@noahm']
    content += line + ': ' + owners.join(' ') + '\n';
}
console.log(content);