// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import fs from "fs-extra";
import * as msal from "@azure/msal-node";

const execAsync = promisify(exec);

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
  scope: string = ""
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
