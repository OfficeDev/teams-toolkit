// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ConfigFolderName,
  EnvNamePlaceholder,
  EnvStateFileNameTemplate,
  FxError,
  InputConfigsFolderName,
  StatesFolderName,
  Result,
  ok,
} from "@microsoft/teamsfx-api";
import { exec } from "child_process";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";
import { sleep } from "../../src/utils";
import * as dotenv from "dotenv";
import {
  cfg,
  AadManager,
  ResourceGroupManager,
  SharepointValidator as SharepointManager,
  AadValidator,
  BotValidator,
  FrontendValidator,
  SimpleAuthValidator,
} from "../commonlib";
import { ConfigKey, fileEncoding, PluginId, TestFilePath } from "../commonlib/constants";
import { environmentManager } from "@microsoft/teamsfx-core";
import appStudioLogin from "../../src/commonlib/appStudioLogin";
import MockAzureAccountProvider from "../../src/commonlib/azureLoginUserPassword";
import { getWebappServicePlan } from "../commonlib/utilities";

export const TEN_MEGA_BYTE = 1024 * 1024 * 10;
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
      const result = await execAsync(command, options);
      return result;
    } catch (e) {
      console.log(`Run \`${command}\` failed with error msg: ${JSON.stringify(e)}.`);
      if (newCommand) {
        command = newCommand;
      }
      await sleep(10000);
    }
  }
  return execAsync(command, options);
}

const testFolder = path.resolve(os.homedir(), "test-folder");

export function getTestFolder() {
  if (!fs.pathExistsSync(testFolder)) {
    fs.mkdirSync(testFolder);
  }
  return testFolder;
}

export function getAppNamePrefix() {
  return "fxE2E";
}

export function getUniqueAppName() {
  return getAppNamePrefix() + Date.now().toString() + uuidv4().slice(0, 2);
}

export function getSubscriptionId() {
  return cfg.AZURE_SUBSCRIPTION_ID || "";
}

const envFilePathSuffix = path.join(".fx", "env.default.json");

function getEnvFilePathSuffix(isMultiEnvEnabled: boolean, envName: string) {
  if (isMultiEnvEnabled) {
    return path.join(
      ".fx",
      StatesFolderName,
      EnvStateFileNameTemplate.replace(EnvNamePlaceholder, envName)
    );
  } else {
    return envFilePathSuffix;
  }
}

export function getConfigFileName(
  appName: string,
  isMultiEnvEnabled = false,
  envName = "dev"
): string {
  return path.resolve(testFolder, appName, getEnvFilePathSuffix(isMultiEnvEnabled, envName));
}

export async function setSimpleAuthSkuNameToB1(projectPath: string) {
  const envFilePath = path.resolve(projectPath, envFilePathSuffix);
  const context = await fs.readJSON(envFilePath);
  context[PluginId.SimpleAuth][ConfigKey.skuName] = "B1";
  return fs.writeJSON(envFilePath, context, { spaces: 4 });
}

export async function setSimpleAuthSkuNameToB1Bicep(projectPath: string, envName: string) {
  const bicepParameterFile = path.join(
    `.${ConfigFolderName}`,
    InputConfigsFolderName,
    `azure.parameters.${envName}.json`
  );
  const parametersFilePath = path.resolve(projectPath, bicepParameterFile);
  const parameters = await fs.readJSON(parametersFilePath);
  parameters["parameters"]["provisionParameters"]["value"]["simpleAuthSku"] = "B1";
  return fs.writeJSON(parametersFilePath, parameters, { spaces: 4 });
}

export async function setBotSkuNameToB1(projectPath: string) {
  const envFilePath = path.resolve(projectPath, envFilePathSuffix);
  const context = await fs.readJSON(envFilePath);
  context[PluginId.Bot][ConfigKey.skuName] = "B1";
  return fs.writeJSON(envFilePath, context, { spaces: 4 });
}

