// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import "mocha";
import { createSandbox } from "sinon";
import { setTools } from "../../../../src/core/globalVars";
import {
  MockAzureAccountProvider,
  MockLogProvider,
  MockTelemetryReporter,
  MockTools,
  MockUserInteraction,
} from "../../../core/utils";
import { MockedM365Provider, MyTokenCredential } from "../../../plugins/solution/util";
import { ArmDeployDriver } from "../../../../src/component/driver/arm/deploy";
import fs from "fs-extra";
import * as cpUtils from "../../../../src/common/cpUtils";
import { ArmDeployImpl } from "../../../../src/component/driver/arm/deployImpl";
import { ok } from "@microsoft/teamsfx-api";
import * as bicepChecker from "../../../../src/component/utils/depsChecker/bicepChecker";
import axios from "axios";
import { getAbsolutePath } from "../../../../src/component/utils/common";
import { convertOutputs, getFileExtension } from "../../../../src/component/driver/arm/util/util";
import { handleArmDeploymentError } from "../../../../src/component/arm";
import { ActionResult } from "../../../../src/component/driver/util/wrapUtil";
import {
  CompileBicepError,
  DeployArmError,
  GetArmDeploymentError,
} from "../../../../src/error/arm";
import { ResourceGroupNotExistError } from "../../../../src/error/azure";
import { ResourceManagementClient } from "@azure/arm-resources";
import arm from "../../../../src/component/arm";

