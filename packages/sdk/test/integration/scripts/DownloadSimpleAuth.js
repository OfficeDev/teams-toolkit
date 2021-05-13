const admZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const got = require('got');

async function downloadSimpleAuth() {
    const versionFilePath = path.join(__dirname, "SimpleAuthVersion.txt");
    const version = fs.readFileSync(versionFilePath, "utf-8");
    const tagName = `simpleauth@${version}`;
    const fileName = `Microsoft.TeamsFx.SimpleAuth_${version}.zip`;
    const distUrl = `https://github.com/OfficeDev/TeamsFx/releases/download/${tagName}/${fileName}`;
    try {
        await got.stream(distUrl).pipe(fs.createWriteStream(path.resolve(__dirname, "SimpleAuth.zip")));
    } catch (error) {
        console.log(error.message);
    }
}

async function unzipSimpleAuth() {
    let simpleAuthZip = `${__dirname}/SimpleAuth.zip`;
    if (!fs.existsSync(simpleAuthZip)) {
        try {
            await downloadSimpleAuth();
        } catch (err) {
            console.log(err.message);
        }
    }
    setTimeout(() => {
        simpleAuthZip = new admZip(`${simpleAuthZip}`);
        simpleAuthZip.extractAllTo(`${__dirname}/SimpleAuthUnzipOutput`, true);
    }, 2000);
}

(async () => {
    await unzipSimpleAuth();
})();