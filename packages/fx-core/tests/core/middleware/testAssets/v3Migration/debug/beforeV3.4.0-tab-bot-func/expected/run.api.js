const cp = require("child_process");
const utils = require("@microsoft/teamsfx-run-utils");

// This script is used by Teams Toolkit to launch your service locally

async function run() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.log(`Usage: node ${__filename} [project path] [env path].`);
    process.exit(1);
  }

  const envs = await utils.loadEnv(args[0], args[1]);

  // set up environment variables required by teamsfx
  process.env.FUNCTIONS_WORKER_RUNTIME = "node";
  process.env.M365_CLIENT_ID = envs.AAD_APP_CLIENT_ID;
  process.env.M365_CLIENT_SECRET = envs.SECRET_AAD_APP_CLIENT_SECRET;
  process.env.M365_TENANT_ID = envs.AAD_APP_TENANT_ID;
  process.env.M365_AUTHORITY_HOST = envs.AAD_APP_OAUTH_AUTHORITY_HOST;
  process.env.ALLOWED_APP_IDS =
    "1fec8e78-bce4-4aaf-ab1b-5451cc387264;5e3ce6c0-2b1f-4285-8d4b-75ee78787346;0ec893e0-5785-4de6-99da-4ed124e5296c;4345a7b9-9a63-4910-a426-35363201d503;4765445b-32c6-49b0-83e6-1d93765276ca;d3590ed6-52b3-4102-aeff-aad2292ab01c;00000002-0000-0ff1-ce00-000000000000;bc59ab01-8403-45c6-8796-ac3ef710b3e3";

  // launch service locally
  cp.spawn(`func start --javascript --language-worker="--inspect=9229" --port "7071" --cors "*"`, {
    stdio: "inherit",
    shell: true,
  });
}

run();
