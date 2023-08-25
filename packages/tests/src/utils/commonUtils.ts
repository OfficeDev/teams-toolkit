// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FeatureFlagName } from "./constants";
import * as path from "path";
import * as fs from "fs-extra";
import * as chai from "chai";
import { dotenvUtil } from "./envUtil";
import { TestFilePath } from "./constants";
import { exec, spawn, SpawnOptionsWithoutStdio } from "child_process";
import { promisify } from "util";
import { Executor } from "./executor";

export const execAsync = promisify(exec);

export async function execAsyncWithRetry(
  command: string,
  options: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    timeout?: number;
  },
  retries = 3,
  newCommand?: string
): Promise<{
  stdout: string;
  stderr: string;
}> {
  while (retries > 0) {
    retries--;
    try {
      const result = await Executor.execute(
        command,
        options.cwd ? options.cwd : "",
        options.env
      );
    } catch (e: any) {
      console.log(
        `Run \`${command}\` failed with error msg: ${JSON.stringify(e)}.`
      );
      if (e.killed && e.signal == "SIGTERM") {
        console.log(`Command ${command} killed due to timeout`);
      }
      if (newCommand) {
        command = newCommand;
      }
      await sleep(10000);
    }
  }
  return Executor.execute(command, options.cwd ? options.cwd : "", options.env);
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isInsiderPreviewEnabled(): boolean {
  const flag = process.env[FeatureFlagName.InsiderPreview];
  if (flag === "false") {
    console.log(`${FeatureFlagName.InsiderPreview} is false.`);
    return false;
  } else {
    console.log(`${FeatureFlagName.InsiderPreview} is true.`);
    return true;
  }
}

export async function updateProjectAppName(
  projectPath: string,
  appName: string
) {
  const projectDataFile = path.join(".fx", "configs", "projectSettings.json");
  const configFilePath = path.resolve(projectPath, projectDataFile);
  const context = await fs.readJSON(configFilePath);
  context["appName"] = appName;
  return fs.writeJSON(configFilePath, context, { spaces: 4 });
}

export async function updateAppShortName(
  projectPath: string,
  appName: string,
  envName: "local" | "dev"
) {
  const manifestDataFile = path.join(
    ".fx",
    "configs",
    `config.${envName}.json`
  );
  const configFilePath = path.resolve(projectPath, manifestDataFile);
  const context = await fs.readJSON(configFilePath);
  context["manifest"]["appName"]["short"] = appName;
  return fs.writeJSON(configFilePath, context, { spaces: 4 });
}

export async function getBotSiteEndpoint(
  projectPath: string,
  envName = "dev",
  endpoint = "BOT_DOMAIN"
): Promise<string | undefined> {
  const userDataFile = path.join(
    TestFilePath.configurationFolder,
    `.env.${envName}`
  );
  const configFilePath = path.resolve(projectPath, userDataFile);
  const context = dotenvUtil.deserialize(
    await fs.readFile(configFilePath, { encoding: "utf8" })
  );
  const endpointUrl = context.obj[`${endpoint}`];
  const result = endpointUrl.includes("https://")
    ? endpointUrl
    : "https://" + endpointUrl;
  console.log(`BotSiteEndpoint: ${result}`);
  return typeof result === "string" ? result : undefined;
}

export function validateFileExist(projectPath: string, relativePath: string) {
  const filePath = path.resolve(projectPath, relativePath);
  chai.expect(fs.existsSync(filePath), `${filePath} must exist.`).to.eq(true);
}

export async function updateAadTemplate(
  projectPath: string,
  displayNameSuffix = "-updated"
) {
  const filePath = path.resolve(projectPath, "aad.manifest.json");
  const context = await fs.readJSON(filePath);
  const updatedAppName = context["name"] + displayNameSuffix;
  context["name"] = updatedAppName;
  return fs.writeJSON(filePath, context, { spaces: 4 });
}

export function spawnCommand(
  command: string,
  args?: string[],
  options?: SpawnOptionsWithoutStdio | undefined
) {
  const child = spawn(command, args, options);
  child.stdout.on("data", (data) => {
    console.log(`${data}`);
  });
  child.stderr.on("data", (data) => {
    console.error(`${data}`);
  });
  return child;
}

// promise timeout function
export function timeoutPromise(timeout: number) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve("timeout");
    }, timeout);
  });
}

export function killPort(port: number): Promise<any> {
  const command = `kill -9 $(lsof -t -i:${port})`;
  return execAsync(command);
}