describe("Arm driver deploy", () => {
  const sandbox = createSandbox();
  const tools = new MockTools();
  setTools(tools);
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
    azureAccountProvider: new MockAzureAccountProvider(),
    telemetryReporter: new MockTelemetryReporter(),
    ui: new MockUserInteraction(),
    logProvider: new MockLogProvider(),
    projectPath: "./",
  };
  const driver = new ArmDeployDriver();

  const bicepCliVersion = "v0.9.1";
  beforeEach(() => {});

  afterEach(() => {
    sandbox.restore();
  });

  for (const actionMethod of ["run", "execute"]) {
    it(`happy path for ${actionMethod}`, async () => {
      sandbox.stub(fs, "readFile").resolves("{}" as any);
      sandbox.stub(cpUtils, "executeCommand").resolves("{}" as any);
      const deployRes = ok({
        mockKey: {
          type: "string",
          value: "mockValue",
        },
      });
      sandbox.stub(ArmDeployImpl.prototype, "executeDeployment").resolves(deployRes as any);
      sandbox.stub(bicepChecker, "ensureBicepForDriver").resolves("bicep");
      const fakeAxiosInstance = axios.create();
      sandbox.stub(axios, "create").returns(fakeAxiosInstance);
      sandbox.stub(fakeAxiosInstance, "get").resolves({
        status: 200,
        data: "",
      });
      let res: ActionResult;
      let deployArgs = {
        subscriptionId: "00000000-0000-0000-0000-000000000000",
        resourceGroupName: "mock-group",
        bicepCliVersion: bicepCliVersion,
        templates: [
          {
            path: "mock-template.bicep",
            parameters: "mock-parameters.json",
            deploymentName: "mock-deployment",
          },
          {
            path: "mock-template2.json",
            deploymentName: "mock-deployment2",
          },
          {
            path: "mock-template3.json",
            parameters: "mock-parameters3.json",
            deploymentName: "mock-deployment3",
          },
        ],
      };

      res = await driver.run(deployArgs, mockedDriverContext);
      assert.isTrue(res.isOk());

      deployArgs = {
        subscriptionId: "00000000-0000-0000-0000-000000000000",
        resourceGroupName: "mock-group",
        bicepCliVersion: "",
        templates: [
          {
            path: "mock-template.json",
            parameters: "mock-parameters.json",
            deploymentName: "mock-deployment",
          },
        ],
      };
      if (actionMethod === "run") {
        res = await driver.run(deployArgs, mockedDriverContext);
        assert.isTrue(res.isOk());
      } else {
        res = await driver.execute(deployArgs, mockedDriverContext);
        assert.isTrue(res.result.isOk());
      }
    });
  }

  it("invalid parameters", async () => {
    sandbox.stub(fs, "readFile").resolves("{}" as any);
    sandbox.stub(cpUtils, "executeCommand").resolves("{}" as any);
    let deployArgs = {
      subscriptionId: "",
      resourceGroupName: "",
      bicepCliVersion: "",
      templates: [
        {
          path: "mock-template",
          parameters: "mock-parameters",
          deploymentName: "",
        },
      ],
    } as any;
    let res = await driver.run(deployArgs, mockedDriverContext);
    assert.isTrue(res.isErr());

    deployArgs = {
      subscriptionId: "00000000-0000-0000-0000-000000000000",
      resourceGroupName: "mock-group",
      bicepCliVersion: "",
      templates: [],
    } as any;
    res = await driver.run(deployArgs, mockedDriverContext);
    assert.isTrue(res.isErr());

    deployArgs = {
      subscriptionId: "00000000-0000-0000-0000-000000000000",
      resourceGroupName: "mock-group",
      bicepCliVersion: "",
      templates: [
        {
          path: "C:/mock-template",
          parameters: "",
          deploymentName: "",
        },
      ],
    } as any;
    res = await driver.run(deployArgs, mockedDriverContext);
    assert.isTrue(res.isErr());
  });

  it("deploy error", async () => {
    sandbox.stub(fs, "readFile").resolves("{}" as any);
    sandbox.stub(cpUtils, "executeCommand").resolves("{}" as any);
    sandbox
      .stub(ArmDeployImpl.prototype, "innerExecuteDeployment")
      .rejects(new Error("mocked deploy error"));
    sandbox.stub(bicepChecker, "getAvailableBicepVersions").resolves([bicepCliVersion]);
    sandbox.stub(ArmDeployImpl.prototype, "ensureBicepCli").resolves();
    const deployArgs = {
      subscriptionId: "00000000-0000-0000-0000-000000000000",
      resourceGroupName: "mock-group",
      bicepCliVersion: bicepCliVersion,
      templates: [
        {
          path: "mock-template.bicep",
          parameters: "mock-parameters.json",
          deploymentName: "mock-deployment",
        },
        {
          path: "mock-template2.json",
          parameters: "mock-parameters2.json",
          deploymentName: "mock-deployment2",
        },
      ],
    };

    const res = await driver.run(deployArgs, mockedDriverContext);
    assert.isTrue(res.isErr());
  });

  it("error handle", async () => {
    sandbox.stub(ArmDeployImpl.prototype, "run").throws("mocked deploy error");

    const res = await driver.run({} as any, mockedDriverContext);
    assert.isTrue(res.isErr());
  });
});

