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
  process.env.REACT_APP_START_LOGIN_PAGE_URL = `${envs.PROVISIONOUTPUT__FRONTENDHOSTINGOUTPUT__ENDPOINT}/auth-start.html`;
  process.env.REACT_APP_TEAMSFX_ENDPOINT = "https://localhost:55000";
  process.env.REACT_APP_FUNC_ENDPOINT = "http://localhost:7071";
  process.env.REACT_APP_FUNC_NAME = "getUserProfile";

  // launch service locally
  cp.spawn(/^win/.test(process.platform) ? "npx.cmd" : "npx", ["react-scripts", "start"], {
    stdio: "inherit",
  });
}

run();
