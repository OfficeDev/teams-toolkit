// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import fs from "fs-extra";
import * as msal from "@azure/msal-node";
import { chromium, ChromiumBrowser, Page } from "playwright-chromium";
import { deleteAadApp } from "../../api/src/ci/aadValidate";
import { MockAzureAccountProvider } from "../../api/src/ci/mockAzureAccountProvider";
import {
  TEST_USER_NAME,
  TEST_USER_PASSWORD,
  TEST_SUBSCRIPTION_ID
} from "../../api/src/ci/conf/secrets";

const execAsync = promisify(exec);
const testProjectFolder = "testProjects";

/**
 * Timeout value used in e2e test, 30 seconds
 */
export const E2E_TIMEOUT = 30000;

function getTestFolder(): string {
  const folder = path.join(process.cwd(), testProjectFolder);
  fs.ensureDirSync(folder);
  return folder;
}

/**
 * Copy function folder to the api folder under project and deploy.
 *
 * @param projectPath - folder path of project
 * @param functionSrcFolder - folder path of function api
 */
export async function deployFunction(
  projectPath: string,
  functionSrcFolder: string
): Promise<void> {
  fs.copySync(functionSrcFolder, path.join(projectPath, "api"), { overwrite: true });
  console.log(`Deploying function of project ${projectPath}...`);
  await callCli(`teamsfx deploy --folder ${projectPath} --deploy-plugin fx-resource-function`);
}

/**
 * Create a new project that is provisioned.
 *
 * @param name - project name
 * @returns the project folder path
 */
export async function createNewProject(name: string): Promise<string> {
  const folder = getTestFolder();
  const projectFolder = path.join(folder, name);
  if (!(await callCli(`teamsfx new --app-name ${name} --folder ${folder} --interactive false`))) {
    if (await fs.pathExists(projectFolder)) {
      await fs.remove(projectFolder);
    }
    throw new Error(`Create project ${name} failed`);
  }
  console.log(`Provisioning project ${name}...`);
  if (
    !(await callCli(
      `teamsfx provision --folder ${projectFolder} --subscription ${TEST_SUBSCRIPTION_ID}`
    ))
  ) {
    await deleteProject(projectFolder);
    throw new Error(`Provision project ${name} failed`);
  }
  return projectFolder;
}

/**
 * Copy tab folder to the project and deploy frontend resource.
 *
 * @param projectPath - folder path of project
 * @param tabSrcFolder - tab folder path, skip copying if it's undefined
 */
export async function deployTab(projectPath: string, tabSrcFolder?: string): Promise<void> {
  if (tabSrcFolder) {
    fs.copySync(tabSrcFolder, path.join(projectPath, "tabs"), { overwrite: true });
  }
  console.log(`Deploying tab of project ${projectPath}...`);
  await callCli(
    `teamsfx deploy --folder ${projectPath} --deploy-plugin fx-resource-frontend-hosting`
  );
}

/**
 * Get URL for Teams app sideloading.
 *
 * @param projectPath - folder path of project
 * @returns remote sideloading URL
 */
export function getTeamsTabRemoteUrl(projectPath: string): string {
  const env = fs.readJsonSync(path.join(projectPath, ".fx/env.default.json"));
  return `https://teams.microsoft.com/_#/l/app/${env.solution.remoteTeamsAppId}?installAppPackage=true`;
}

let browser: ChromiumBrowser;
let page: Page;

/**
 * Login Teams and return the browser page for testing.
 *
 * @returns browser and page instance
 */
export async function getLoginEnvironment(): Promise<{
  browser: ChromiumBrowser;
  page: Page;
}> {
  if (!browser) {
    await loginTestUser();
  }
  return { browser, page };
}

/**
 * Delete all project resources and local files.
 *
 * @param projectPath - folder path of project
 */
export async function deleteProject(projectPath: string): Promise<void> {
  await deleteProjectAad(projectPath);
  await deleteProjectResourceGroup(projectPath);
  await fs.remove(projectPath);
}

async function loginTestUser(): Promise<void> {
  console.log("logging test user...");
  browser = await chromium.launch({ headless: true });
  const TEAMS_URL = `https://teams.microsoft.com`;
  const selectors = {
    username: `input[name=loginfmt]`,
    passwordOption: `div.optionButtonContainer:has(span#FormsAuthentication)`,
    passwordOption2: `span#FormsAuthentication`,
    password: `input[name=Password]`,
    submit: `input[type=submit]`,
    title: `h2[title="Join or create a team"]`
  };

  const context = await browser.newContext();
  page = await context.newPage();
  await page.goto(TEAMS_URL, { timeout: E2E_TIMEOUT });
  await page.waitForSelector(selectors.username, { timeout: E2E_TIMEOUT });
  await page.click(selectors.username);
  await page.type(selectors.username, TEST_USER_NAME);
  await page.press(selectors.username, "Enter");
  await page.waitForSelector(selectors.passwordOption2, { timeout: E2E_TIMEOUT, state: "visible" });
  try {
    // Click password option is not stable, try twice here
    await page.click(selectors.passwordOption, { delay: 5000, timeout: 10000 });
    await page.click(selectors.passwordOption2, { delay: 5000, timeout: 10000 });
  } catch (e) {}
  await page.waitForSelector(selectors.password, { timeout: E2E_TIMEOUT });
  await page.click(selectors.password);
  await page.type(selectors.password, TEST_USER_PASSWORD);
  await page.press(selectors.password, "Enter");
  await page.waitForSelector(selectors.submit);
  await page.click(selectors.submit);
  await page.waitForSelector(selectors.title, { timeout: E2E_TIMEOUT });
}

async function callCli(command: string): Promise<boolean> {
  const result = await execAsync(command, {
    cwd: process.cwd(),
    env: process.env,
    timeout: 0
  });
  return result.stderr === "";
}

async function deleteProjectAad(projectPath: string) {
  console.log(`Deleting AAD app of project ${projectPath}`);
  const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);
  await deleteAadApp(context);
}

async function deleteProjectResourceGroup(projectPath: string) {
  console.log(`Deleting resources of project ${projectPath}`);
  const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);
  let resourceGroupName: string;
  try {
    resourceGroupName = context.solution.resourceGroupName;
  } catch (e) {
    console.warn("No resource group name found in env.default.json");
    return;
  }
  await MockAzureAccountProvider.getInstance().deleteResourceGroup(resourceGroupName);
}

/**
 * Get Access Token from a specific AAD app client id.
 * @param clientId - remote or local AAD App id.
 * @param userName - Azure account login name.
 * @param password - Azure account login password.
 * @param tenantId - AAD App tenant id.
 * @param scope - AAD App custom scopes to restrict access to data and functionality protected by the API.
 */
export async function getAccessToken(
  clientId: string,
  userName: string,
  password: string,
  tenantId: string,
  scope?: string
): Promise<string> {
  const msalConfig = {
    auth: {
      clientId: clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`
    }
  };
  let scopes: string[];
  // this scope is required.
  if (scope) {
    scopes = [scope];
  } else {
    scopes = [`api://localhost/${clientId}/access_as_user`];
  }
  const pca = new msal.PublicClientApplication(msalConfig);
  const usernamePasswordRequest = {
    scopes: scopes,
    username: userName,
    password: password
  };
  const response = await pca.acquireTokenByUsernamePassword(usernamePasswordRequest);
  return response!.accessToken;
}
