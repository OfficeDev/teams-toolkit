// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhijie Huang <zhijie.huang@microsoft.com>
 */

import { it } from "@microsoft/extra-shot-mocha";
import { AzureScopes } from "@microsoft/teamsfx-core/build/common/tools";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import axios from "axios";
import * as chai from "chai";
import fs from "fs-extra";
import { describe } from "mocha";
import path from "path";
import MockAzureAccountProvider from "@microsoft/teamsfx-cli/src/commonlib/azureLoginUserPassword";
import { FrontendWebAppConfig } from "../../commonlib";
import { CliHelper } from "../../commonlib/cliHelper";
import { EnvConstants } from "../../commonlib/constants";
import { Capability } from "../../utils/constants";
import {
  getResourceGroupNameFromResourceId,
  getSiteNameFromResourceId,
  getWebappSettings,
} from "../../commonlib/utilities";
import {
  cleanUp,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  readContextMultiEnvV3,
  setProvisionParameterValueV3,
} from "../commonUtils";

describe("Blazor App", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);
  const envName = environmentManager.getDefaultEnvName();
  const env = Object.assign({}, process.env);
  env["TEAMSFX_CLI_DOTNET"] = "true";

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, false, false, false);
  });
  it(
    `Create Blazor app`,
    { testPlanCaseId: 15686028, author: "zhijie.huang@microsoft.com" },
    async () => {
      await CliHelper.createDotNetProject(
        appName,
        testFolder,
        Capability.TabNonSso,
        env
      );
      const programCsPath = path.join(testFolder, appName, "App.razor");
      chai.assert.isTrue(await fs.pathExists(programCsPath));
    }
  );

  it(
    `Provision Resource`,
    { testPlanCaseId: 15686030, author: "zhijie.huang@microsoft.com" },
    async () => {
      await setProvisionParameterValueV3(projectPath, "dev", {
        key: "webAppSKU",
        value: "B1",
      });
      await CliHelper.provisionProject(projectPath, "", "dev", env);

      const tokenProvider = MockAzureAccountProvider;
      const tokenCredential = await tokenProvider.getIdentityCredentialAsync();
      const token = (await tokenCredential?.getToken(AzureScopes))?.token;
      chai.assert.exists(token);

      const context = await readContextMultiEnvV3(projectPath, envName);
      const resourceId =
        context[EnvConstants.TAB_AZURE_APP_SERVICE_RESOURCE_ID];
      chai.assert.exists(context);
      chai.assert.exists(resourceId);
      const response = await getWebappSettings(
        subscription,
        getResourceGroupNameFromResourceId(resourceId),
        getSiteNameFromResourceId(resourceId),
        token as string
      );
      chai.assert.exists(response);
      chai.assert.equal(
        response[FrontendWebAppConfig.clientId],
        context[EnvConstants.AAD_APP_CLIENT_ID]
      );
      chai.assert.equal(
        response[FrontendWebAppConfig.authority],
        context[EnvConstants.AAD_APP_OAUTH_AUTHORITY]
      );
    }
  );

  it(
    "Deploy Blazor app to Azure Web APP",
    { testPlanCaseId: 15686031, author: "zhijie.huang@microsoft.com" },
    async () => {
      await CliHelper.deployAll(projectPath, "", "dev", env);

      const context = await readContextMultiEnvV3(projectPath, envName);
      const endpoint = context[EnvConstants.TAB_ENDPOINT];
      chai.assert.exists(endpoint);
      const axiosInstance = axios.create();
      try {
        const response = await axiosInstance.get(endpoint);
        chai.assert.equal(response.status, 200);
      } catch (e) {
        chai.assert.notExists(e);
      }
    }
  );
});
