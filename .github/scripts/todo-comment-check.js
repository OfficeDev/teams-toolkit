const Codeowners = require('codeowners');

// workingDir is optional, defaults to process.cwd()
const repos = new Codeowners();
const list = process.env.TODO_LIST;
if (!list) {
    list.exit(1);
}
// let list = `
// ./packages/tests/src/utils/playwrightOperation.ts:804:        // TODO validate content
// ./packages/tests/src/utils/playwrightOperation.ts:1044:      // TODO: add person
// ./packages/cli/src/cmds/env.ts:49:    // TODO: support --details
// ./packages/cli/src/cmds/env.ts:136:    // TODO: support --details
// ./packages/cli/src/cmds/env.ts:159:    // TODO: support --details
// ./packages/cli/src/cmds/preview/serviceLogWriter.ts:22:// TODO: may refactor when CLI framework provides file logger
// ./packages/cli/src/cmds/preview/task.ts:69:        // TODO: log
// ./packages/cli/src/cmds/preview/task.ts:73:        // TODO: log
// `;
let content = '';
const lines = list.trim().split('\n');
for (const line of lines) {
    const lineParts = line.split(':');
    if (lineParts.length < 1) {
        continue;
    }
    const fileInfo = lineParts[0];
    const filename = fileInfo.substring(2);
    const owners = repos.getOwner(filename); // => array of owner strings, e.g. ['@noahm']
    if (owners.length < 1) {
        owners.push('NO_OWNER');
    }
    // content += line + ': ' + owners.join(' ') + '\n';
    content += `${line}  [ ${owners.join(' ')} ]\n`
}
console.log(content);