const cp = require("child_process");
const fs = require("fs");
const dotenv = require("dotenv");

// This script is used by Teams Toolkit to launch your service locally
const args = process.argv.slice(2);
if (args[0] && fs.existsSync(args[0])) {
	// Load teamsfx context from `teamsfx/.env.<env>`
	const envs = dotenv.parse(fs.readFileSync(args[0], 'utf8'));
	process.env.SSL_CRT_FILE = envs.SSL_CRT_FILE;
	process.env.SSL_KEY_FILE = envs.SSL_KEY_FILE;
	process.env.BROWSER = "none";
	process.env.HTTPS = true;
	process.env.PORT = 53000;
	process.env.REACT_APP_CLIENT_ID = envs.AAD_APP_CLIENT_ID;
	process.env.REACT_APP_START_LOGIN_PAGE_URL = `${envs.TAB_ENDPOINT}/auth-start.html`;
}

// launch service locally by executing npm command
cp.spawn(/^win/.test(process.platform) ? "npm.cmd" : "npm", ["run", "start"], { stdio: "inherit" });
