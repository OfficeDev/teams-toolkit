// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  err,
  FuncQuestion,
  InputsWithProjectPath,
  ok,
  Platform,
  ResourceContextV3,
  UserError,
  Void,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { setTools } from "../../src/core/globalVars";
import * as templateAction from "../../src/common/template-utils/templatesActions";
import "../../src/component/core";
import "../../src/component/feature/bot/bot";
import "../../src/component/feature/sql";
import "../../src/component/resource/botService/botService";
import { createContextV3 } from "../../src/component/utils";
import { deleteFolder, MockTools, randomAppName } from "../core/utils";
import { AppStudioClient } from "../../src/component/resource/appManifest/appStudioClient";
import { AADRegistration } from "../../src/component/resource/botService/aadRegistration";
import { TestHelper } from "../plugins/resource/frontend/helper";
import arm from "../../src/plugins/solution/fx-solution/arm";
import { FrontendDeployment } from "../../src/plugins/resource/frontend/ops/deploy";
import { newEnvInfoV3 } from "../../src/core/environment";
import { Utils } from "../../src/component/resource/spfx/utils/utils";
import { YoChecker } from "../../src/component/resource/spfx/depsChecker/yoChecker";
import { GeneratorChecker } from "../../src/component/resource/spfx/depsChecker/generatorChecker";
import { cpUtils } from "../../src/plugins/solution/fx-solution/utils/depsChecker/cpUtils";
import * as uuid from "uuid";
import * as aadManifest from "../../src/core/generateAadManifestTemplate";
import {
  SPFXQuestionNames,
  versionCheckQuestion,
} from "../../src/component/resource/spfx/utils/questions";
import { DefaultManifestProvider } from "../../src/component/resource/appManifest/manifestProvider";
import { ComponentNames } from "../../src/component/constants";
import { FunctionScaffold } from "../../src/plugins/resource/function/ops/scaffold";
import { TeamsfxCore } from "../../src/component/core";
import { Container } from "typedi";
import { AzureStorageResource } from "../../src/component/resource/azureStorage";
import mockedEnv from "mocked-env";
import { ciOption, githubOption, questionNames } from "../../src/component/feature/cicd/questions";
import * as armFunctions from "../../src/plugins/solution/fx-solution/arm";
import { apiConnectorImpl } from "../../src/component/feature/apiconnector/apiConnector";
import * as backup from "../../src/plugins/solution/fx-solution/utils/backupFiles";
import { AadApp } from "../../src/component/resource/aadApp/aadApp";
import { CoreQuestionNames } from "../../src/core/question";
import * as questionV3 from "../../src/component/questionV3";
import { provisionUtils } from "../../src/component/provisionUtils";
import { deployUtils } from "../../src/component/deployUtils";
import {
  AzureResourceApim,
  AzureResourceSQL,
  AzureSolutionQuestionNames,
} from "../../src/plugins/solution/fx-solution/question";
import { AddSsoParameters } from "../../src/plugins/solution/fx-solution/constants";
import { BuiltInFeaturePluginNames } from "../../src/plugins/solution/fx-solution/v3/constants";
import { Constants } from "../../src/component/resource/aadApp/constants";
describe("Core component test for v3", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  setTools(tools);
  const appName = `unittest${randomAppName()}`;
  const projectPath = path.join(os.homedir(), "TeamsApps", appName);
  const context = createContextV3();
  const fx = Container.get<TeamsfxCore>("fx");
  afterEach(() => {
    sandbox.restore();
  });
  after(async () => {
    deleteFolder(projectPath);
  });

  it("fx.init", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      "app-name": appName,
      folder: path.join(os.homedir(), "TeamsApps"),
    };
    const res = await fx.init(context, inputs);
    assert.isTrue(res.isOk());
    assert.equal(context.projectSetting!.appName, appName);
    assert.deepEqual(context.projectSetting.components, []);
  });

  it("teams-bot.add", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      features: "Bot",
      language: "typescript",
    };
    sandbox.stub(templateAction, "scaffoldFromTemplates").resolves();
    const component = Container.get("teams-bot") as any;
    const res = await component.add(context, inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
  });
  it("spfx-tab.add", async () => {
    sandbox.stub(Utils, "configure");
    sandbox.stub(fs, "stat").resolves();
    sandbox.stub(YoChecker.prototype, "isInstalled").resolves(true);
    sandbox.stub(GeneratorChecker.prototype, "isInstalled").resolves(true);
    sandbox.stub(cpUtils, "executeCommand").resolves("succeed");
    const manifestId = uuid.v4();
    sandbox.stub(fs, "readFile").resolves(new Buffer(`{"id": "${manifestId}"}`));
    sandbox.stub(fs, "writeFile").resolves();
    sandbox.stub(fs, "rename").resolves();
    sandbox.stub(fs, "copyFile").resolves();
    sandbox.stub(versionCheckQuestion as FuncQuestion, "func").resolves(undefined);
    sandbox.stub(DefaultManifestProvider.prototype, "updateCapability").resolves(ok(Void));

    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.CLI,
      language: "typescript",
      [SPFXQuestionNames.webpart_name]: "hello",
      [SPFXQuestionNames.framework_type]: "none",
    };
    const component = Container.get("spfx-tab") as any;
    const res = await component.add(context, inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
  });
  it("sql.add", async () => {
    sandbox.stub(FunctionScaffold, "scaffoldFunction").resolves();
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      ["function-name"]: "getUserProfile",
    };
    const component = Container.get("sql") as any;
    const res = await component.add(context, inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
  });
  it("fx.addFeature(sql)", async () => {
    sandbox.stub(FunctionScaffold, "scaffoldFunction").resolves();
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      ["function-name"]: "getUserProfile",
      features: AzureResourceSQL.id,
    };
    const component = Container.get("fx") as any;
    const res = await component.addFeature(context, inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
  });
  it("sso.add", async () => {
    sandbox.stub(context.userInteraction, "showMessage").resolves(ok(AddSsoParameters.LearnMore));
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
    };
    const component = Container.get("sso") as any;
    const res = await component.add(context, inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
    const res2 = await component.add(context, inputs);
    if (res2.isErr()) {
      console.log(res2.error);
    }
    assert.isTrue(res2.isOk());
  });
  it("sso.add CLI", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.CLI,
    };
    const component = Container.get("sso") as any;
    const res = await component.add(context, inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
    const res2 = await component.add(context, inputs);
    if (res2.isErr()) {
      console.log(res2.error);
    }
    assert.isTrue(res2.isOk());
  });
  it("keyvault.add", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
    };
    const component = Container.get("key-vault-feature") as any;
    const res = await component.add(context, inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
  });
  it("cicd.add", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      [questionNames.Provider]: githubOption.id,
      [questionNames.Template]: [ciOption.id],
      [questionNames.Environment]: "dev",
    };
    const component = Container.get("cicd") as any;
    const res = await component.add(context, inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
  });
  it("api-connector.add", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      endpoint: "https://test.com",
      component: ["bot"],
      alias: "test123",
      "auth-type": "basic",
      "user-name": "guest123",
    };
    const component = Container.get("api-connector") as any;
    sandbox.stub(apiConnectorImpl, "scaffold").resolves({});
    const res = await component.add(context, inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
  });
  it("apim-feature.add", async () => {
    sandbox.stub(FunctionScaffold, "scaffoldFunction").resolves();
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      ["function-name"]: "getUserProfile",
    };
    const component = Container.get("apim-feature") as any;
    const res = await component.add(context, inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
  });
  it("fx.addFeature(apim-feature)", async () => {
    sandbox.stub(FunctionScaffold, "scaffoldFunction").resolves();
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      ["function-name"]: "getUserProfile",
      [CoreQuestionNames.Features]: AzureResourceApim.id,
    };
    const component = Container.get("fx") as any;
    const res = await component.addFeature(context, inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isErr());
  });

  describe("provision", async () => {
    it("fx.provision", async () => {
      sandbox.stub(templateAction, "scaffoldFromTemplates").resolves();
      sandbox
        .stub(tools.tokenProvider.m365TokenProvider, "getAccessToken")
        .resolves(ok("fakeToken"));
      sandbox
        .stub(tools.tokenProvider.m365TokenProvider, "getJsonObject")
        .resolves(ok({ tid: "mockTid" }));
      sandbox
        .stub(tools.tokenProvider.azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
      sandbox
        .stub(provisionUtils, "fillInAzureConfigs")
        .resolves(ok({ hasSwitchedSubscription: false }));
      sandbox.stub(provisionUtils, "askForProvisionConsent").resolves(ok(Void));
      sandbox.stub(AppStudioClient, "getApp").onFirstCall().throws({}).onSecondCall().resolves({});
      sandbox.stub(AppStudioClient, "importApp").resolves({ teamsAppId: "mockTeamsAppId" });
      sandbox.stub(AADRegistration, "registerAADAppAndGetSecretByGraph").resolves({
        clientId: "00000000-0000-0000-0000-000000000000",
        clientSecret: "mockClientSecret",
        objectId: "00000000-0000-0000-0000-000000000000",
      });
      sandbox.stub(arm, "deployArmTemplates").resolves(ok(undefined));
      const appName = `unittest${randomAppName()}`;
      const inputs: InputsWithProjectPath = {
        projectPath: projectPath,
        platform: Platform.VSCode,
        [AzureSolutionQuestionNames.Features]: "Bot",
        language: "typescript",
        "app-name": appName,
        folder: path.join(os.homedir(), "TeamsApps"),
      };
      const initRes = await fx.init(context, inputs);
      if (initRes.isErr()) {
        console.log(initRes.error);
      }
      assert.isTrue(initRes.isOk());
      const component = Container.get("teams-bot") as any;
      const addBotRes = await component.add(context, inputs);
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
        [ComponentNames.AadApp]: {
          clientId: "00000000-0000-0000-0000-000000000000",
          applicationIdUris: "https://abc.com",
        },
        [ComponentNames.TeamsBot]: {
          botId: "00000000-0000-0000-0000-000000000000",
          domain: "abc.com",
        },
      };

      const provisionRes = await fx.provision(context as ResourceContextV3, inputs);
      if (provisionRes.isErr()) {
        console.log(provisionRes.error);
      }
      assert.isTrue(provisionRes.isOk());
    });

    it("fx.provision after switching subscription", async () => {
      sandbox.stub(tools.ui, "showMessage").resolves(ok("Confirm"));
      sandbox.stub(templateAction, "scaffoldFromTemplates").resolves();
      sandbox
        .stub(tools.tokenProvider.m365TokenProvider, "getAccessToken")
        .resolves(ok("fakeToken"));
      sandbox
        .stub(tools.tokenProvider.m365TokenProvider, "getJsonObject")
        .resolves(ok({ tid: "mockTid" }));
      sandbox
        .stub(tools.tokenProvider.azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
      sandbox
        .stub(provisionUtils, "fillInAzureConfigs")
        .resolves(ok({ hasSwitchedSubscription: true }));
      sandbox.stub(provisionUtils, "askForProvisionConsent").resolves(ok(Void));
      sandbox.stub(AppStudioClient, "getApp").onFirstCall().throws({}).onSecondCall().resolves({});
      sandbox.stub(AppStudioClient, "importApp").resolves({ teamsAppId: "mockTeamsAppId" });
      sandbox.stub(AADRegistration, "registerAADAppAndGetSecretByGraph").resolves({
        clientId: "mockClientId",
        clientSecret: "mockClientSecret",
        objectId: "mockObjectId",
      });
      sandbox.stub(armFunctions, "updateAzureParameters").resolves(ok(undefined));
      sandbox.stub(arm, "deployArmTemplates").resolves(ok(undefined));
      const appName = `unittest${randomAppName()}`;
      const inputs: InputsWithProjectPath = {
        projectPath: projectPath,
        platform: Platform.VSCode,
        [AzureSolutionQuestionNames.Features]: "Bot",
        language: "typescript",
        "app-name": appName,
        folder: path.join(os.homedir(), "TeamsApps"),
      };
      const initRes = await fx.init(context, inputs);
      if (initRes.isErr()) {
        console.log(initRes.error);
      }
      assert.isTrue(initRes.isOk());
      const teamsBot = Container.get("teams-bot") as any;
      const addBotRes = await teamsBot.add(context, inputs);
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
        [ComponentNames.TeamsBot]: {
          botId: "00000000-0000-0000-0000-000000000000",
          domain: "abc.com",
        },
      };
      const provisionRes = await fx.provision(context as ResourceContextV3, inputs);
      if (provisionRes.isErr()) {
        console.log(provisionRes.error);
      }
      assert.isTrue(provisionRes.isOk());
    });

    it("fx.provision local debug after switching m365 tenant", async () => {
      sandbox.stub(tools.ui, "showMessage").resolves(ok("Confirm"));
      sandbox.stub(templateAction, "scaffoldFromTemplates").resolves();
      sandbox
        .stub(tools.tokenProvider.m365TokenProvider, "getAccessToken")
        .resolves(ok("fakeToken"));
      sandbox.stub(armFunctions, "updateAzureParameters").resolves(ok(undefined));
      sandbox
        .stub(tools.tokenProvider.m365TokenProvider, "getJsonObject")
        .resolves(ok({ tid: "mockSwitchedTid", upn: "mockUpn" }));
      sandbox
        .stub(tools.tokenProvider.azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
      sandbox.stub(backup, "backupFiles").resolves(ok(undefined));
      sandbox.stub(AppStudioClient, "getApp").onFirstCall().throws({}).onSecondCall().resolves({});
      sandbox.stub(AppStudioClient, "importApp").resolves({ teamsAppId: "mockTeamsAppId" });
      sandbox.stub(AADRegistration, "registerAADAppAndGetSecretByGraph").resolves({
        clientId: "mockClientId",
        clientSecret: "mockClientSecret",
        objectId: "mockObjectId",
      });
      const appName = `unittest${randomAppName()}`;
      const inputs: InputsWithProjectPath = {
        projectPath: projectPath,
        platform: Platform.VSCode,
        features: "Bot",
        language: "typescript",
        "app-name": appName,
        folder: path.join(os.homedir(), "TeamsApps"),
        checkerInfo: {
          skipNgrok: true,
        },
      };
      const initRes = await fx.init(context, inputs);
      if (initRes.isErr()) {
        console.log(initRes.error);
      }
      assert.isTrue(initRes.isOk());

      context.projectSetting.components = [
        {
          name: "teams-bot",
          build: true,
          capabilities: ["bot"],
          deploy: true,
          folder: "bot",
          hosting: "azure-web-app",
        },
      ];
      context.envInfo = newEnvInfoV3("local");
      context.tokenProvider = tools.tokenProvider;
      context.envInfo.state = {
        solution: {
          provisionSucceeded: true,
          teamsAppTenantId: "mockTid",
        },
        "app-manifest": {
          tenantId: "mockTid",
          teamsAppId: "mockTeamsAppId",
        },
      };
      context.envInfo.config.bot = {
        siteEndpoint: "https://localtest:3978",
      };
      const provisionRes = await fx.provision(context as ResourceContextV3, inputs);
      if (provisionRes.isErr()) {
        console.log(provisionRes.error);
      }
      assert.isTrue(provisionRes.isOk());
      assert.isTrue(context.envInfo.state.solution.teamsAppTenantId === "mockSwitchedTid");
      assert.isTrue(context.envInfo.state.solution.provisionSucceeded);
      assert.isTrue(context.envInfo.state["app-manifest"]["tenantId"] === "mockSwitchedTid");
    });

    it("fx.provision local debug after switching m365 tenant: backup error", async () => {
      sandbox.stub(tools.ui, "showMessage").resolves(ok("Confirm"));
      sandbox.stub(templateAction, "scaffoldFromTemplates").resolves();
      sandbox
        .stub(backup, "backupFiles")
        .resolves(err(new UserError("solution", "backupError", "backupError")));
      sandbox
        .stub(tools.tokenProvider.m365TokenProvider, "getAccessToken")
        .resolves(ok("fakeToken"));
      sandbox
        .stub(tools.tokenProvider.m365TokenProvider, "getJsonObject")
        .resolves(ok({ tid: "mockSwitchedTid", upn: "mockUpn" }));
      sandbox
        .stub(tools.tokenProvider.azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
      sandbox.stub(AppStudioClient, "getApp").onFirstCall().throws({}).onSecondCall().resolves({});
      sandbox.stub(AppStudioClient, "importApp").resolves({ teamsAppId: "mockTeamsAppId" });
      sandbox.stub(AADRegistration, "registerAADAppAndGetSecretByGraph").resolves({
        clientId: "mockClientId",
        clientSecret: "mockClientSecret",
        objectId: "mockObjectId",
      });
      const appName = `unittest${randomAppName()}`;
      const inputs: InputsWithProjectPath = {
        projectPath: projectPath,
        platform: Platform.VSCode,
        features: "Bot",
        language: "typescript",
        "app-name": appName,
        folder: path.join(os.homedir(), "TeamsApps"),
        checkerInfo: {
          skipNgrok: true,
        },
      };
      const initRes = await fx.init(context, inputs);
      if (initRes.isErr()) {
        console.log(initRes.error);
      }
      assert.isTrue(initRes.isOk());

      context.projectSetting.components = [
        {
          name: "teams-bot",
          build: true,
          capabilities: ["bot"],
          deploy: true,
          folder: "bot",
          hosting: "azure-web-app",
        },
      ];
      context.envInfo = newEnvInfoV3("local");
      context.tokenProvider = tools.tokenProvider;
      context.envInfo.state = {
        solution: {
          provisionSucceeded: true,
          teamsAppTenantId: "mockTid",
        },
        "app-manifest": {
          tenantId: "mockTid",
          teamsAppId: "mockTeamsAppId",
        },
      };
      context.envInfo.config.bot = {
        siteEndpoint: "https://localtest:3978",
      };
      const provisionRes = await fx.provision(context as ResourceContextV3, inputs);
      if (provisionRes.isErr()) {
        console.log(provisionRes.error);
      }
      assert.isTrue(provisionRes.isErr());
      if (provisionRes.isErr()) {
        assert.isTrue(provisionRes.error.name === "backupError");
      }
    });

    it("fx.provision after switching M365", async () => {
      sandbox.stub(tools.ui, "showMessage").resolves(ok("Confirm"));
      sandbox.stub(templateAction, "scaffoldFromTemplates").resolves();
      sandbox
        .stub(tools.tokenProvider.m365TokenProvider, "getAccessToken")
        .resolves(ok("fakeToken"));
      sandbox
        .stub(tools.tokenProvider.m365TokenProvider, "getJsonObject")
        .resolves(ok({ tid: "mockSwitchedTid" }));
      sandbox
        .stub(tools.tokenProvider.azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
      sandbox
        .stub(provisionUtils, "fillInAzureConfigs")
        .resolves(ok({ hasSwitchedSubscription: true }));
      sandbox.stub(provisionUtils, "askForProvisionConsent").resolves(ok(Void));
      sandbox.stub(AppStudioClient, "getApp").onFirstCall().throws({}).onSecondCall().resolves({});
      sandbox.stub(AppStudioClient, "importApp").resolves({ teamsAppId: "mockTeamsAppId" });
      sandbox.stub(AADRegistration, "registerAADAppAndGetSecretByGraph").resolves({
        clientId: "mockClientId",
        clientSecret: "mockClientSecret",
        objectId: "mockObjectId",
      });
      sandbox.stub(armFunctions, "updateAzureParameters").resolves(ok(undefined));
      sandbox.stub(backup, "backupFiles").resolves(ok(undefined));
      sandbox.stub(arm, "deployArmTemplates").resolves(ok(undefined));
      const appName = `unittest${randomAppName()}`;
      const inputs: InputsWithProjectPath = {
        projectPath: projectPath,
        platform: Platform.VSCode,
        features: "Bot",
        language: "typescript",
        "app-name": appName,
        folder: path.join(os.homedir(), "TeamsApps"),
      };
      const initRes = await fx.init(context, inputs);
      if (initRes.isErr()) {
        console.log(initRes.error);
      }
      assert.isTrue(initRes.isOk());
      const teamsBot = Container.get("teams-bot") as any;
      const addBotRes = await teamsBot.add(context, inputs);
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
            "/subscriptions/mockSid/resourceGroups/xxx/providers/Microsoft.Web/sites/testwebApp",
          endpoint: "https://testwebApp.azurewebsites.net",
        },
        [ComponentNames.AppManifest]: {
          tenantId: "mockTid",
        },
        [ComponentNames.TeamsBot]: {
          botId: "00000000-0000-0000-0000-000000000000",
          domain: "abc.com",
        },
      };
      const provisionRes = await fx.provision(context as ResourceContextV3, inputs);
      if (provisionRes.isErr()) {
        console.log(provisionRes.error);
      }
      assert.isTrue(provisionRes.isOk());
      assert.isTrue(context.envInfo.state.solution.teamsAppTenantId === "mockSwitchedTid");
      assert.isTrue(context.envInfo.state.solution.provisionSucceeded);
      assert.isTrue(context.envInfo.state["app-manifest"]["tenantId"] === "mockSwitchedTid");
    });

    it("fx.provision cancel when confirming", async () => {
      sandbox.stub(tools.ui, "showMessage").resolves(ok("Confirm"));
      sandbox.stub(templateAction, "scaffoldFromTemplates").resolves();
      sandbox
        .stub(tools.tokenProvider.m365TokenProvider, "getAccessToken")
        .resolves(ok("fakeToken"));
      sandbox
        .stub(tools.tokenProvider.m365TokenProvider, "getJsonObject")
        .resolves(ok({ tid: "mockTid" }));
      sandbox
        .stub(tools.tokenProvider.azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
      sandbox
        .stub(provisionUtils, "fillInAzureConfigs")
        .resolves(ok({ hasSwitchedSubscription: false }));
      sandbox
        .stub(provisionUtils, "askForProvisionConsent")
        .resolves(err(new UserError("Solution", "CancelProvision", "CancelProvision")));
      sandbox.stub(AppStudioClient, "getApp").onFirstCall().throws({}).onSecondCall().resolves({});
      sandbox.stub(AppStudioClient, "importApp").resolves({ teamsAppId: "mockTeamsAppId" });
      sandbox.stub(AADRegistration, "registerAADAppAndGetSecretByGraph").resolves({
        clientId: "00000000-0000-0000-0000-000000000000",
        clientSecret: "mockClientSecret",
        objectId: "00000000-0000-0000-0000-000000000000",
      });
      sandbox.stub(arm, "deployArmTemplates").resolves(ok(undefined));
      const appName = `unittest${randomAppName()}`;
      const inputs: InputsWithProjectPath = {
        projectPath: projectPath,
        platform: Platform.VSCode,
        [AzureSolutionQuestionNames.Features]: "Bot",
        language: "typescript",
        "app-name": appName,
        folder: path.join(os.homedir(), "TeamsApps"),
      };
      const initRes = await fx.init(context, inputs);
      if (initRes.isErr()) {
        console.log(initRes.error);
      }
      assert.isTrue(initRes.isOk());
      const component = Container.get("teams-bot") as any;
      const addBotRes = await component.add(context, inputs);
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
      };

      const provisionRes = await fx.provision(context as ResourceContextV3, inputs);

      assert.isTrue(provisionRes.isErr());
      if (provisionRes.isErr()) {
        assert.isTrue(provisionRes.error.name === "CancelProvision");
      }
    });

    it("fx.provision could not get m365 token", async () => {
      sandbox.stub(tools.ui, "showMessage").resolves(ok("Confirm"));
      sandbox.stub(templateAction, "scaffoldFromTemplates").resolves();
      sandbox
        .stub(tools.tokenProvider.m365TokenProvider, "getAccessToken")
        .resolves(ok("fakeToken"));
      sandbox.stub(tools.tokenProvider.m365TokenProvider, "getJsonObject").resolves(undefined);
      sandbox
        .stub(tools.tokenProvider.azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
      const appName = `unittest${randomAppName()}`;
      const inputs: InputsWithProjectPath = {
        projectPath: projectPath,
        platform: Platform.VSCode,
        features: "Bot",
        language: "typescript",
        "app-name": appName,
        folder: path.join(os.homedir(), "TeamsApps"),
        checkerInfo: {
          skipNgrok: true,
        },
      };
      const initRes = await fx.init(context, inputs);
      if (initRes.isErr()) {
        console.log(initRes.error);
      }
      assert.isTrue(initRes.isOk());

      context.projectSetting.components = [
        {
          name: "teams-bot",
          build: true,
          capabilities: ["bot"],
          deploy: true,
          folder: "bot",
          hosting: "azure-web-app",
        },
      ];
      context.envInfo = newEnvInfoV3("local");
      context.tokenProvider = tools.tokenProvider;
      const provisionRes = await fx.provision(context as ResourceContextV3, inputs);
      assert.isTrue(provisionRes.isErr());
    });

    it("fx.provision error when update Azure parameters", async () => {
      sandbox.stub(tools.ui, "showMessage").resolves(ok("Confirm"));
      sandbox.stub(templateAction, "scaffoldFromTemplates").resolves();
      sandbox
        .stub(tools.tokenProvider.m365TokenProvider, "getAccessToken")
        .resolves(ok("fakeToken"));
      sandbox
        .stub(tools.tokenProvider.m365TokenProvider, "getJsonObject")
        .resolves(ok({ tid: "mockTid" }));
      sandbox
        .stub(tools.tokenProvider.azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
      sandbox
        .stub(provisionUtils, "fillInAzureConfigs")
        .resolves(ok({ hasSwitchedSubscription: true }));
      sandbox.stub(provisionUtils, "askForProvisionConsent").resolves(ok(Void));
      sandbox.stub(backup, "backupFiles").resolves(ok(undefined));
      sandbox
        .stub(armFunctions, "updateAzureParameters")
        .resolves(err(new UserError("Solution", "error1", "error1")));
      sandbox.stub(AppStudioClient, "getApp").onFirstCall().throws({}).onSecondCall().resolves({});
      sandbox.stub(AppStudioClient, "importApp").resolves({ teamsAppId: "mockTeamsAppId" });
      sandbox.stub(AADRegistration, "registerAADAppAndGetSecretByGraph").resolves({
        clientId: "00000000-0000-0000-0000-000000000000",
        clientSecret: "mockClientSecret",
        objectId: "00000000-0000-0000-0000-000000000000",
      });

      const appName = `unittest${randomAppName()}`;
      const inputs: InputsWithProjectPath = {
        projectPath: projectPath,
        platform: Platform.VSCode,
        features: "Bot",
        language: "typescript",
        "app-name": appName,
        folder: path.join(os.homedir(), "TeamsApps"),
      };
      const initRes = await fx.init(context, inputs);
      if (initRes.isErr()) {
        console.log(initRes.error);
      }
      assert.isTrue(initRes.isOk());
      const component = Container.get("teams-bot") as any;
      const addBotRes = await component.add(context, inputs);
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
      };

      const provisionRes = await fx.provision(context as ResourceContextV3, inputs);

      assert.isTrue(provisionRes.isErr());
      if (provisionRes.isErr()) {
        assert.isTrue(provisionRes.error.name === "error1");
      }
    });

    it("fx.provision project without Azure resources after switch M365 account", async () => {
      sandbox.stub(tools.ui, "showMessage").resolves(ok("Confirm"));
      sandbox.stub(templateAction, "scaffoldFromTemplates").resolves();
      sandbox
        .stub(tools.tokenProvider.m365TokenProvider, "getAccessToken")
        .resolves(ok("fakeToken"));
      sandbox
        .stub(tools.tokenProvider.m365TokenProvider, "getJsonObject")
        .resolves(ok({ tid: "mockTid" }));
      sandbox
        .stub(tools.tokenProvider.azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
      sandbox.stub(provisionUtils, "askForProvisionConsent").resolves(ok(Void));
      sandbox.stub(AppStudioClient, "getApp").onFirstCall().throws({}).onSecondCall().resolves({});
      sandbox.stub(AppStudioClient, "importApp").resolves({ teamsAppId: "mockTeamsAppId" });
      sandbox.stub(armFunctions, "updateAzureParameters").resolves(ok(undefined));
      sandbox.stub(backup, "backupFiles").resolves(ok(undefined));
      sandbox.stub(AADRegistration, "registerAADAppAndGetSecretByGraph").resolves({
        clientId: "00000000-0000-0000-0000-000000000000",
        clientSecret: "mockClientSecret",
        objectId: "00000000-0000-0000-0000-000000000000",
      });

      const appName = `unittest${randomAppName()}`;
      const inputs: InputsWithProjectPath = {
        projectPath: projectPath,
        platform: Platform.VSCode,
        features: "spfx",
        language: "typescript",
        "app-name": appName,
        folder: path.join(os.homedir(), "TeamsApps"),
      };
      const initRes = await fx.init(context, inputs);
      if (initRes.isErr()) {
        console.log(initRes.error);
      }
      assert.isTrue(initRes.isOk());
      context.envInfo = newEnvInfoV3();
      context.tokenProvider = tools.tokenProvider;
      context.envInfo.state = {
        solution: {
          provisionSucceeded: true,
          needCreateResourceGroup: false,
          resourceGroupName: "mockRG",
          location: "eastasia",
          resourceNameSuffix: "3bf854123",
          teamsAppTenantId: "oldMockTid",
          subscriptionId: "mockSid",
          subscriptionName: "mockSname",
          tenantId: "mockAzureTid",
        },
        [ComponentNames.AppManifest]: {
          tenantId: "oldMockTid",
        },
      };

      const provisionRes = await fx.provision(context as ResourceContextV3, inputs);

      assert.isTrue(provisionRes.isOk());
    });

    it("fx.provision project without Azure resources after switch M365 account: backupFiles error ", async () => {
      sandbox.stub(tools.ui, "showMessage").resolves(ok("Confirm"));
      sandbox.stub(templateAction, "scaffoldFromTemplates").resolves();
      sandbox
        .stub(tools.tokenProvider.m365TokenProvider, "getAccessToken")
        .resolves(ok("fakeToken"));
      sandbox
        .stub(tools.tokenProvider.m365TokenProvider, "getJsonObject")
        .resolves(ok({ tid: "mockTid" }));
      sandbox
        .stub(tools.tokenProvider.azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
      sandbox.stub(provisionUtils, "askForProvisionConsent").resolves(ok(Void));
      sandbox.stub(AppStudioClient, "getApp").onFirstCall().throws({}).onSecondCall().resolves({});
      sandbox.stub(AppStudioClient, "importApp").resolves({ teamsAppId: "mockTeamsAppId" });
      sandbox.stub(armFunctions, "updateAzureParameters").resolves(ok(undefined));
      sandbox
        .stub(backup, "backupFiles")
        .resolves(err(new UserError("solution", "backupError", "backupError")));
      sandbox.stub(AADRegistration, "registerAADAppAndGetSecretByGraph").resolves({
        clientId: "00000000-0000-0000-0000-000000000000",
        clientSecret: "mockClientSecret",
        objectId: "00000000-0000-0000-0000-000000000000",
      });

      const appName = `unittest${randomAppName()}`;
      const inputs: InputsWithProjectPath = {
        projectPath: projectPath,
        platform: Platform.VSCode,
        features: "spfx",
        language: "typescript",
        "app-name": appName,
        folder: path.join(os.homedir(), "TeamsApps"),
      };
      const initRes = await fx.init(context, inputs);
      if (initRes.isErr()) {
        console.log(initRes.error);
      }
      assert.isTrue(initRes.isOk());
      context.envInfo = newEnvInfoV3();
      context.tokenProvider = tools.tokenProvider;
      context.envInfo.state = {
        solution: {
          provisionSucceeded: true,
          needCreateResourceGroup: false,
          resourceGroupName: "mockRG",
          location: "eastasia",
          resourceNameSuffix: "3bf854123",
          teamsAppTenantId: "oldMockTid",
          subscriptionId: "mockSid",
          subscriptionName: "mockSname",
          tenantId: "mockAzureTid",
        },
        [ComponentNames.AppManifest]: {
          tenantId: "oldMockTid",
        },
      };

      const provisionRes = await fx.provision(context as ResourceContextV3, inputs);

      assert.isTrue(provisionRes.isErr());
      if (provisionRes.isErr()) {
        assert.isTrue(provisionRes.error.name === "backupError");
      }
    });
  });

  it("azure-storage.deploy", async () => {
    sandbox.stub(tools.ui, "showMessage").resolves(ok("Confirm"));
    sandbox.stub(templateAction, "scaffoldFromTemplates").resolves();
    sandbox.stub(FrontendDeployment, "doFrontendDeploymentV3").resolves();
    sandbox.stub(aadManifest, "generateAadManifestTemplate").resolves();
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getAccountCredentialAsync")
      .resolves(TestHelper.fakeCredential);
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      folder: path.join(projectPath, "tabs"),
      componentId: "teams-tab",
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
      "teams-tab": {
        location: "centreus",
        storageResourceId:
          "/subscriptions/mockSid/resourceGroups/jay-texas/providers/Microsoft.Storage/storageAccounts/testaccount",
        endpoint: "https://testaccount.azurewebsites.net",
      },
    };
    const teamsTab = Container.get("teams-tab") as any;
    const addTabRes = await teamsTab.add(context, inputs);
    if (addTabRes.isErr()) {
      console.log(addTabRes.error);
    }
    assert.isTrue(addTabRes.isOk());
    const azureStorage = Container.get<AzureStorageResource>(ComponentNames.AzureStorage);
    const res = await azureStorage.deploy(context as ResourceContextV3, inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
  });

  it("fx.deploy.cli.withAAD", async () => {
    sandbox.stub(tools.ui, "showMessage").resolves(ok("Confirm"));
    const mockedEnvRestore = mockedEnv({
      SWITCH_ACCOUNT: "false",
      TEAMSFX_AAD_MANIFEST: "true",
    });
    sandbox.stub(templateAction, "scaffoldFromTemplates").resolves();
    sandbox.stub(tools.tokenProvider.m365TokenProvider, "getAccessToken").resolves(ok("fakeToken"));
    sandbox
      .stub(tools.tokenProvider.m365TokenProvider, "getJsonObject")
      .resolves(ok({ tid: "mockTid" }));
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getAccountCredentialAsync")
      .resolves(TestHelper.fakeCredential);
    sandbox
      .stub(provisionUtils, "fillInAzureConfigs")
      .resolves(ok({ hasSwitchedSubscription: false }));
    sandbox.stub(provisionUtils, "askForProvisionConsent").resolves(ok(Void));
    sandbox.stub(AppStudioClient, "getApp").onFirstCall().throws({}).onSecondCall().resolves({});
    sandbox.stub(AppStudioClient, "importApp").resolves({ teamsAppId: "mockTeamsAppId" });
    sandbox.stub(AADRegistration, "registerAADAppAndGetSecretByGraph").resolves({
      clientId: "00000000-0000-0000-0000-000000000000",
      clientSecret: "mockClientSecret",
      objectId: "00000000-0000-0000-0000-000000000000",
    });
    sandbox.stub(arm, "deployArmTemplates").resolves(ok(undefined));
    sandbox.stub(deployUtils, "checkDeployAzureSubscription").resolves(ok({}));
    sandbox.stub(AadApp.prototype, "provision").resolves(ok(undefined));
    sandbox.stub(AadApp.prototype, "setApplicationInContext").resolves(ok(undefined));
    sandbox.stub(AadApp.prototype, "configure").resolves(ok(undefined));
    sandbox.stub(AadApp.prototype, "deploy").resolves(ok(undefined));
    sandbox.stub(questionV3, "getQuestionsForDeployV3").resolves(ok(undefined));

    const appName = `unittest${randomAppName()}`;
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      features: "Bot",
      language: "typescript",
      "app-name": appName,
      folder: path.join(os.homedir(), "TeamsApps"),
    };
    const initRes = await fx.init(context, inputs);
    if (initRes.isErr()) {
      console.log(initRes.error);
    }

    assert.isTrue(initRes.isOk());
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
      [ComponentNames.AadApp]: {
        clientId: "00000000-0000-0000-0000-000000000000",
        applicationIdUris: "https://abc.com",
      },
      [ComponentNames.TeamsBot]: {
        botId: "00000000-0000-0000-0000-000000000000",
        domain: "abc.com",
      },
    };

    const component = Container.get("teams-bot") as any;
    const addBotRes = await component.add(context, inputs);
    if (addBotRes.isErr()) {
      console.log(addBotRes.error);
    }
    assert.isTrue(addBotRes.isOk());

    const ssoComponent = Container.get(ComponentNames.SSO) as any;
    const ssoRes = await ssoComponent.add(context, inputs);
    if (ssoRes.isErr()) {
      console.log(ssoRes.error);
    }
    assert.isTrue(ssoRes.isOk());

    const provisionRes = await fx.provision(context as ResourceContextV3, inputs);
    if (provisionRes.isErr()) {
      console.log(provisionRes.error);
    }
    assert.isTrue(provisionRes.isOk());

    {
      inputs[Constants.INCLUDE_AAD_MANIFEST] = "yes";
      inputs.platform = Platform.CLI;
      inputs[AzureSolutionQuestionNames.PluginSelectionDeploy] = [BuiltInFeaturePluginNames.aad];
      const deployRes = await fx.deploy(context as ResourceContextV3, inputs);
      if (deployRes.isErr()) {
        console.log(deployRes.error);
      }
      assert.isTrue(deployRes.isOk());
    }
    {
      inputs[Constants.INCLUDE_AAD_MANIFEST] = "no";
      inputs.platform = Platform.CLI;
      inputs[AzureSolutionQuestionNames.PluginSelectionDeploy] = [BuiltInFeaturePluginNames.aad];
      const deployRes = await fx.deploy(context as ResourceContextV3, inputs);
      if (deployRes.isErr()) {
        console.log(deployRes.error);
      }
      assert.isTrue(deployRes.isErr());
    }

    mockedEnvRestore();
  });

  it("fx.deployAadFromVscode", async () => {
    sandbox.stub(tools.ui, "showMessage").resolves(ok("Confirm"));
    const mockedEnvRestore = mockedEnv({
      SWITCH_ACCOUNT: "false",
      TEAMSFX_AAD_MANIFEST: "true",
    });
    sandbox.stub(templateAction, "scaffoldFromTemplates").resolves();
    sandbox.stub(tools.tokenProvider.m365TokenProvider, "getAccessToken").resolves(ok("fakeToken"));
    sandbox
      .stub(tools.tokenProvider.m365TokenProvider, "getJsonObject")
      .resolves(ok({ tid: "mockTid" }));
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getAccountCredentialAsync")
      .resolves(TestHelper.fakeCredential);
    sandbox
      .stub(provisionUtils, "fillInAzureConfigs")
      .resolves(ok({ hasSwitchedSubscription: false }));
    sandbox.stub(provisionUtils, "askForProvisionConsent").resolves(ok(Void));
    sandbox.stub(AppStudioClient, "getApp").onFirstCall().throws({}).onSecondCall().resolves({});
    sandbox.stub(AppStudioClient, "importApp").resolves({ teamsAppId: "mockTeamsAppId" });
    sandbox.stub(AADRegistration, "registerAADAppAndGetSecretByGraph").resolves({
      clientId: "00000000-0000-0000-0000-000000000000",
      clientSecret: "mockClientSecret",
      objectId: "00000000-0000-0000-0000-000000000000",
    });
    sandbox.stub(arm, "deployArmTemplates").resolves(ok(undefined));
    sandbox.stub(deployUtils, "checkDeployAzureSubscription").resolves(ok({}));
    sandbox.stub(AadApp.prototype, "provision").resolves(ok(undefined));
    sandbox.stub(AadApp.prototype, "setApplicationInContext").resolves(ok(undefined));
    sandbox.stub(AadApp.prototype, "configure").resolves(ok(undefined));
    sandbox.stub(AadApp.prototype, "deploy").resolves(ok(undefined));

    const appName = `unittest${randomAppName()}`;
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      [AzureSolutionQuestionNames.Features]: "Bot",
      language: "typescript",
      "app-name": appName,
      folder: path.join(os.homedir(), "TeamsApps"),
    };
    const initRes = await fx.init(context, inputs);
    if (initRes.isErr()) {
      console.log(initRes.error);
    }
    assert.isTrue(initRes.isOk());
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
      [ComponentNames.AadApp]: {
        clientId: "00000000-0000-0000-0000-000000000000",
        applicationIdUris: "https://abc.com",
      },
      [ComponentNames.TeamsBot]: {
        botId: "00000000-0000-0000-0000-000000000000",
        domain: "abc.com",
      },
    };

    const component = Container.get("teams-bot") as any;
    const addBotRes = await component.add(context, inputs);
    if (addBotRes.isErr()) {
      console.log(addBotRes.error);
    }
    assert.isTrue(addBotRes.isOk());

    const ssoComponent = Container.get(ComponentNames.SSO) as any;
    const ssoRes = await ssoComponent.add(context, inputs);
    if (ssoRes.isErr()) {
      console.log(ssoRes.error);
    }
    assert.isTrue(ssoRes.isOk());

    const provisionRes = await fx.provision(context as ResourceContextV3, inputs);
    if (provisionRes.isErr()) {
      console.log(provisionRes.error);
    }
    assert.isTrue(provisionRes.isOk());

    inputs[Constants.INCLUDE_AAD_MANIFEST] = "yes";
    inputs.platform = Platform.VSCode;
    const deployRes = await fx.deploy(context as ResourceContextV3, inputs);
    if (deployRes.isErr()) {
      console.log(deployRes.error);
    }
    assert.isTrue(deployRes.isOk());
    mockedEnvRestore();
  });
  it("getParameterJsonV3", async () => {
    const str = `{
      "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {
        "provisionParameters": {
          "value": {
            "botAadAppClientId": "{{state.fx-resource-bot.botId}}",
            "resourceBaseName": "hjv3bot081017c1b"
          }
        }
      }
    }`;
    sandbox.stub(fs, "readFile").resolves(str as any);
    sandbox.stub(fs, "stat").resolves();
    const envInfo = newEnvInfoV3();
    envInfo.state[ComponentNames.TeamsBot] = {
      botId: "MockID",
    };
    const context = createContextV3();
    context.projectSetting.components = [
      {
        name: ComponentNames.TeamsBot,
      },
    ];
    context.envInfo = envInfo;
    const json = await armFunctions.getParameterJsonV3(context, "", envInfo);
    assert.isTrue(json.parameters.provisionParameters.value.botAadAppClientId === "MockID");
  });
});
