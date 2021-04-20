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
 * @param passWord - Azure account login password.
 * @param hostName - AAD App scope host, such as "localhost" or "****.web.core.windows.net"
 * @param tenantId - AAD App tenant id.
 */
export async function getAccessToken(
  clientId: string,
  userName: string,
  passWord: string,
  hostName: string,
  tenantId: string
): Promise<string> {
  const msalConfig = {
    auth: {
      clientId: clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`
    }
  };
  // this scope is required.
  const scopes = [`api://${hostName}/${clientId}/access_as_user`];
  const pca = new msal.PublicClientApplication(msalConfig);
  const usernamePasswordRequest = {
    scopes: scopes,
    username: userName,
    password: passWord
  };
  const response = await pca.acquireTokenByUsernamePassword(usernamePasswordRequest);
  return response!.accessToken;
}
