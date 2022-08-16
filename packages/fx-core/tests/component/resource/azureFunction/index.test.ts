// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { createContextV3 } from "../../../../src/component/utils";
import { MockTools, randomAppName } from "../../../core/utils";
import { setTools } from "../../../../src/core/globalVars";
import sinon from "sinon";
import {
  ContextV3,
  InputsWithProjectPath,
  Platform,
  ResourceContextV3,
} from "@microsoft/teamsfx-api";
import { newEnvInfoV3 } from "../../../../src";
import path from "path";
import fs from "fs-extra";
import * as os from "os";
import { AzureFunctionResource } from "../../../../src/component/resource/azureAppService/azureFunction";
import { assign } from "lodash";
import * as hostingUtils from "../../../../src/common/azure-hosting/utils";
import { AzureOperations } from "../../../../src/common/azure-hosting/azureOps";

chai.use(chaiAsPromised);

describe("Azure-Function Component", () => {
  const tools = new MockTools();
  const sandbox = sinon.createSandbox();
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
    context.envInfo = newEnvInfoV3();
  });
  afterEach(() => {
    sandbox.restore();
  });

  it("configure happy path", async function () {
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
    context.projectSetting.components.push({
      name: "function",
      scenario: "api",
    });
    assign(context.envInfo, {
      state: {
        ["function"]: {
          [component.outputs.resourceId.key]:
            "/subscriptions/subs/resourceGroups/rg/providers/Microsoft.Web/sites/siteName/appServices",
        },
      },
    });
    assign(inputs, {
      componentId: "function",
      hosting: inputs.hosting,
      scenario: "api",
      folder: "api",
      artifactFolder: "api",
    });
    const deployAction = await component.deploy(context as ResourceContextV3, inputs);
    const res = restartWebAppStub.calledOnce;
    chai.assert.isTrue(res);
    chai.assert.isTrue(deployAction.isOk());
    chai.assert.isTrue(true);
  });
});
