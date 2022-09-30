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
  ActionContext,
  ContextV3,
  InputsWithProjectPath,
  Platform,
  ResourceContextV3,
} from "@microsoft/teamsfx-api";
import path from "path";
import * as os from "os";
import { assign } from "lodash";
import { ComponentNames, Scenarios } from "../../../../src/component/constants";
import { newEnvInfoV3 } from "../../../../src/core/environment";
import { AzureStorageResource } from "../../../../src/component/resource/azureStorage/azureStorage";
import { AzureStorageClient } from "../../../../src/component/resource/azureStorage/clients";
import { assert } from "chai";
import { FrontendDeployment } from "../../../../src/component/code/tab/deploy";

chai.use(chaiAsPromised);

describe("Azure-Storage Component", () => {
  const tools = new MockTools();
  const sandbox = createSandbox();
  const component = new AzureStorageResource();
  const appName = `unittest${randomAppName()}`;
  const projectPath = path.join(os.homedir(), "TeamsApps", appName);
  const inputs: InputsWithProjectPath = {
    projectPath: projectPath,
    platform: Platform.VSCode,
    "app-name": appName,
  };
  let context: ContextV3;
  let actionContext: ActionContext;
  setTools(tools);

  beforeEach(async () => {
    context = createContextV3();
    context.projectSetting.components.push({
      name: ComponentNames.TeamsTab,
      scenario: Scenarios.Tab,
      provision: true,
      connections: [],
    });
    context.envInfo = newEnvInfoV3("local");
    assign(context.envInfo, {
      state: {
        solution: {
          location: "test",
        },
        [ComponentNames.TeamsTab]: {
          [component.outputs.storageResourceId.key]:
            "/subscriptions/subs/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/storage",
        },
      },
    });
    actionContext = {
      progressBar: {
        start: async () => {},
        next: async () => {},
        end: async () => {},
      },
    };
  });
  afterEach(() => {
    sandbox.restore();
  });
  it("configure happy path", async function () {
    sandbox.stub(AzureStorageClient.prototype, "enableStaticWebsite").resolves();
    const res = await component.configure(context as ResourceContextV3, inputs, actionContext);
    assert.isTrue(res.isOk());
  });
  it("deploy happy path", async function () {
    sandbox.stub(FrontendDeployment, "needDeploy").resolves(true);
    sandbox.stub(AzureStorageClient.prototype, "getContainer").resolves();
    sandbox.stub(AzureStorageClient.prototype, "deleteAllBlobs").resolves();
    sandbox.stub(AzureStorageClient.prototype, "uploadFiles").resolves();
    const saveDeployInfo = sandbox.stub(FrontendDeployment, "saveDeploymentInfo").resolves();
    assign(inputs, {
      componentId: ComponentNames.TeamsTab,
      hosting: inputs.hosting,
      scenario: Scenarios.Tab,
      folder: "tabs",
      artifactFolder: "tabs/build",
    });
    const deployAction = await component.deploy(context as ResourceContextV3, inputs);
    assert.isTrue(deployAction.isOk());
    assert.isTrue(saveDeployInfo.calledOnce);
  });
  it("skip deploy", async function () {
    sandbox.stub(FrontendDeployment, "needDeploy").resolves(false);
    const saveDeployInfo = sandbox.stub(FrontendDeployment, "saveDeploymentInfo").resolves();
    assign(inputs, {
      componentId: ComponentNames.TeamsTab,
      hosting: inputs.hosting,
      scenario: Scenarios.Tab,
      folder: "tabs",
      artifactFolder: "tabs/build",
    });
    const deployAction = await component.deploy(context as ResourceContextV3, inputs);
    assert.isTrue(deployAction.isOk());
    assert.isTrue(saveDeployInfo.notCalled);
  });
});
