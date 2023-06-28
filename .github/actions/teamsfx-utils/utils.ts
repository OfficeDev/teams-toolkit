import * as os from 'os';
import * as fs from 'fs-extra';
import * as path from 'path';


export function setOutput(key: string, value: string) {
    // Temporary hack until core actions library catches up with github new recommendations
    const output = process.env['GITHUB_OUTPUT'];
    fs.appendFileSync(output, `${key}=${value}${os.EOL}`);
}

export function getEmail(githubUser: string): string {
    const accounts = fs.readJsonSync(path.join(__dirname, '../..', '.github', 'accounts.json'));
    if (accounts[githubUser]) {
        let email = accounts[githubUser];
        email += '@microsoft.com';
        return email;
    } else {
        return "";
    }
}