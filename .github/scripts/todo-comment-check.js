const Codeowners = require('codeowners');

// workingDir is optional, defaults to process.cwd()
const repos = new Codeowners();
const list = process.env.TODO_LIST;
if (!list) {
    list.exit(1);
}
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
    content += `${line}  [ ${owners.join(' ')} ]\n`
}
console.log(content);