describe("util test", () => {
  const sandbox = createSandbox();
  const tools = new MockTools();
  setTools(tools);
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
    azureAccountProvider: new MockAzureAccountProvider(),
    telemetryReporter: new MockTelemetryReporter(),
    ui: new MockUserInteraction(),
    logProvider: new MockLogProvider(),
    projectPath: "./",
  };
  const driver = new ArmDeployDriver();

  const bicepCliVersion = "v0.9.1";
  beforeEach(() => {});

  afterEach(() => {
    sandbox.restore();
  });

  it("getAbsolutePath empty", () => {
    const relativeOrAbsolutePath = undefined;
    const projectPath = undefined;
    const res = getAbsolutePath(
      relativeOrAbsolutePath as unknown as string,
      projectPath as unknown as string
    );
    assert.equal(res, ".");
  });

  it("getAbsolutePath empty", () => {
    const relativeOrAbsolutePath = undefined;
    const projectPath = undefined;
    const res = getAbsolutePath(
      relativeOrAbsolutePath as unknown as string,
      projectPath as unknown as string
    );
    assert.equal(res, ".");
  });

  it("getAbsolutePath absolute path", () => {
    const relativeOrAbsolutePath = "C:/a";
    const projectPath = "";
    const res = getAbsolutePath(relativeOrAbsolutePath, projectPath);
    assert.equal(relativeOrAbsolutePath, res);
  });

  it("getFileExtension empty", () => {
    const res = getFileExtension("");
    assert.isEmpty(res);
  });

  it("convert output", () => {
    const mockOutput = [
      {
        tabOutput: {
          type: "Object",
          value: {
            keyA: {
              type: "string",
              value: "valueA",
            },
            KeyB: 1,
          },
        },
      },
    ];
    const res = convertOutputs(mockOutput);
    assert.isNotEmpty(res);
  });

  it("handleArmDeploymentError case 1", async () => {
    let mockError = {
      code: "InvalidTemplateDeployment",
      message:
        "The template deployment 'Create-resources-for-tab' is not valid according to the validation procedure. The tracking id is '7da4fab7-ed36-4abc-9772-e2f90a0587a4'. See inner errors for details.",
      details: {
        error: {
          code: "ValidationForResourceFailed",
          message:
            "Validation failed for a resource. Check 'Error.Details[0]' for more information.",
          details: [
            {
              code: "MaxNumberOfServerFarmsInSkuPerSubscription",
              message: "The maximum number of Free ServerFarms allowed in a Subscription is 10.",
            },
          ],
        },
      },
    };

    let res = await handleArmDeploymentError(mockError, {
      ctx: { logProvider: new MockLogProvider() },
      deploymentName: "mockDeployName",
      resourceGroupName: "mockRG",
    } as any);
    assert.isTrue(res.isErr());

    mockError = {
      code: "InvalidTemplateDeployment",
      message:
        "The template deployment 'Create-resources-for-tab' is not valid according to the validation procedure. The tracking id is '7da4fab7-ed36-4abc-9772-e2f90a0587a4'. See inner errors for details.",
      details: {
        code: "ValidationForResourceFailed",
        message: "Validation failed for a resource. Check 'Error.Details[0]' for more information.",
        details: [
          {
            code: "MaxNumberOfServerFarmsInSkuPerSubscription",
            message: "The maximum number of Free ServerFarms allowed in a Subscription is 10.",
          },
        ],
      },
    } as any;
    res = await handleArmDeploymentError(mockError, {
      ctx: { logProvider: new MockLogProvider() },
      deploymentName: "mockDeployName",
      resourceGroupName: "mockRG",
    } as any);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.isTrue(res.error instanceof DeployArmError);
    }

    mockError = {
      code: "ResourceGroupNotFound",
      message:
        "The template deployment 'Create-resources-for-tab' is not valid according to the validation procedure. The tracking id is '7da4fab7-ed36-4abc-9772-e2f90a0587a4'. See inner errors for details.",
      details: {
        code: "ValidationForResourceFailed",
        message: "Validation failed for a resource. Check 'Error.Details[0]' for more information.",
        details: [
          {
            code: "MaxNumberOfServerFarmsInSkuPerSubscription",
            message: "The maximum number of Free ServerFarms allowed in a Subscription is 10.",
          },
        ],
      },
    } as any;
    res = await handleArmDeploymentError(mockError, {
      ctx: { logProvider: new MockLogProvider() },
      deploymentName: "mockDeployName",
      resourceGroupName: "mockRG",
      client: { subscriptionId: "mockSubId" },
    } as any);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.isTrue(res.error instanceof ResourceGroupNotExistError);
    }
  });

  it("handleArmDeploymentError case 2: no deploymentError", async () => {
    const client = new ResourceManagementClient(new MyTokenCredential(), "id");
    sandbox.stub(client.deployments, "get").resolves({});
    const mockError = {
      code: "OtherCode",
      message:
        "The template deployment 'Create-resources-for-tab' is not valid according to the validation procedure. The tracking id is '7da4fab7-ed36-4abc-9772-e2f90a0587a4'. See inner errors for details.",
    };
    const res = await handleArmDeploymentError(mockError, {
      ctx: { logProvider: new MockLogProvider() },
      deploymentName: "mockDeployName",
      resourceGroupName: "mockRG",
      client: client,
    } as any);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.isTrue(res.error instanceof DeployArmError);
    }
  });

  it("handleArmDeploymentError case 3: getDeploymentError without subErrors", async () => {
    const client = new ResourceManagementClient(new MyTokenCredential(), "id");
    sandbox.stub(arm, "wrapGetDeploymentError").resolves(
      ok({
        error: {
          code: "MockError",
          message: "MockErrorMessage",
        },
      })
    );
    const mockError = {
      code: "RawMockError",
      message: "RawMockErrorMessasge",
    };
    const res = await handleArmDeploymentError(mockError, {
      ctx: { logProvider: new MockLogProvider() },
      deploymentName: "mockDeployName",
      resourceGroupName: "mockRG",
      client: client,
    } as any);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.isTrue(res.error instanceof DeployArmError);
    }
  });

  it("handleArmDeploymentError case 4: getDeploymentError with subErrors", async () => {
    const client = new ResourceManagementClient(new MyTokenCredential(), "id");
    sandbox.stub(arm, "wrapGetDeploymentError").resolves(ok({ subErrors: { module1: "value1" } }));
    const mockError = {
      code: "RawMockError",
      message: "RawMockErrorMessasge",
    };
    const res = await handleArmDeploymentError(mockError, {
      ctx: { logProvider: new MockLogProvider() },
      deploymentName: "mockDeployName",
      resourceGroupName: "mockRG",
      client: client,
    } as any);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.isTrue(res.error instanceof DeployArmError);
    }
  });

  it("handleArmDeploymentError case 5: getDeploymentError throws error", async () => {
    const client = new ResourceManagementClient(new MyTokenCredential(), "id");
    sandbox
      .stub(arm, "getDeploymentError")
      .throws({ code: "GetDeploymentError", message: "GetDeploymentErrorMessage" });
    const mockError = {
      code: "RawMockError",
      message: "RawMockErrorMessasge",
    };
    const res = await handleArmDeploymentError(mockError, {
      ctx: { logProvider: new MockLogProvider() },
      deploymentName: "mockDeployName",
      resourceGroupName: "mockRG",
      client: client,
    } as any);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.isTrue(res.error instanceof GetArmDeploymentError);
    }
  });

  it("deployTemplate throw FxError", async () => {
    const deployArgs = {
      subscriptionId: "00000000-0000-0000-0000-000000000000",
      resourceGroupName: "mock-group",
      bicepCliVersion: "",
      templates: [],
    } as any;
    const impl = new ArmDeployImpl(deployArgs, mockedDriverContext);
    sandbox
      .stub(impl, "getDeployParameters")
      .throws(new CompileBicepError(".", new Error("compile error")));
    mockedDriverContext.createProgressBar = () => {};
    const res = await impl.deployTemplate({
      path: "",
      parameters: "",
      deploymentName: "mkdpn",
    });
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.isTrue(res.error instanceof CompileBicepError);
    }
  });

  it("deployTemplate throw none FxError", async () => {
    const deployArgs = {
      subscriptionId: "00000000-0000-0000-0000-000000000000",
      resourceGroupName: "mock-group",
      bicepCliVersion: "",
      templates: [],
    } as any;
    mockedDriverContext.createProgressBar = () => {};
    const impl = new ArmDeployImpl(deployArgs, mockedDriverContext);
    sandbox.stub(impl, "getDeployParameters").throws(new Error("compile error"));
    const res = await impl.deployTemplate({
      path: "",
      parameters: "",
      deploymentName: "mkdpn",
    });
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.isTrue(res.error instanceof DeployArmError);
    }
  });

  it("compileBicepToJson throw Error", async () => {
    const deployArgs = {
      subscriptionId: "00000000-0000-0000-0000-000000000000",
      resourceGroupName: "mock-group",
      bicepCliVersion: "",
      templates: [],
    } as any;
    mockedDriverContext.createProgressBar = () => {};
    sandbox.stub(cpUtils, "executeCommand").throws(new Error("compile error"));
    const impl = new ArmDeployImpl(deployArgs, mockedDriverContext);
    try {
      await impl.compileBicepToJson("");
      assert.fail("should not reach here");
    } catch (e) {
      assert.isTrue(e instanceof CompileBicepError);
    }
  });
});
