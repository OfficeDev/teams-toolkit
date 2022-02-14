const { spawn } = require("child_process");
require("dotenv").config();

process.env.CLIENT_ID = process.env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID;
process.env.CLIENT_SECRET = process.env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_SECRET;
process.env.IDENTIFIER_URI = `api://localhost/${process.env.CLIENT_ID}`;
process.env.OAUTH_AUTHORITY = `https://login.microsoftonline.com/${process.env.SDK_INTEGRATION_TEST_AAD_TENANT_ID}`;
process.env.AAD_METADATA_ADDRESS = `https://login.microsoftonline.com/${process.env.SDK_INTEGRATION_TEST_AAD_TENANT_ID}/v2.0/.well-known/openid-configuration`;
process.env.ALLOWED_APP_IDS =
  "1fec8e78-bce4-4aaf-ab1b-5451cc387264;5e3ce6c0-2b1f-4285-8d4b-75ee78787346;0ec893e0-5785-4de6-99da-4ed124e5296c;4345a7b9-9a63-4910-a426-35363201d503;4765445b-32c6-49b0-83e6-1d93765276ca;d3590ed6-52b3-4102-aeff-aad2292ab01c;00000002-0000-0ff1-ce00-000000000000;bc59ab01-8403-45c6-8796-ac3ef710b3e3";
process.env.TAB_APP_ENDPOINT = "*";
process.env.SDK_INTEGRATION_TEST_USER_OBJECT_ID = process.env.SDK_INTEGRATION_TEST_USER_OBJECT_ID;

const ls = spawn("dotnet", [
  `${__dirname}/SimpleAuthUnzipOutput/Microsoft.TeamsFx.SimpleAuth.dll`,
  "--urls=http://localhost:5000",
]);
ls.stdout.on("data", (data) => {
  console.log(`SimpleAuth stdout: ${data}`);
});

ls.stderr.on("data", (data) => {
  console.error(`SimpleAuth stderr: ${data}`);
});

ls.on("close", (code) => {
  console.log(`SimpleAuth child process exited with code ${code}`);
});
