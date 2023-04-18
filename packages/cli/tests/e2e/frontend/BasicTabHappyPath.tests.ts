// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import fs from "fs-extra";
import path from "path";
import { it } from "@microsoft/extra-shot-mocha";
import {
  getTestFolder,
  cleanUp,
  getSubscriptionId,
  getUniqueAppName,
  readContextMultiEnvV3,
  setProvisionParameterValueV3,
} from "../commonUtils";
import { Capability, EnvConstants } from "../../commonlib/constants";
import { CliHelper } from "../../commonlib/cliHelper";
import { AzureScopes, environmentManager, isV3Enabled } from "@microsoft/teamsfx-core";
import {
  getResourceGroupNameFromResourceId,
  getSiteNameFromResourceId,
  getWebappSettings,
} from "../../commonlib/utilities";
import MockAzureAccountProvider from "../../../src/commonlib/azureLoginUserPassword";
import axios from "axios";

describe("Basic Tab", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();
  after(async () => {
    await cleanUp(appName, projectPath, true, false, false);
  });

  it("Create & Provision & Deploy Basic Tab (JavaScript)", async function () {
    if (!isV3Enabled()) {
      this.skip();
    }

    // Scaffold
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.TabNonSso);

    // Validate Scaffold
    const indexFile = path.join(projectPath, "src", "app.js");
    fs.access(indexFile, fs.constants.F_OK, (err) => {
      assert.notExists(err);
    });

    // Provision
    await setProvisionParameterValueV3(projectPath, env, {
      key: "webAppSku",
      value: "B1",
    });
    await CliHelper.provisionProject(projectPath);

    // Validate Provision
    let context = await readContextMultiEnvV3(projectPath, env);
    assert.exists(context);

    const resourceId = context[EnvConstants.TAB_AZURE_APP_SERVICE_RESOURCE_ID];
    assert.exists(resourceId);

    const tokenProvider = MockAzureAccountProvider;
    const tokenCredential = await tokenProvider.getIdentityCredentialAsync();
    const token = (await tokenCredential?.getToken(AzureScopes))?.token;
    assert.exists(token);

    const response = await getWebappSettings(
      subscription,
      getResourceGroupNameFromResourceId(resourceId),
      getSiteNameFromResourceId(resourceId),
      token as string
    );
    assert.exists(response);
    assert.equal(response["WEBSITE_NODE_DEFAULT_VERSION"], "~18");
    assert.equal(response["WEBSITE_RUN_FROM_PACKAGE"], "1");
    assert.equal(response["RUNNING_ON_AZURE"], "1");

    // deploy
    await CliHelper.deployAll(projectPath);

    // Validate Deploy
    context = await readContextMultiEnvV3(projectPath, env);
    assert.exists(context);

    const endpoint = context[EnvConstants.TAB_ENDPOINT];
    assert.exists(endpoint);

    const axiosInstance = axios.create();
    try {
      const response = await axiosInstance.get(endpoint);
      assert.equal(response.status, 200);
    } catch (e) {
      assert.fail(JSON.stringify(e));
    }
  });
});
