// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Bowen Song <bowen.song@microsoft.com>
 */

import { expect } from "chai";
import path from "path";
import { environmentManager, isRemoteCollaborateEnabled } from "@microsoft/teamsfx-core";
import {
  cleanUp,
  execAsync,
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  setSimpleAuthSkuNameToB1Bicep,
} from "../commonUtils";

describe("Collaboration", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);
  const collaborator = process.env["M365_ACCOUNT_COLLABORATOR"];
  const creator = process.env["M365_ACCOUNT_NAME"];

  it("Collaboration: CLI with permission status and permission grant", async function () {
    if (!isRemoteCollaborateEnabled()) {
      return;
    }
    // new a project
    await execAsync(`teamsfx new --interactive false --app-name ${appName}`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] scaffold to ${projectPath}`);

    await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());

    // provision
    await execAsyncWithRetry(`teamsfx provision --subscription ${subscription}`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log("[Successfully] provision");

    // Check Permission
    const checkPermissionResult = await execAsyncWithRetry(`teamsfx permission status`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    expect(checkPermissionResult.stdout).to.contains(
      "Resource Name: Azure AD App, Permission: Owner"
    );
    expect(checkPermissionResult.stdout).to.contains(
      "Resource Name: Teams App, Permission: Administrator"
    );
    console.log("[Successfully] check permission");

    // Grant Permission
    const grantCollaboratorResult = await execAsyncWithRetry(
      `teamsfx permission grant --email ${collaborator}`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0,
      }
    );

    expect(grantCollaboratorResult.stdout).to.contains(
      "Owner permission has been granted to Azure AD App"
    );
    expect(grantCollaboratorResult.stdout).to.contains(
      "Administrator permission has been granted to Teams App"
    );
    console.log("[Successfully] grant permission");

    const listCollaboratorResult = await execAsync(
      `teamsfx permission status --list-all-collaborators`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0,
      }
    );

    // Check collaborator.
    // When collaborator account is guest account in the tenant. Account name pattern will change.
    // e.g. Guest account "account@example.com" will appear as "account_example#EXT#@exampleTenant.onmicrosoft.com" under tenant "exampleTenant".
    // Thus here will check the account name only.
    if (!isRemoteCollaborateEnabled()) {
      expect(listCollaboratorResult.stdout).to.contains(`Account: ${collaborator?.split("@")[0]}`);
      expect(listCollaboratorResult.stdout).to.contains(`Account: ${creator?.split("@")[0]}`);
    }
    console.log("[Successfully] list collaborator");
  });

  after(async () => {
    // clean up
    if (isRemoteCollaborateEnabled()) {
      await cleanUp(appName, projectPath, true, false, false, true);
    }
  });
});
