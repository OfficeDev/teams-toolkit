const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
require("dotenv").config();
const admZip = require('adm-zip');
const path = require('path');
let simpleAuthDir = path.resolve(__dirname, "../../../../fx-core/templates/plugins/resource/simpleauth");
let simpleAuthZip = `${simpleAuthDir}/SimpleAuth.zip`;
if(!fs.existsSync(simpleAuthZip)) {
    spawnSync("powershell.exe",[path.resolve(__dirname, "./downloadSimpleAuth.ps1.ps1")]);
}
simpleAuthZip = new admZip(`${simpleAuthZip}`);
simpleAuthZip.extractAllTo(`${simpleAuthDir}/SimpleAuthUnzipOutput`, true);
simpleAuthDir = path.resolve(simpleAuthDir, "SimpleAuthUnzipOutput");
process.env.CLIENT_ID= process.env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID;
process.env.CLIENT_SECRET=process.env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_SECRET;
process.env.IDENTIFIER_URI=`api://localhost/${process.env.CLIENT_ID}`;
process.env.OAUTH_AUTHORITY=`https://login.microsoftonline.com/${process.env.SDK_INTEGRATION_TEST_AAD_TENANT_ID}`;
process.env.AAD_METADATA_ADDRESS=`https://login.microsoftonline.com/${process.env.SDK_INTEGRATION_TEST_AAD_TENANT_ID}/v2.0/.well-known/openid-configuration`;
process.env.ALLOWED_APP_IDS="1fec8e78-bce4-4aaf-ab1b-5451cc387264;5e3ce6c0-2b1f-4285-8d4b-75ee78787346;3d6e5c14-3406-4de2-8c00-e647aa15705a";
process.env.TAB_APP_ENDPOINT="*";
process.env.SDK_INTEGRATION_TEST_USER_OBJECT_ID = process.env.SDK_INTEGRATION_TEST_USER_OBJECT_ID;
let ls = spawn('dotnet', [`${simpleAuthDir}/Microsoft.TeamsFx.SimpleAuth.dll`]);
