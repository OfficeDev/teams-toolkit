// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import "mocha";
import { createSandbox } from "sinon";
import { setTools } from "../../../../src/core/globalVars";
import { MockAzureAccountProvider, MockTools } from "../../../core/utils";
import { MockedM365Provider } from "../../../plugins/solution/util";
import { ArmDeployDriver } from "../../../../src/component/driver/arm/deploy";
import fs from "fs-extra";
import * as cpUtils from "../../../../src/common/cpUtils";
import { ArmDeployImpl } from "../../../../src/component/driver/arm/deployImpl";
import { ok } from "@microsoft/teamsfx-api";

describe("Arm driver deploy", () => {
  const sandbox = createSandbox();
  const tools = new MockTools();
  setTools(tools);
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
    azureAccountProvider: new MockAzureAccountProvider(),
  };
  const driver = new ArmDeployDriver();
  beforeEach(() => {});

  afterEach(() => {
    sandbox.restore();
  });

  it("happy path", async () => {
    sandbox.stub(fs, "readFile").resolves("{}" as any);
    sandbox.stub(cpUtils, "executeCommand").resolves("{}" as any);
    const deployRes = ok({
      mockKey: {
        type: "string",
        value: "mockValue",
      },
    });
    sandbox.stub(ArmDeployImpl.prototype, "executeDeployment").resolves(deployRes as any);
    const deployArgs = {
      subscriptionId: "00000000-0000-0000-0000-000000000000",
      resourceGroupName: "mock-group",
      bicepCliVersion: "0.4.8",
      templates: [
        {
          path: "mock-template.bicep",
          parameters: "mock-parameters.json",
          deploymentName: "mock-deployment",
        },
      ],
    };
    const res = await driver.run(deployArgs, mockedDriverContext);
    assert.isTrue(res.isOk());
  });
});
