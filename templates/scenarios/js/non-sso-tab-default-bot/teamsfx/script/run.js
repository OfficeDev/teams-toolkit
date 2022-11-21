const cp = require("child_process");
const utils = require("@microsoft/teamsfx-run-utils");

// This script is used by Teams Toolkit to launch your service locally

async function run() {
  const args = process.argv.slice(2);

  if (args.length !== 3) {
    console.log(`Usage: node ${__filename} [project path] [env path].`);
    process.exit(1);
  }

  const capability = args[2];
  if (capability != "tab" && capability != "bot") {
    console.log(`unsupported capability: ${capability}`);
    process.exit(1);
  }

  const envs = await utils.loadEnv(args[0], args[1]);
  if (capability == "tab") {
    // set up environment variables required by teamsfx
    process.env.BROWSER = "none";
    process.env.HTTPS = true;
    process.env.PORT = 53000;
    process.env.SSL_CRT_FILE = envs.SSL_CRT_FILE;
    process.env.SSL_KEY_FILE = envs.SSL_KEY_FILE;
    cp.spawn(/^win/.test(process.platform) ? "npm.cmd" : "npm", ["run", "start:tab"], {
      stdio: "inherit",
    });
  } else if (capability == "bot") {
    // set up environment variables required by teamsfx
    process.env.BOT_ID = envs.BOT_ID;
    process.env.BOT_PASSWORD = envs.SECRET_BOT_PASSWORD;
    cp.spawn(/^win/.test(process.platform) ? "npm.cmd" : "npm", ["run", "dev:bot"], {
      stdio: "inherit",
    });
  }
}

run();