export async function setBotSkuNameToB1Bicep(projectPath: string, envName: string) {
  const bicepParameterFile = path.join(
    `.${ConfigFolderName}`,
    InputConfigsFolderName,
    `azure.parameters.${envName}.json`
  );
  const parametersFilePath = path.resolve(projectPath, bicepParameterFile);
  const parameters = await fs.readJSON(parametersFilePath);
  parameters["parameters"]["provisionParameters"]["value"]["botWebAppSKU"] = "B1";
  return fs.writeJSON(parametersFilePath, parameters, { spaces: 4 });
}

export async function setSkipAddingSqlUser(projectPath: string) {
  const envFilePath = path.resolve(projectPath, envFilePathSuffix);
  const context = await fs.readJSON(envFilePath);
  context[PluginId.AzureSQL][ConfigKey.skipAddingUser] = true;
  return fs.writeJSON(envFilePath, context, { spaces: 4 });
}

export async function setSkipAddingSqlUserToConfig(projectPath: string, envName: string) {
  const configFile = path.join(
    `.${ConfigFolderName}`,
    InputConfigsFolderName,
    `config.${envName}.json`
  );
  const configFilePath = path.resolve(projectPath, configFile);
  const config = await fs.readJSON(configFilePath);
  config["skipAddingSqlUser"] = true;
  return fs.writeJSON(configFilePath, config, { spaces: 4 });
}

export async function cleanupSharePointPackage(appId: string) {
  if (appId) {
    try {
      SharepointManager.init();
      await SharepointManager.deleteApp(appId);
      console.log(`[Successfully] clean up sharepoint package ${appId}`);
    } catch (error) {
      console.log(`[Failed] clean up sharepoint package ${appId}, Error: ${error.message}`);
    }
  } else {
    console.log(`[Failed] sharepoint appId is undefined, will not clean up this resource.`);
  }
}

export async function cleanUpAadApp(
  projectPath: string,
  hasAadPlugin?: boolean,
  hasBotPlugin?: boolean,
  hasApimPlugin?: boolean,
  isMultiEnvEnabled = false,
  envName = "dev"
) {
  const envFilePath = path.resolve(projectPath, getEnvFilePathSuffix(isMultiEnvEnabled, envName));
  if (!(await fs.pathExists(envFilePath))) {
    return;
  }
  const context = await fs.readJSON(envFilePath);
  const manager = await AadManager.init();
  const promises: Promise<boolean>[] = [];

  const clean = async (objectId?: string) => {
    return new Promise<boolean>(async (resolve) => {
      if (objectId) {
        const result = await manager.deleteAadAppById(objectId);
        if (result) {
          console.log(`[Successfully] clean up the Aad app with id: ${objectId}.`);
        } else {
          console.error(`[Failed] clean up the Aad app with id: ${objectId}.`);
        }
        return resolve(result);
      }
      return resolve(false);
    });
  };

  if (hasAadPlugin) {
    const objectId = context[PluginId.Aad].objectId;
    promises.push(clean(objectId));
  }

  if (hasBotPlugin) {
    const objectId = context[PluginId.Bot].objectId;
    promises.push(clean(objectId));
  }

  if (hasApimPlugin) {
    const objectId = context[PluginId.Apim].apimClientAADObjectId;
    promises.push(clean(objectId));
  }

  return Promise.all(promises);
}

export async function cleanUpResourceGroup(
  appName: string,
  isMultiEnvEnabled: boolean,
  envName?: string
): Promise<boolean> {
  if (!appName) {
    return false;
  }
  const name = isMultiEnvEnabled ? `${appName}-${envName}-rg` : `${appName}-rg`;
  return await deleteResourceGroupByName(name);
}

