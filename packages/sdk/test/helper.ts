// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import fs from "fs-extra";
import * as msal from "@azure/msal-node";
import mockedEnv from "mocked-env";

const execAsync = promisify(exec);
let restore: () => void;
/**
 * Copy function folder to the api folder under project and deploy.
 *
 * @param projectPath - folder path of test project
 * @param functionSrcFolder - folder path of function api
 */
export async function deployFunction(
  projectPath: string,
  functionSrcFolder: string
): Promise<void> {
  fs.copySync(functionSrcFolder, path.join(projectPath, "api"), { overwrite: true });
  await callCli(`teamsfx deploy --folder ${projectPath} --deploy-plugin fx-resource-function`);
}

async function callCli(command: string): Promise<boolean> {
  const result = await execAsync(command, {
    cwd: process.cwd(),
    env: process.env,
    timeout: 0
  });
  return result.stderr === "";
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

export function MockEnvironmentVariable() {
  restore = mockedEnv({
    M365_CLIENT_ID: process.env.SDK_INTEGRATION_TEST_AAD_CLIENT_ID_REMOTE,
    M365_CLIENT_SECRET: process.env.SDK_INTEGRATION_TEST_APP_CLIENT_SECRET_REMOTE,
    M365_TENANT_ID: process.env.SDK_INTEGRATION_TEST_AAD_TENANT_ID,
    M365_AUTHORITY_HOST: process.env.SDK_INTEGRATION_TEST_AAD_AUTHORITY_HOST,

    SQL_ENDPOINT: process.env.SDK_INTEGRATION_SQL_ENDPOINT,
    SQL_DATABASE: process.env.SDK_INTEGRATION_SQL_DATABASE_NAME,
    SQL_USER_NAME: process.env.SDK_INTEGRATION_SQL_USER_NAME,
    SQL_PASSWORD: process.env.SDK_INTEGRATION_SQL_PASSWORD
  });
}

export function RestoreEnvironmentVariable() {
  restore();
}
