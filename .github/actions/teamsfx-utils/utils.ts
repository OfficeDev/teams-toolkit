import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';


export function setOutput(key: string, value: string) {
    // Temporary hack until core actions library catches up with github new recommendations
    const output = process.env['GITHUB_OUTPUT'];
    fs.appendFileSync(output, `${key}=${value}${os.EOL}`);
}

export function getEmail(githubUser?: string): string {
    if (!githubUser) {
        return "";
    }
    const res = fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'accounts.json'));
    const accounts = JSON.parse(res.toString());
    if (accounts[githubUser]) {
        let email = accounts[githubUser];
        email += '@microsoft.com';
        return email;
    } else {
        return "";
    }
}

export function sendAlert(subject: string, message: string, email?: string) {
    if (!email) {
        email = "zhaofengxu@microsoft.com"
    }
    setOutput('alert_to', email);
    setOutput('alert_subject', subject);
    setOutput('alert_body', message);
}
