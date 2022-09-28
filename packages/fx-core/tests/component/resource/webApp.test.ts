// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { createContextV3 } from "../../../src/component/utils";
import { MockTools, randomAppName } from "../../core/utils";
import { setTools } from "../../../src/core/globalVars";
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
import { assign } from "lodash";
import * as hostingUtils from "../../../src/common/azure-hosting/utils";
import { AzureOperations } from "../../../src/common/azure-hosting/azureOps";
import * as utils from "../../../src/component/resource/azureAppService/common";
import { ComponentNames, Scenarios } from "../../../src/component/constants";
import { newEnvInfoV3 } from "../../../src/core/environment";
import { AzureWebAppResource } from "../../../src/component/resource/azureAppService/azureWebApp";

chai.use(chaiAsPromised);

describe("Azure-Function Component", () => {
  const tools = new MockTools();
  const sandbox = createSandbox();
  const component = new AzureWebAppResource();
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
      name: ComponentNames.TeamsBot,
      scenario: Scenarios.Bot,
      provision: true,
      connections: [],
    });
    context.envInfo = newEnvInfoV3();
    assign(context.envInfo, {
      state: {
        [ComponentNames.TeamsBot]: {
          [component.outputs.resourceId.key]:
            "/subscriptions/subs/resourceGroups/rg/providers/Microsoft.Web/sites/siteName/appServices",
        },
      },
    });
  });
  afterEach(() => {
    sandbox.restore();
  });
  it("deploy happy path", async function () {
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
        [ComponentNames.TeamsBot]: {
          resourceId:
            "/subscriptions/subs/resourceGroups/rg/providers/Microsoft.Web/sites/siteName/appServices",
        },
      },
    });
    const deployAction = await component.deploy(context as ResourceContextV3, inputs);
    chai.assert.isTrue(deployAction.isOk());
  });
});