export function killNgrok(): Promise<any> {
  const command = `kill -9 $(lsof -i | grep ngrok | awk '{print $2}')`;
  return execAsync(command);
}

export function editDotEnvFile(
  filePath: string,
  key: string,
  value: string
): void {
  try {
    const envFileContent: string = fs.readFileSync(filePath, "utf-8");
    const envVars: { [key: string]: string } = envFileContent
      .split("\n")
      .reduce((acc: { [key: string]: string }, line: string) => {
        const [key, value] = line.split("=");
        if (key && value) {
          acc[key.trim()] = value.trim();
        }
        return acc;
      }, {});
    envVars[key] = value;
    const newEnvFileContent: string = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    fs.writeFileSync(filePath, newEnvFileContent);
  } catch (error) {
    console.log('Failed to edit ".env" file. FilePath: ' + filePath);
  }
}

export async function CLIVersionCheck(
  version: "V2" | "V3",
  projectPath: string
): Promise<{ success: boolean; cliVersion: string }> {
  const command = `npx teamsfx --version`;
  const { success, stdout } = await Executor.execute(command, projectPath);
  chai.expect(success).to.eq(true);
  const cliVersion = stdout.trim();
  let versionRegex;
  if (version === "V2") versionRegex = /^1\.\d+\.\d+.*$/;
  else if (version === "V3") versionRegex = /^2\.\d+\.\d+.*$/;
  else throw new Error(`Invalid version specified: ${version}`);
  chai.expect(cliVersion).to.match(versionRegex);
  console.log(`CLI Version: ${cliVersion}`);
  return { success: true, cliVersion };
}

const policySnippets = {
  locationKey1: "var authorizedClientApplicationIds",
  locationValue1: `var allowedClientApplications = '["\${m365ClientId}","\${teamsMobileOrDesktopAppClientId}","\${teamsWebAppClientId}","\${officeWebAppClientId1}","\${officeWebAppClientId2}","\${outlookDesktopAppClientId}","\${outlookWebAppClientId1};\${outlookWebAppClientId2}"]'\n`,
  locationKey2: "ALLOWED_APP_IDS",
  locationValue2: `    WEBSITE_AUTH_AAD_ACL: '{"allowed_client_applications": \${allowedClientApplications}}}'\n`,
};

const locationValue1_320 = `var allowedClientApplications = '["\${m365ClientId}","\${teamsMobileOrDesktopAppClientId}","\${teamsWebAppClientId}","\${officeWebAppClientId1}","\${officeWebAppClientId2}","\${outlookDesktopAppClientId}","\${outlookWebAppClientId}"]'\n`;

export async function updateFunctionAuthorizationPolicy(
  version: "4.2.5" | "4.0.0" | "3.2.0",
  projectPath: string
): Promise<void> {
  const fileName =
    version == "4.2.5" ? "azureFunctionApiConfig.bicep" : "function.bicep";
  const locationValue1 =
    version == "3.2.0" ? locationValue1_320 : policySnippets.locationValue1;
  const functionBicepPath = path.join(
    projectPath,
    "templates",
    "azure",
    "teamsFx",
    fileName
  );
  let content = await fs.readFile(functionBicepPath, "utf-8");
  content = updateContent(content, policySnippets.locationKey1, locationValue1);
  content = updateContent(
    content,
    policySnippets.locationKey2,
    policySnippets.locationValue2
  );
  await fs.writeFileSync(functionBicepPath, content);
}

export function updateContent(
  content: string,
  key: string,
  value: string
): string {
  const index = findNextEndLineIndexOfWord(content, key);
  const head = content.substring(0, index);
  const tail = content.substring(index + 1);
  return head + `\n${value}\n` + tail;
}

function findNextEndLineIndexOfWord(content: string, key: string): number {
  const index = content.indexOf(key);
  const result = content.indexOf("\n", index);
  return result;
}

export async function updateDeverloperInManifestFile(
  projectPath: string
): Promise<void> {
  const manifestFile = path.join(projectPath, "appPackage", `manifest.json`);
  const context = await fs.readJSON(manifestFile);
  //const context = await fs.readJSON(azureParametersFilePath);
  try {
    context["developer"]["websiteUrl"] = "https://www.example.com";
    context["developer"]["privacyUrl"] = "https://www.example.com/privacy";
    context["developer"]["termsOfUseUrl"] = "https://www.example.com/termofuse";
  } catch {
    console.log("Cannot set the propertie.");
  }
  console.log("Replaced the properties of developer in manifest file");
  await fs.writeJSON(manifestFile, context, { spaces: 4 });
}