export async function deleteResourceGroupByName(name: string): Promise<boolean> {
  const manager = await ResourceGroupManager.init();
  if (await manager.hasResourceGroup(name)) {
    const result = await manager.deleteResourceGroup(name);
    if (result) {
      console.log(`[Successfully] clean up the Azure resource group with name: ${name}.`);
    } else {
      console.error(`[Failed] clean up the Azure resource group with name: ${name}.`);
    }
    return result;
  }
  return false;
}

export async function cleanUpLocalProject(projectPath: string, necessary?: Promise<any>) {
  return new Promise<boolean>(async (resolve) => {
    try {
      await necessary;
      await fs.remove(projectPath);
      console.log(`[Successfully] clean up the local folder: ${projectPath}.`);
      return resolve(true);
    } catch (e) {
      console.log(`[Failed] clean up the local folder: ${projectPath}. error = '${e}'`);
      return resolve(false);
    }
  });
}

export async function cleanUp(
  appName: string,
  projectPath: string,
  hasAadPlugin = true,
  hasBotPlugin = false,
  hasApimPlugin = false,
  isMultiEnvEnabled = false,
  envName = "dev"
) {
  const cleanUpAadAppPromise = cleanUpAadApp(
    projectPath,
    hasAadPlugin,
    hasBotPlugin,
    hasApimPlugin,
    isMultiEnvEnabled,
    envName
  );
  return Promise.all([
    // delete aad app
    cleanUpAadAppPromise,
    // remove resouce group
    cleanUpResourceGroup(appName, isMultiEnvEnabled, envName),
    // remove project
    cleanUpLocalProject(projectPath, cleanUpAadAppPromise),
  ]);
}

export async function cleanUpResourcesCreatedHoursAgo(
  type: "aad" | "rg",
  contains: string,
  hours?: number,
  retryTimes = 5
) {
  if (type === "aad") {
    const aadManager = await AadManager.init();
    await aadManager.deleteAadApps(contains, hours, retryTimes);
  } else {
    const rgManager = await ResourceGroupManager.init();
    const groups = await rgManager.searchResourceGroups(contains);
    const filteredGroups =
      hours && hours > 0
        ? groups.filter((group) => {
            const name = group.name!;
            const startPos = name.indexOf(contains) + contains.length;
            const createdTime = Number(name.slice(startPos, startPos + 13));
            return Date.now() - createdTime > hours * 3600 * 1000;
          })
        : groups;

    const promises = filteredGroups.map((rg) =>
      rgManager.deleteResourceGroup(rg.name!, retryTimes)
    );
    const results = await Promise.all(promises);
    results.forEach((result, index) => {
      if (result) {
        console.log(
          `[Successfully] clean up the Azure resource group with name: ${filteredGroups[index].name}.`
        );
      } else {
        console.error(
          `[Failed] clean up the Azure resource group with name: ${filteredGroups[index].name}.`
        );
      }
    });
    return results;
  }
}

export async function createResourceGroup(name: string, location: string) {
  const manager = await ResourceGroupManager.init();
  const result = await manager.createOrUpdateResourceGroup(name, location);
  if (result) {
    console.log(`[Successfully] create resource group ${name}.`);
  } else {
    console.error(`[Failed] failed to create resource group ${name}.`);
  }
  return result;
}

// TODO: add encrypt
export async function readContext(projectPath: string): Promise<any> {
  const userDataFilePath = `${projectPath}/.fx/default.userdata`;

  // Read Context and UserData
  const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);

  let userData: Record<string, string> = {};
  if (await fs.pathExists(userDataFilePath)) {
    const dictContent = await fs.readFile(userDataFilePath, "UTF-8");
    userData = dotenv.parse(dictContent);
  }

  // Read from userdata.
  for (const plugin in context) {
    const pluginContext = context[plugin];
    for (const key in pluginContext) {
      if (typeof pluginContext[key] === "string" && isSecretPattern(pluginContext[key])) {
        const secretKey = `${plugin}.${key}`;
        pluginContext[key] = userData[secretKey] ?? undefined;
      }
    }
  }

  return context;
}

