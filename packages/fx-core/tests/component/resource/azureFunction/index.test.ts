// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { createContextV3 } from "../../../../src/component/utils";
import { MockTools, randomAppName } from "../../../core/utils";
import { setTools } from "../../../../src/core/globalVars";
import { createSandbox } from "sinon";
import {
  ContextV3,
  InputsWithProjectPath,
  Platform,
  ResourceContextV3,
} from "@microsoft/teamsfx-api";
import path from "path";
import fs from "fs-extra";
import * as os from "os";
import { AzureFunctionResource } from "../../../../src/component/resource/azureAppService/azureFunction";
import { AzureClientFactory } from "../../../../src/component/resource/azureAppService/azureLibs";
import { assign, merge } from "lodash";
import * as hostingUtils from "../../../../src/common/azure-hosting/utils";
import { AzureOperations } from "../../../../src/common/azure-hosting/azureOps";
import * as utils from "../../../../src/component/resource/azureAppService/common";
import { APIMOutputs, ComponentNames, Scenarios } from "../../../../src/component/constants";
import { newEnvInfoV3 } from "../../../../src/core/environment";
import { PreconditionError } from "../../../../src/component/error";

chai.use(chaiAsPromised);

describe("Azure-Function Component", () => {
  const tools = new MockTools();
  const sandbox = createSandbox();
  const component = new AzureFunctionResource();
  const appName = `unittest${randomAppName()}`;
  const projectPath = path.join(os.homedir(), "TeamsApps", appName);
  const inputs: InputsWithProjectPath = {
    projectPath: projectPath,
    platform: Platform.VSCode,
    "app-name": appName,
  };
  let context: ContextV3;
  setTools(tools);

  beforeEach(async () => {
    context = createContextV3();
    context.projectSetting.components.push({
      name: ComponentNames.Function,
      scenario: Scenarios.Api,
      provision: true,
      connections: [],
    });
    context.envInfo = newEnvInfoV3();
    assign(context.envInfo, {
      state: {
        [ComponentNames.TeamsApi]: {
          [component.outputs.resourceId.key]:
            "/subscriptions/subs/resourceGroups/rg/providers/Microsoft.Web/sites/siteName/appServices",
        },
      },
    });
  });
  afterEach(() => {
    sandbox.restore();
  });

  it("skip configure when local", async function () {
    context.envInfo = newEnvInfoV3("local");
    const configureAction = await component.configure(context as ResourceContextV3, inputs);
    chai.assert.isTrue(configureAction.isOk());
  });

  it("skip configure when no apim", async function () {
    const configureAction = await component.configure(context as ResourceContextV3, inputs);
    chai.assert.isTrue(configureAction.isOk());
  });

  it("configure happy path", async function () {
    context.projectSetting.components = [
      {
        name: ComponentNames.Function,
        scenario: Scenarios.Api,
        provision: true,
        connections: [ComponentNames.APIM],
      },
    ];
    merge(context.envInfo?.state, {
      [ComponentNames.APIM]: {
        [APIMOutputs.apimClientAADClientId.key]: "clientId",
      },
    });
    context.tokenProvider = {
      azureAccountProvider: {
        getAccountCredentialAsync: async () => ({} as any),
      } as any,
    } as any;
    sandbox.stub(AzureClientFactory, "getWebSiteManagementClient").returns({
      webApps: {
        listApplicationSettings: (rgName: string, siteName: string) => ({
          properties: [{ name: "", value: "" }],
        }),
        listByResourceGroup: (rgName: string) => [{ name: "siteName" }],
        update: (rgName: string, siteName: string, site: any) => ({}),
      } as any,
    } as any);
    const configureAction = await component.configure(context as ResourceContextV3, inputs);
    chai.assert.isTrue(configureAction.isOk());
  });

  it("generateBicep happy path", async function () {
    const generateBicepAction = await component.generateBicep(context, inputs);
    chai.assert.isTrue(generateBicepAction.isOk());
  });
  it("deploy happy path", async function () {
    sandbox.stub(fs, "pathExists").resolves(true);
    const restartWebAppStub = sandbox.stub(AzureOperations, "restartWebApp").resolves();
    sandbox.stub(utils, "zipFolderAsync").resolves({} as any);
    sandbox.stub(hostingUtils, "azureWebSiteDeploy").resolves({} as any);
    assign(inputs, {
      componentId: ComponentNames.TeamsApi,
      hosting: inputs.hosting,
      scenario: Scenarios.Api,
      folder: "api",
      artifactFolder: "api",
    });
    const deployAction = await component.deploy(context as ResourceContextV3, inputs);
    const res = restartWebAppStub.calledOnce;
    chai.assert.isTrue(res);
    chai.assert.isTrue(deployAction.isOk());
  });
  it("deploy happy path for bot", async function () {
    sandbox.stub(fs, "pathExists").resolves(true);
    const restartWebAppStub = sandbox.stub(AzureOperations, "restartWebApp").resolves();
    sandbox.stub(utils, "zipFolderAsync").resolves({} as any);
    sandbox.stub(hostingUtils, "azureWebSiteDeploy").resolves({} as any);
    assign(inputs, {
      componentId: ComponentNames.TeamsBot,
      hosting: inputs.hosting,
      scenario: Scenarios.Bot,
      folder: "bot",
      artifactFolder: "bot",
    });
    assign(context.envInfo, {
      state: {
        [ComponentNames.TeamsBot]: {
          resourceId:
            "/subscriptions/subs/resourceGroups/rg/providers/Microsoft.Web/sites/siteName/appServices",
        },
      },
    });
    const deployAction = await component.deploy(context as ResourceContextV3, inputs);
    const res = restartWebAppStub.calledOnce;
    chai.assert.isTrue(res);
    chai.assert.isTrue(deployAction.isOk());
  });

  it("deploy happy path with bot web app resource id", async function () {
    sandbox.stub(fs, "pathExists").resolves(true);
    const restartWebAppStub = sandbox.stub(AzureOperations, "restartWebApp").resolves();
    sandbox.stub(utils, "zipFolderAsync").resolves({} as any);
    sandbox.stub(hostingUtils, "azureWebSiteDeploy").resolves({} as any);
    assign(inputs, {
      componentId: ComponentNames.TeamsBot,
      hosting: inputs.hosting,
      scenario: Scenarios.Bot,
      folder: "bot",
      artifactFolder: "bot",
    });
    assign(context.envInfo, {
      state: {
        [ComponentNames.TeamsBot]: {
          botWebAppResourceId:
            "/subscriptions/subs/resourceGroups/rg/providers/Microsoft.Web/sites/siteName/appServices",
        },
      },
    });
    const deployAction = await component.deploy(context as ResourceContextV3, inputs);
    const res = restartWebAppStub.calledOnce;
    chai.assert.isTrue(res);
    chai.assert.isTrue(deployAction.isOk());
  });

  it("deploy happy path with output resource id", async function () {
    sandbox.stub(fs, "pathExists").resolves(true);
    const restartWebAppStub = sandbox.stub(AzureOperations, "restartWebApp").resolves();
    sandbox.stub(utils, "zipFolderAsync").resolves({} as any);
    sandbox.stub(hostingUtils, "azureWebSiteDeploy").resolves({} as any);
    assign(inputs, {
      componentId: ComponentNames.TeamsBot,
      hosting: inputs.hosting,
      scenario: Scenarios.Bot,
      folder: "bot",
      artifactFolder: "bot",
    });
    assign(context.envInfo, {
      state: {
        [ComponentNames.TeamsBot]: {
          functionAppResourceId:
            "/subscriptions/subs/resourceGroups/rg/providers/Microsoft.Web/sites/siteName/appServices",
        },
      },
    });
    const deployAction = await component.deploy(context as ResourceContextV3, inputs);
    const res = restartWebAppStub.calledOnce;
    chai.assert.isTrue(res);
    chai.assert.isTrue(deployAction.isOk());
  });

  it("deploy bot precondition error", async function () {
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(AzureOperations, "restartWebApp").resolves();
    sandbox.stub(utils, "zipFolderAsync").resolves({} as any);
    sandbox.stub(hostingUtils, "azureWebSiteDeploy").resolves({} as any);
    assign(inputs, {
      componentId: ComponentNames.TeamsBot,
      hosting: inputs.hosting,
      scenario: Scenarios.Bot,
      folder: "bot",
      artifactFolder: "bot",
    });
    assign(context.envInfo, {
      state: {
        [ComponentNames.TeamsBot]: {},
      },
    });

    let foundError = false;
    try {
      await component.deploy(context as ResourceContextV3, inputs);
    } catch (e) {
      chai.assert.isTrue(e instanceof PreconditionError);
      foundError = true;
    }
    chai.assert.isTrue(foundError);
  });
});
