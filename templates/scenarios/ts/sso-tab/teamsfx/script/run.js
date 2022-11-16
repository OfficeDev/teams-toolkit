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
  process.env.BROWSER = "none";
  process.env.HTTPS = true;
  process.env.PORT = 53000;
  process.env.SSL_CRT_FILE = envs.SSL_CRT_FILE;
  process.env.SSL_KEY_FILE = envs.SSL_KEY_FILE;
  process.env.REACT_APP_CLIENT_ID = envs.AAD_APP_CLIENT_ID;
  process.env.REACT_APP_START_LOGIN_PAGE_URL = `${envs.TAB_ENDPOINT}/auth-start.html`;

  // launch service locally by executing npm command
  cp.spawn(/^win/.test(process.platform) ? "npm.cmd" : "npm", ["run", "start"], { stdio: "inherit" });
}

run();
