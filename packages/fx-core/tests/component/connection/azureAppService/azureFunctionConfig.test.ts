// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { createContextV3 } from "../../../../src/component/utils";
import { MockTools, randomAppName } from "../../../core/utils";
import { setTools } from "../../../../src/core/globalVars";
import sinon from "sinon";
import { ContextV3, FunctionAction, InputsWithProjectPath, Platform } from "@microsoft/teamsfx-api";
import { newEnvInfoV3 } from "../../../../src";
import path from "path";
import * as os from "os";
import { AzureFunctionsConfig } from "../../../../src/component/connection/azureFunctionConfig";
import { ComponentNames } from "../../../../src/component/constants";

chai.use(chaiAsPromised);

describe("Azure-Function Connection", () => {
  const tools = new MockTools();
  const sandbox = sinon.createSandbox();
  const component = new AzureFunctionsConfig();
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
    context.projectSetting.components.push({
      name: component.requisite,
      connections: [ComponentNames.TeamsApi],
    });
  });
  afterEach(() => {
    sandbox.restore();
  });

  it("generateBicep happy path", async function () {
    inputs.componentName = "Api";
    const generateBicepAction = await component.generateBicep(context, inputs);
    chai.assert.isTrue(generateBicepAction.isOk());
    const action = generateBicepAction._unsafeUnwrap() as FunctionAction;
    const result = await action.execute(context, inputs);
    chai.assert.isTrue(result.isOk());
  });
});