export async function readContextMultiEnv(projectPath: string, envName: string): Promise<any> {
  const contextFilePath = `${projectPath}/.fx/states/state.${envName}.json`;
  const userDataFilePath = `${projectPath}/.fx/states/${envName}.userdata`;

  // Read Context and UserData
  const context = await fs.readJSON(contextFilePath);

  let userData: Record<string, string> = {};
  if (await fs.pathExists(userDataFilePath)) {
    const dictContent = await fs.readFile(userDataFilePath, "UTF-8");
    userData = dotenv.parse(dictContent);
  }

  // Read from userdata.
  for (const plugin in context) {
    const pluginContext = context[plugin];
    for (const key in pluginContext) {
      if (typeof pluginContext[key] === "string" && isSecretPattern(pluginContext[key])) {
        const secretKey = `${plugin}.${key}`;
        pluginContext[key] = userData[secretKey] ?? undefined;
      }
    }
  }

  return context;
}

export function mockTeamsfxMultiEnvFeatureFlag() {
  const env = Object.assign({}, process.env);
  env["TEAMSFX_BICEP_ENV_CHECKER_ENABLE"] = "true";
  env["__TEAMSFX_INSIDER_PREVIEW"] = "true";
  return env;
}

function isSecretPattern(value: string) {
  console.log(value);
  return value.startsWith("{{") && value.endsWith("}}");
}

// Load envProfile with userdata (not decrypted)
export async function loadContext(projectPath: string, env: string): Promise<Result<any, FxError>> {
  const context = await fs.readJson(
    path.join(
      projectPath,
      `.${ConfigFolderName}`,
      StatesFolderName,
      EnvStateFileNameTemplate.replace(EnvNamePlaceholder, env)
    )
  );
  const userdataContent = await fs.readFile(
    path.join(projectPath, `.${ConfigFolderName}`, StatesFolderName, `${env}.userdata`),
    "utf8"
  );
  const userdata = dotenv.parse(userdataContent);

  const regex = /\{\{([^{}]+)\}\}/;
  for (const component in context) {
    for (const key in context[component]) {
      const matchResult = regex.exec(context[component][key]);
      if (matchResult) {
        const userdataKey = matchResult[1];
        if (userdataKey in userdata) {
          context[component][key] = userdata[userdataKey];
        }
      }
    }
  }
  return ok(context);
}

export async function customizeBicepFilesToCustomizedRg(
  customizedRgName: string,
  projectPath: string,
  provisionInsertionSearchString: string,
  configInsertionSearchString?: string
): Promise<void> {
  const provisionFilePath = path.join(
    projectPath,
    TestFilePath.armTemplateBaseFolder,
    TestFilePath.provisionFileName
  );
  let content = await fs.readFile(provisionFilePath, fileEncoding);
  let insertionIndex = content.indexOf(provisionInsertionSearchString);

  const paramToAdd = `param customizedRg string = '${customizedRgName}'\r\n`;
  const scopeToAdd = `scope: resourceGroup(customizedRg)\r\n`;
  content =
    paramToAdd +
    content.substring(0, insertionIndex) +
    scopeToAdd +
    content.substring(insertionIndex);
  await fs.writeFile(provisionFilePath, content);
  console.log(
    `[Successfully] customize ${provisionFilePath} content to deploy cloud resources to ${customizedRgName}.`
  );

  if (configInsertionSearchString) {
    const configFilePath = path.join(
      projectPath,
      TestFilePath.armTemplateBaseFolder,
      TestFilePath.configFileName
    );
    content = await fs.readFile(configFilePath, fileEncoding);
    insertionIndex = content.indexOf(configInsertionSearchString);
    content =
      paramToAdd +
      content.substring(0, insertionIndex) +
      scopeToAdd +
      content.substring(insertionIndex);
    await fs.writeFile(configFilePath, content);
    console.log(
      `[Successfully] customize ${configFilePath} content to deploy cloud resources to ${customizedRgName}.`
    );
  }
}

