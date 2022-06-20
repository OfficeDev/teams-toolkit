// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { InputsWithProjectPath, ok, Platform, Void } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { setTools } from "../../src/core/globalVars";
import * as templateAction from "../../src/common/template-utils/templatesActions";
import "../../src/component/core";
import "../../src/component/feature/bot";
import "../../src/component/feature/sql";
import { createContextV3 } from "../../src/component/utils";
import { runAction } from "../../src/component/workflow";
import { getProjectSettingsPath } from "../../src/core/middleware/projectSettingsLoader";
import { MockTools, randomAppName } from "../core/utils";
import * as provisionV3 from "../../src/plugins/solution/fx-solution/v3/provision";
import { AppStudioClient } from "../../src/plugins/resource/appstudio/appStudio";
import * as clientFactory from "../../src/plugins/resource/bot/clientFactory";
import { AADRegistration } from "../../src/plugins/resource/bot/aadRegistration";
import { TestHelper } from "../plugins/resource/frontend/helper";
import arm from "../../src/plugins/solution/fx-solution/arm";
import { FrontendDeployment } from "../../src/plugins/resource/frontend/ops/deploy";
import { newEnvInfoV3 } from "../../src/core/environment";
describe("Workflow test for v3", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  setTools(tools);
  const appName = `unittest${randomAppName()}`;
  const projectPath = path.join(os.homedir(), "TeamsApps", appName);
  const context = createContextV3();
  beforeEach(() => {
    sandbox.stub(tools.ui, "showMessage").resolves(ok("Confirm"));
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("fx.init", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      "app-name": appName,
    };
    const res = await runAction("fx.init", context, inputs);
    assert.isTrue(res.isOk());
    assert.equal(context.projectSetting!.appName, appName);
    assert.deepEqual(context.projectSetting.components, []);
    assert.isTrue(fs.pathExistsSync(getProjectSettingsPath(inputs.projectPath)));
  });

  it("teams-bot.add", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      feature: "Bot",
      language: "typescript",
    };
    sandbox.stub(templateAction, "scaffoldFromTemplates").resolves();
    const res = await runAction("teams-bot.add", context, inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
  });

  it("sql.add", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
    };
    const res = await runAction("sql.add", context, inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
  });

  it("fx.provision", async () => {
    sandbox.stub(templateAction, "scaffoldFromTemplates").resolves();
    sandbox.stub(tools.tokenProvider.m365TokenProvider, "getAccessToken").resolves(ok("fakeToken"));
    sandbox
      .stub(tools.tokenProvider.m365TokenProvider, "getJsonObject")
      .resolves(ok({ tid: "mockTid" }));
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getAccountCredentialAsync")
      .resolves(TestHelper.fakeCredential);
    sandbox.stub(provisionV3, "fillInAzureConfigs").resolves(ok(Void));
    sandbox.stub(provisionV3, "askForProvisionConsent").resolves(ok(Void));
    sandbox.stub(AppStudioClient, "getApp").onFirstCall().throws({}).onSecondCall().resolves({});
    sandbox.stub(AppStudioClient, "createApp").resolves({ teamsAppId: "mockTeamsAppId" });
    sandbox.stub(AppStudioClient, "updateApp").resolves({ teamsAppId: "mockTeamsAppId" });
    sandbox.stub(clientFactory, "createResourceProviderClient").resolves({});
    sandbox.stub(clientFactory, "ensureResourceProvider").resolves();
    sandbox.stub(AADRegistration, "registerAADAppAndGetSecretByGraph").resolves({
      clientId: "mockClientId",
      clientSecret: "mockClientSecret",
      objectId: "mockObjectId",
    });
    sandbox.stub(arm, "deployArmTemplates").resolves(ok(undefined));
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      feature: "Bot",
      language: "typescript",
      "app-name": appName,
    };
    const initRes = await runAction("fx.init", context, inputs);
    if (initRes.isErr()) {
      console.log(initRes.error);
    }
    assert.isTrue(initRes.isOk());

    const addBotRes = await runAction("teams-bot.add", context, inputs);
    if (addBotRes.isErr()) {
      console.log(addBotRes.error);
    }
    assert.isTrue(addBotRes.isOk());
    context.envInfo = newEnvInfoV3();
    context.tokenProvider = tools.tokenProvider;
    context.envInfo.state = {
      solution: {
        provisionSucceeded: true,
        needCreateResourceGroup: false,
        resourceGroupName: "mockRG",
        location: "eastasia",
        resourceNameSuffix: "3bf854123",
        teamsAppTenantId: "mockTid",
        subscriptionId: "mockSid",
        subscriptionName: "mockSname",
        tenantId: "mockAzureTid",
      },
      "azure-web-app": {
        sku: "F1",
        appName: "testwebApp",
        domain: "testwebApp.azurewebsites.net",
        appServicePlanName: "testwebAppPlan",
        resourceId:
          "/subscriptions/mockSid/resourceGroups/jay-texas/providers/Microsoft.Web/sites/testwebApp",
        endpoint: "https://testwebApp.azurewebsites.net",
      },
    };
    const provisionRes = await runAction("fx.provision", context, inputs);
    if (provisionRes.isErr()) {
      console.log(provisionRes.error);
    }
    assert.isTrue(provisionRes.isOk());
  });

  it("azure-storage.deploy", async () => {
    sandbox.stub(FrontendDeployment, "doFrontendDeploymentV3").resolves();
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getAccountCredentialAsync")
      .resolves(TestHelper.fakeCredential);
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      folder: "tabs",
    };
    context.envInfo = newEnvInfoV3();
    context.tokenProvider = tools.tokenProvider;
    context.envInfo.state = {
      solution: {
        provisionSucceeded: true,
        needCreateResourceGroup: false,
        resourceGroupName: "mockRG",
        location: "eastasia",
        resourceNameSuffix: "3bf854123",
        teamsAppTenantId: "mockTid",
        subscriptionId: "mockSid",
        subscriptionName: "mockSname",
        tenantId: "mockAzureTid",
      },
      "azure-storage": {
        location: "centreus",
        resourceId:
          "/subscriptions/mockSid/resourceGroups/jay-texas/providers/Microsoft.Storage/storageAccounts/testaccount",
        endpoint: "https://testaccount.azurewebsites.net",
      },
    };
    const res = await runAction("azure-storage.deploy", context, inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
  });
});
