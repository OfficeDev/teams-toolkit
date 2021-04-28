const { spawn } = require('child_process');
const path = require('path');
const { pid } = require('process');
const simpleAuthDir = path.resolve(__dirname, "../../../../simpleauth/src/TeamsFxSimpleAuth");

process.env.CLIENT_ID= process.env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID;
process.env.CLIENT_SECRET=process.env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_SECRET;
process.env.IDENTIFIER_URI=`api://localhost/${process.env.CLIENT_ID}`;
process.env.OAUTH_AUTHORITY=`https://login.microsoftonline.com/${process.env.SDK_INTEGRATION_TEST_AAD_TENANT_ID}`;
process.env.AAD_METADATA_ADDRESS=`https://login.microsoftonline.com/${process.env.SDK_INTEGRATION_TEST_AAD_TENANT_ID}/v2.0/.well-known/openid-configuration`;
process.env.ALLOWED_APP_IDS="1fec8e78-bce4-4aaf-ab1b-5451cc387264;5e3ce6c0-2b1f-4285-8d4b-75ee78787346;3d6e5c14-3406-4de2-8c00-e647aa15705a";
process.env.TAB_APP_ENDPOINT="*";

let ls = spawn('dotnet', ['run', '--project', `${simpleAuthDir}/Microsoft.TeamsFx.SimpleAuth.csproj`], {detached:true});

ls.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) => {
  console.log(`child process exits ${code}`);
});

// let pid_ex = ls.pid;
// export {pid_ex};