export async function validateTabAndBotProjectProvision(projectPath: string) {
  const context = await readContextMultiEnv(projectPath, environmentManager.getDefaultEnvName());

  // Validate Aad App
  const aad = AadValidator.init(context, false, appStudioLogin);
  await AadValidator.validate(aad);

  // Validate Simple Auth
  const simpleAuth = SimpleAuthValidator.init(context);
  await SimpleAuthValidator.validate(simpleAuth, aad);

  // Validate Tab Frontend
  const frontend = FrontendValidator.init(context, true);
  await FrontendValidator.validateProvision(frontend);

  // Validate Bot Provision
  const bot = BotValidator.init(context, true);
  await BotValidator.validateProvision(bot, true);
}

export async function getRGAfterProvision(projectPath: string): Promise<string | undefined> {
  const context = await readContextMultiEnv(projectPath, environmentManager.getDefaultEnvName());
  if (
    context[ConfigKey.solutionPluginName] &&
    context[ConfigKey.solutionPluginName][ConfigKey.resourceGroupName]
  ) {
    return context[ConfigKey.solutionPluginName][ConfigKey.resourceGroupName];
  }
  return undefined;
}

export async function customizeBicepFile(projectPath: string): Promise<string[]> {
  const newServerFarms: string[] = [];
  const bicepFileFolder = path.join(projectPath, TestFilePath.armTemplateBaseFolder);

  const pattern = "SERVER_FARM_NAME";
  const customizedServerFarmsBicepTemplate = `
resource customizedServerFarms 'Microsoft.Web/serverfarms@2021-02-01' = {
name: '${pattern}'
location: resourceGroup().location
sku: {
  name: 'B1'
}
kind: 'app'
}
`;
  const simpleAuthTestServerFarm = "simpleAuth_testResource";
  await fs.appendFile(
    path.join(bicepFileFolder, TestFilePath.provisionFolder, "simpleAuth.bicep"),
    customizedServerFarmsBicepTemplate.replace(pattern, simpleAuthTestServerFarm)
  );
  newServerFarms.push(simpleAuthTestServerFarm);

  const provisionTestServerFarm = "provision_testResource";
  await fs.appendFile(
    path.join(bicepFileFolder, TestFilePath.provisionFileName),
    customizedServerFarmsBicepTemplate.replace(pattern, provisionTestServerFarm)
  );
  newServerFarms.push(provisionTestServerFarm);

  const configTestServerFarm = "config_testResource";
  await fs.appendFile(
    path.join(bicepFileFolder, TestFilePath.configFileName),
    customizedServerFarmsBicepTemplate.replace(pattern, configTestServerFarm)
  );
  newServerFarms.push(configTestServerFarm);

  // TODO: should uncomment this part of code when the bug is resolved:
  // https://msazure.visualstudio.com/Microsoft%20Teams%20Extensibility/_workitems/edit/12902499
  // const mainTestServerFarm = "main_testResource";
  // await fs.appendFile(
  //   path.join(bicepFileFolder, TestFilePath.mainFileName),
  //   customizedServerFarmsBicepTemplate.replace(pattern, mainTestServerFarm));
  // newServerFarms.push(mainTestServerFarm);

  return newServerFarms;
}

export async function validateServicePlan(
  servicePlanName: string,
  resourceGroup: string,
  subscription: string
) {
  console.log(`Start to validate server farm ${servicePlanName}.`);

  const tokenProvider = MockAzureAccountProvider;
  const tokenCredential = await tokenProvider.getAccountCredentialAsync();
  const token = (await tokenCredential?.getToken())?.accessToken;

  const serivcePlanResponse = await getWebappServicePlan(
    subscription,
    resourceGroup,
    servicePlanName,
    token as string
  );
  chai.assert(serivcePlanResponse, "B1");
}
