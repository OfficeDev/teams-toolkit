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
  process.env.MICROSOFT_APP_ID = envs.MICROSOFT_APP_ID;
  process.env.MICROSOFT_APP_PASSWORD = envs.SECRET_MICROSOFT_APP_PASSWORD;

  // launch service locally by executing npm command
  cp.spawn(/^win/.test(process.platform) ? "npm.cmd" : "npm", ["run", "dev"], { stdio: "inherit" });
}

run();
