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
  const endpointUrl =
    context.obj[`${endpoint}`] ??
    context.obj["PROVISIONOUTPUT__BOTOUTPUT__ENDPOINT"];
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
  options?: SpawnOptionsWithoutStdio | undefined,
  onData?: (data: string) => void,
  onError?: (data: string) => void
) {
  const child = spawn(command, args, options);
  child.stdout.on("data", (data) => {
    const dataString = data.toString();
    if (onData) {
      onData(dataString);
    }
  });
  child.stderr.on("data", (data) => {
    const dataString = data.toString();
    if (onError) {
      onError(dataString);
    }
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

export async function killPort(
  port: number
): Promise<{ stdout: string; stderr: string }> {
  // windows
  if (process.platform === "win32") {
    const command = `for /f "tokens=5" %a in ('netstat -ano ^| find "${port}"') do @taskkill /f /pid %a`;
    console.log("run command: ", command);
    const result = await execAsync(command);
    return result;
  } else {
    const command = `kill -9 $(lsof -t -i:${port})`;
    console.log("run command: ", command);
    const result = await execAsync(command);
    return result;
  }
}

export async function initDebugPort() {
  try {
    await killPort(53000);
    console.log(`close port 53000 successfully`);
  } catch (error) {
    console.log(`close port 53000 failed`);
  }
  try {
    await killPort(3978);
    console.log(`close port 3978 successfully`);
  } catch (error) {
    console.log(`close port 3978 failed`);
  }
  try {
    await killPort(9239);
    console.log(`close port 9239 successfully`);
  } catch (error) {
    console.log(`close port 9239 failed`);
  }
  try {
    await killPort(7071);
    console.log(`close port 7071 successfully`);
  } catch (error) {
    console.log(`close port 7071 failed`);
  }
  try {
    await killPort(9229);
    console.log(`close port 9229 successfully`);
  } catch (error) {
    console.log(`close port 9229 failed`);
  }
}

export async function killNgrok(): Promise<{ stdout: string; stderr: string }> {
  if (process.platform === "win32") {
    const command = `taskkill /f /im ngrok.exe`;
    console.log("run command: ", command);
    const result = await execAsync(command);
    return result;
  } else {
    const command = `kill -9 $(lsof -i | grep ngrok | awk '{print $2}')`;
    console.log("run command: ", command);
    const result = await execAsync(command);
    return result;
  }
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
  let command = "";
  if (version === "V2") command = `npx teamsfx --version`;
  else if (version === "V3") command = `npx teamsapp --version`;
  const { success, stdout } = await Executor.execute(command, projectPath);
  chai.expect(success).to.eq(true);
  const cliVersion = stdout.trim();
  const versionGeneralRegex = /(\d\.\d+\.\d+).*$/;
  const cliVersionOutputs = cliVersion.match(versionGeneralRegex);
  console.log(cliVersionOutputs![0]);
  let versionRegex;
  if (version === "V2") versionRegex = /^1\.\d+\.\d+.*$/;
  else if (version === "V3") versionRegex = /^[23]\.\d+\.\d+.*$/;
  else throw new Error(`Invalid version specified: ${version}`);
  chai.expect(cliVersionOutputs![0]).to.match(versionRegex);
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

  if (version == "3.2.0") {
    const fileName = "simpleAuth.bicep";
    const simpleAuthBicepPath = path.join(
      projectPath,
      "templates",
      "azure",
      "teamsFx",
      fileName
    );
    let content = await fs.readFile(simpleAuthBicepPath, "utf-8");
    content = updateContent(
      content,
      policySnippets.locationKey1,
      locationValue1
    );
    content = updateContent(
      content,
      policySnippets.locationKey2,
      policySnippets.locationValue2
    );
    await fs.writeFileSync(simpleAuthBicepPath, content);
  }
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
