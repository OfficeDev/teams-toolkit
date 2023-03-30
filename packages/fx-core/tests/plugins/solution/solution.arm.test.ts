// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Err, FxError, ok, UserError, ContextV3, Platform } from "@microsoft/teamsfx-api";
import * as sinon from "sinon";
import fs from "fs-extra";
import {
  copyParameterJson,
  formattedDeploymentError,
  pollDeploymentStatus,
} from "../../../src/component/arm";
import * as arm from "../../../src/component/arm";
import path from "path";
import mockedEnv from "mocked-env";
import {
  Deployment,
  DeploymentExtended,
  DeploymentsCreateOrUpdateOptionalParams,
  ResourceManagementClient,
} from "@azure/arm-resources";
import * as tools from "../../../src/common/tools";
import { ErrorName, fileEncoding, SOLUTION_CONFIG_NAME, TestFilePath } from "../../constants";
import os from "os";
import "mocha";
import chai, { assert, expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { TestHelper } from "./helper";
import * as bicepChecker from "../../../src/component/utils/depsChecker/bicepChecker";
chai.use(chaiAsPromised);
import { MockedLogProvider } from "./util";
import { SolutionError } from "../../../src/component/constants";
import * as armResources from "@azure/arm-resources";
import { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
import { ComponentNames } from "../../../src/component/constants";

let mockedCtx: ContextV3;

class MyTokenCredential implements TokenCredential {
  async getToken(
    scopes: string | string[],
    options?: GetTokenOptions | undefined
  ): Promise<AccessToken | null> {
    return {
      token: "a.eyJ1c2VySWQiOiJ0ZXN0QHRlc3QuY29tIn0=.c",
      expiresOnTimestamp: 1234,
    };
  }
}

function getMockDeployments(mockedOutput?: any) {
  return {
    beginCreateOrUpdateAndWait: async function (
      resourceGroupName: string,
      deploymentName: string,
      parameters: Deployment,
      options?: DeploymentsCreateOrUpdateOptionalParams | undefined
    ): Promise<DeploymentExtended> {
      if (mockedOutput) {
        return {
          properties: {
            outputs: mockedOutput,
          },
        };
      } else {
        throw new Error("Function not implemented.");
      }
    },
  };
}

describe("Deploy ARM Template to Azure", () => {
  const mocker = sinon.createSandbox();
  // let mockedCtx: SolutionContext;
  let bicepCommand: string;
  const mockedArmTemplateOutput = {
    provisionOutput: {
      type: "Object",
      value: {
        frontendHostingOutput: {
          type: "Object",
          value: {
            teamsFxPluginId: ComponentNames.TeamsTab,
            frontendHostingOutputKey: TestHelper.frontendhostingOutputValue,
          },
        },
        identityOutput: {
          type: "Object",
          value: {
            teamsFxPluginId: ComponentNames.Identity,
            identityOutputKey: TestHelper.identityOutputValue,
          },
        },
      },
    },
  };

  beforeEach(async () => {
    mocker.stub(tools, "waitSeconds").resolves();
    mockedCtx = TestHelper.mockContextV3();
    mockedCtx.projectSetting.components = [
      { name: ComponentNames.TeamsTab },
      { name: ComponentNames.AadApp },
      { name: ComponentNames.Identity },
    ];
    mockedCtx.envInfo!.state[ComponentNames.AadApp] = {
      clientId: TestHelper.clientId,
      clientSecret: TestHelper.clientSecret,
    };
    await fs.ensureDir(TestHelper.rootDir);
    const configDir = path.join(TestHelper.rootDir, TestFilePath.configFolder);
    await fs.ensureDir(configDir);
    await fs.writeFile(
      path.join(configDir, TestFilePath.defaultParameterFileName),
      TestHelper.getParameterFileContent(
        {
          resourceBaseName: "{{state.solution.resourceBaseName}}",
          aadClientId: "{{state.fx-resource-aad-app-for-teams.clientId}}",
          aadClientSecret: "{{state.fx-resource-aad-app-for-teams.clientSecret}}",
          envValue: "{{$env.MOCKED_EXPAND_VAR_TEST}}",
        },
        {
          envValue2: "{{$env.MOCKED_EXPAND_VAR_TEST}}",
        }
      )
    );
    bicepCommand = await bicepChecker.ensureBicep(mockedCtx);
  });

  afterEach(async () => {
    mocker.restore();
    await fs.remove(TestHelper.rootDir);
  });

  it("should fail when main.bicep do not exist", async () => {
    mocker.stub(bicepChecker, "ensureBicep").resolves(bicepCommand);
    // Act
    const inputs = { platform: Platform.VSCode, projectPath: TestHelper.rootDir };
    const result = await arm.deployArmTemplatesV3(
      mockedCtx,
      inputs,
      mockedCtx.envInfo!,
      mockedCtx.tokenProvider!.azureAccountProvider
    );

    // Assert
    chai.assert.isTrue(result.isErr());
    const error = (result as Err<void, FxError>).error;
    chai.expect(error.name).to.equal(ErrorName.FailedToDeployArmTemplatesToAzureError);
    chai
      .expect(error.message)
      .to.have.string("Unable to compile Bicep files to JSON ARM templates file:");
  });

  it("should successfully update parameter and deploy arm templates to azure", async () => {
    TestHelper.mockArmDeploymentDependencies(mockedCtx, mocker);

    const envRestore = mockedEnv({
      MOCKED_EXPAND_VAR_TEST: TestHelper.envVariable,
    });

    const mockResourceManagementClient = new ResourceManagementClient(
      new MyTokenCredential(),
      "id"
    );
    mockResourceManagementClient.deployments = getMockDeployments(mockedArmTemplateOutput) as any;
    mocker.stub(armResources, "ResourceManagementClient").returns(mockResourceManagementClient);

    // Act
    const inputs = { platform: Platform.VSCode, projectPath: TestHelper.rootDir };
    const result = await arm.deployArmTemplatesV3(
      mockedCtx,
      inputs,
      mockedCtx.envInfo!,
      mockedCtx.tokenProvider!.azureAccountProvider
    );

    // Assert
    chai.assert.isTrue(result.isOk());
    envRestore();
  });

  it("should use existing parameter file", async () => {
    TestHelper.mockArmDeploymentDependencies(mockedCtx, mocker);

    await fs.writeFile(
      path.join(
        TestHelper.rootDir,
        TestFilePath.configFolder,
        TestFilePath.defaultParameterFileName
      ),
      TestHelper.getParameterFileContent({
        existingFileTest: "mocked value",
      })
    );

    const mockResourceManagementClient = new ResourceManagementClient(
      new MyTokenCredential(),
      "id"
    );
    mockResourceManagementClient.deployments = getMockDeployments(mockedArmTemplateOutput) as any;
    mocker.stub(armResources, "ResourceManagementClient").returns(mockResourceManagementClient);

    // Act
    const inputs = { platform: Platform.VSCode, projectPath: TestHelper.rootDir };
    const result = await arm.deployArmTemplatesV3(
      mockedCtx,
      inputs,
      mockedCtx.envInfo!,
      mockedCtx.tokenProvider!.azureAccountProvider
    );
    chai.assert.isTrue(result.isOk());
  });

  it("should return system error if resource group name not exists in project solution settings", async () => {
    // Arrange
    delete mockedCtx.envInfo!.state[SOLUTION_CONFIG_NAME].resourceGroupName;

    // Act
    const inputs = { platform: Platform.VSCode, projectPath: TestHelper.rootDir };
    const result = await arm.deployArmTemplatesV3(
      mockedCtx,
      inputs,
      mockedCtx.envInfo!,
      mockedCtx.tokenProvider!.azureAccountProvider
    );

    // Assert
    chai.assert.isTrue(result.isErr());
    const error = (result as Err<void, Error>).error;
    chai.assert.strictEqual(error.name, "NoResourceGroupFound");
    chai.assert.strictEqual(
      error.message,
      "Unable to get resource group from project solution settings."
    );
  });

  it("should return user error if target environment name not exists in project solution settings", async () => {
    // Arrange
    mockedCtx.envInfo!.envName = "";

    // Act
    const inputs = { platform: Platform.VSCode, projectPath: TestHelper.rootDir };
    const result = await arm.deployArmTemplatesV3(
      mockedCtx,
      inputs,
      mockedCtx.envInfo!,
      mockedCtx.tokenProvider!.azureAccountProvider
    );

    // Assert
    chai.assert.isTrue(result.isErr());
    const error = (result as Err<void, FxError>).error;
    chai.assert.strictEqual(
      error.message,
      "Unable to get target environment name from solution context."
    );
  });

  it("should return user error if parameter file not exists", async () => {
    // Arrange
    await fs.unlink(
      path.join(
        TestHelper.rootDir,
        TestFilePath.configFolder,
        TestFilePath.defaultParameterFileName
      )
    );

    // Act
    const inputs = { platform: Platform.VSCode, projectPath: TestHelper.rootDir };
    const result = await arm.deployArmTemplatesV3(
      mockedCtx,
      inputs,
      mockedCtx.envInfo!,
      mockedCtx.tokenProvider!.azureAccountProvider
    );

    // Assert
    chai.assert.isTrue(result.isErr());
    const error = (result as Err<void, FxError>).error;
    chai.assert.strictEqual(error.name, "ParameterFileNotExist");
    expect(error.message)
      .to.be.a("string")
      .that.contains("azure.parameters.dev.json does not exist.");
  });

  it("should return user error if fail to ensure bicep command", async () => {
    // Arrange
    const testErrorMsg = "mock ensuring bicep command fails";
    mocker.stub(bicepChecker, "ensureBicep").throws(new Error(testErrorMsg));

    // Act
    const inputs = { platform: Platform.VSCode, projectPath: TestHelper.rootDir };
    const result = await arm.deployArmTemplatesV3(
      mockedCtx,
      inputs,
      mockedCtx.envInfo!,
      mockedCtx.tokenProvider!.azureAccountProvider
    );

    // Assert
    chai.assert.isTrue(result.isErr());
    const error = (result as Err<void, FxError>).error;
    chai.assert.strictEqual(error.name, "FailedToDeployArmTemplatesToAzure");
    expect(error.message).to.be.a("string").that.contains(testErrorMsg);
  });

  it("should return error with notification message", async () => {
    TestHelper.mockArmDeploymentDependencies(mockedCtx, mocker);

    const envRestore = mockedEnv({
      MOCKED_EXPAND_VAR_TEST: TestHelper.envVariable,
    });

    const thrownError = new Error("thrown error");
    const fetchError = {
      error: {
        code: "fetchError",
        message: "fetch error",
      },
    };
    const mockResourceManagementClient = new ResourceManagementClient(
      new MyTokenCredential(),
      "id"
    );
    mockResourceManagementClient.deployments = getMockDeployments() as any;
    mocker.stub(armResources, "ResourceManagementClient").returns(mockResourceManagementClient);
    mocker.stub(arm, "wrapGetDeploymentError").resolves(ok(fetchError));
    mocker.stub(arm, "pollDeploymentStatus").resolves();
    mocker.stub(bicepChecker, "ensureBicep").resolves(bicepCommand);

    // Act
    const inputs = { platform: Platform.VSCode, projectPath: TestHelper.rootDir };
    const result = await arm.deployArmTemplatesV3(
      mockedCtx,
      inputs,
      mockedCtx.envInfo!,
      mockedCtx.tokenProvider!.azureAccountProvider
    );

    // Assert
    chai.assert.isTrue(result.isErr());
    const returnedError = result._unsafeUnwrapErr() as UserError;
    chai.assert.isNotNull(returnedError.displayMessage);

    envRestore();
  });
});

describe("Poll Deployment Status", () => {
  const mocker = sinon.createSandbox();
  let mockedCtx: ContextV3;
  let mockedDeployCtx: any;

  beforeEach(async () => {
    mockedCtx = TestHelper.mockContextV3();
    mockedDeployCtx = TestHelper.getMockedDeployCtx(mockedCtx);
    mocker.stub(tools, "waitSeconds").resolves();
  });

  afterEach(async () => {
    mocker.restore();
  });

  it("should get pollDeploymentStatus error", async () => {
    const mockedErrorMsg = "mocked error";
    mockedDeployCtx.client = {
      deploymentOperations: {
        list: async () => {
          throw new Error(mockedErrorMsg);
        },
      },
    };
    const logger = mocker.stub(MockedLogProvider.prototype, "warning");
    const status = pollDeploymentStatus(mockedDeployCtx);
    mockedDeployCtx.finished = true;
    await expect(status).to.eventually.be.undefined;
  });

  it("pollDeploymentStatus OK", async () => {
    const operations = [
      {
        properties: {
          targetResource: {
            resourceName: "test resource",
            resourceType: "Microsoft.Resources/deployments",
            id: "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Resources/deployments/addTeamsFxConfigurations",
          },
          provisioningState: "Running",
          timestamp: Date.now(),
        },
      },
    ];
    let count = 0;
    mockedDeployCtx.client = {
      deploymentOperations: {
        list: async () => {
          if (count > 1) {
            mockedDeployCtx.finished = true;
          }
          count++;
          return operations;
        },
      },
    };

    const res = await pollDeploymentStatus(mockedDeployCtx);
    chai.assert.isUndefined(res);
  });

  it("formattedDeploymentError OK", async () => {
    const errors = {
      error: {
        code: "OutsideError",
        message: "out side error",
      },
      subErrors: {
        botProvision: {
          error: {
            code: "BotError",
            message: "bot error",
          },
          inner: {
            error: {
              code: "BotInnerError",
              message: "bot inner error",
            },
            subErrors: {
              skuError: {
                error: {
                  code: "MaxNumberOfServerFarmsInSkuPerSubscription",
                  message: "The maximum number of Free ServerFarms allowed in a Subscription is 10",
                },
              },
              evaluationError: {
                error: {
                  code: "DeploymentOperationFailed",
                  message:
                    "Template output evaluation skipped: at least one resource deployment operation failed. Please list deployment operations for details. Please see https://aka.ms/DeployOperations for usage details.",
                },
              },
            },
          },
        },
      },
    };
    const res = formattedDeploymentError(errors);
    chai.assert.deepEqual(res, {
      botProvision: {
        skuError: {
          code: "MaxNumberOfServerFarmsInSkuPerSubscription",
          message: "The maximum number of Free ServerFarms allowed in a Subscription is 10",
        },
      },
    });
  });
});

describe("Copy Parameter Json to New Env", () => {
  const parameterFileNameTemplate = (env: string) => `azure.parameters.${env}.json`;
  const configDir = path.join(TestHelper.rootDir, TestFilePath.configFolder);
  const sourceEnvName = "source";
  const targetEnvName = "target";

  beforeEach(async () => {
    await fs.ensureDir(configDir);
  });

  afterEach(async () => {
    await fs.remove(TestHelper.rootDir);
  });

  it("should do nothing if target env name is empty", async () => {
    // Act
    await copyParameterJson(TestHelper.rootDir, TestHelper.appName, "", sourceEnvName);

    // Assert
    const targetParameterFilePath = path.join(configDir, parameterFileNameTemplate(targetEnvName));
    await chai.expect(fs.stat(targetParameterFilePath)).to.eventually.be.rejectedWith();
  });

  it("should do nothing if source env name is empty", async () => {
    // Act
    await copyParameterJson(TestHelper.rootDir, TestHelper.appName, targetEnvName, "");

    // Assert
    const targetParameterFilePath = path.join(configDir, parameterFileNameTemplate(targetEnvName));
    await chai.expect(fs.stat(targetParameterFilePath)).to.eventually.be.rejectedWith();
  });

  it("should successfully copy parameter from source env to target env", async () => {
    // Arrange
    const sourceResourceBaseName = "sourceResourceBaseName";
    const sourceParamContent = TestHelper.getParameterFileContent(
      {
        resourceBaseName: sourceResourceBaseName,
        param1: "value1",
        param2: "value2",
      },
      {
        userParam1: "userParamValue1",
        userParam2: "userParamValue2",
      }
    );
    await fs.writeFile(
      path.join(configDir, parameterFileNameTemplate(sourceEnvName)),
      sourceParamContent
    );

    // Act
    await copyParameterJson(TestHelper.rootDir, TestHelper.appName, targetEnvName, sourceEnvName);

    // Assert
    // Assert resource base name changed
    const targetParamObj = JSON.parse(
      await fs.readFile(
        path.join(configDir, parameterFileNameTemplate(targetEnvName)),
        fileEncoding
      )
    );
    const targetResourceBaseName =
      targetParamObj?.parameters?.provisionParameters?.value?.resourceBaseName;
    assert.exists(targetResourceBaseName);
    assert.notEqual(targetResourceBaseName, sourceResourceBaseName);

    // Assert other parameter content remains the same
    targetParamObj.parameters.provisionParameters.value.resourceBaseName = sourceResourceBaseName;
    expect(JSON.stringify(targetParamObj, undefined, 2).replace(/\r?\n/g, os.EOL)).equals(
      sourceParamContent
    );
  });

  it("should successfully copy parameter from source env to target env if no resource base name", async () => {
    // Arrange
    const parameterContent = TestHelper.getParameterFileContent({
      param1: "value1",
      param2: "value2",
    });
    await fs.writeFile(
      path.join(configDir, parameterFileNameTemplate(sourceEnvName)),
      parameterContent
    );

    // Act
    await copyParameterJson(TestHelper.rootDir, TestHelper.appName, targetEnvName, sourceEnvName);

    // Assert
    expect(
      await fs.readFile(
        path.join(configDir, parameterFileNameTemplate(targetEnvName)),
        fileEncoding
      )
    ).equals(parameterContent);
  });
});

describe("update Azure parameters", async () => {
  const parameterFileNameTemplate = (env: string) => `azure.parameters.${env}.json`;
  const configDir = path.join(TestHelper.rootDir, TestFilePath.configFolder);
  const targetEnvName = "target";
  const originalResourceBaseName = "originalResourceBaseName";
  const paramContent = TestHelper.getParameterFileContent(
    {
      resourceBaseName: originalResourceBaseName,
      param1: "value1",
      param2: "value2",
    },
    {
      userParam1: "userParamValue1",
      userParam2: "userParamValue2",
    }
  );
  const mocker = sinon.createSandbox();

  beforeEach(async () => {
    await fs.ensureDir(configDir);

    await fs.writeFile(
      path.join(configDir, parameterFileNameTemplate(targetEnvName)),
      paramContent
    );
  });

  afterEach(async () => {
    await fs.remove(TestHelper.rootDir);
    mocker.restore();
  });

  it("should do nothing if project file path is empty", async () => {
    // Act
    await arm.updateAzureParameters("", TestHelper.appName, targetEnvName, true, true, true);

    // Assert
    const targetParamObj = JSON.parse(
      await fs.readFile(
        path.join(configDir, parameterFileNameTemplate(targetEnvName)),
        fileEncoding
      )
    );
    expect(JSON.stringify(targetParamObj, undefined, 2).replace(/\r?\n/g, os.EOL)).equals(
      paramContent
    );
  });

  it("should do nothing if app name is empty", async () => {
    // Act
    await arm.updateAzureParameters(TestHelper.rootDir, "", targetEnvName, true, true, true);

    // Assert
    const targetParamObj = JSON.parse(
      await fs.readFile(
        path.join(configDir, parameterFileNameTemplate(targetEnvName)),
        fileEncoding
      )
    );
    expect(JSON.stringify(targetParamObj, undefined, 2).replace(/\r?\n/g, os.EOL)).equals(
      paramContent
    );
  });

  it("should do nothing if env name is empty", async () => {
    // Act
    await arm.updateAzureParameters(TestHelper.rootDir, TestHelper.appName, "", true, true, true);

    // Assert
    const targetParamObj = JSON.parse(
      await fs.readFile(
        path.join(configDir, parameterFileNameTemplate(targetEnvName)),
        fileEncoding
      )
    );
    expect(JSON.stringify(targetParamObj, undefined, 2).replace(/\r?\n/g, os.EOL)).equals(
      paramContent
    );
  });

  it("should do nothing if not switching accounts", async () => {
    // Act
    await arm.updateAzureParameters(
      TestHelper.rootDir,
      TestHelper.appName,
      targetEnvName,
      false,
      false,
      true
    );

    // Assert
    const targetParamObj = JSON.parse(
      await fs.readFile(
        path.join(configDir, parameterFileNameTemplate(targetEnvName)),
        fileEncoding
      )
    );
    expect(JSON.stringify(targetParamObj, undefined, 2).replace(/\r?\n/g, os.EOL)).equals(
      paramContent
    );
  });

  it("should do nothing if switching M365 account only without bot", async () => {
    // Act
    await arm.updateAzureParameters(
      TestHelper.rootDir,
      TestHelper.appName,
      targetEnvName,
      true,
      false,
      false
    );

    // Assert
    const targetParamObj = JSON.parse(
      await fs.readFile(
        path.join(configDir, parameterFileNameTemplate(targetEnvName)),
        fileEncoding
      )
    );
    expect(JSON.stringify(targetParamObj, undefined, 2).replace(/\r?\n/g, os.EOL)).equals(
      paramContent
    );
  });

  it("update resource base name if switching subscription", async () => {
    // Act
    const res = await arm.updateAzureParameters(
      TestHelper.rootDir,
      TestHelper.appName,
      targetEnvName,
      false,
      true,
      true
    );

    // Assert
    const targetParamObj = JSON.parse(
      await fs.readFile(
        path.join(configDir, parameterFileNameTemplate(targetEnvName)),
        fileEncoding
      )
    );
    const targetResourceBaseName =
      targetParamObj?.parameters?.provisionParameters?.value?.resourceBaseName;
    assert.exists(targetResourceBaseName);
    assert.notEqual(targetResourceBaseName, originalResourceBaseName);

    // Assert other parameter content remains the same
    targetParamObj.parameters.provisionParameters.value.resourceBaseName = originalResourceBaseName;
    expect(JSON.stringify(targetParamObj, undefined, 2).replace(/\r?\n/g, os.EOL)).equals(
      paramContent
    );

    expect(res.isOk()).equal(true);
  });

  it("update resource base name if switching both Azure and M365", async () => {
    // Act
    const res = await arm.updateAzureParameters(
      TestHelper.rootDir,
      TestHelper.appName,
      targetEnvName,
      true,
      true,
      true
    );

    // Assert
    const targetParamObj = JSON.parse(
      await fs.readFile(
        path.join(configDir, parameterFileNameTemplate(targetEnvName)),
        fileEncoding
      )
    );
    const targetResourceBaseName =
      targetParamObj?.parameters?.provisionParameters?.value?.resourceBaseName;
    assert.exists(targetResourceBaseName);
    assert.notEqual(targetResourceBaseName, originalResourceBaseName);

    // Assert other parameter content remains the same
    targetParamObj.parameters.provisionParameters.value.resourceBaseName = originalResourceBaseName;
    expect(JSON.stringify(targetParamObj, undefined, 2).replace(/\r?\n/g, os.EOL)).equals(
      paramContent
    );

    expect(res.isOk()).equal(true);
  });

  it("update bot service name if switching M365 with bot service", async () => {
    // Act
    const paramContent = TestHelper.getParameterFileContent(
      {
        resourceBaseName: originalResourceBaseName,
        botServiceName: "oldBot",
        param1: "value1",
        param2: "value2",
      },
      {
        userParam1: "userParamValue1",
        userParam2: "userParamValue2",
      }
    );

    await fs.ensureDir(configDir);

    await fs.writeFile(
      path.join(configDir, parameterFileNameTemplate(targetEnvName)),
      paramContent
    );

    const res = await arm.updateAzureParameters(
      TestHelper.rootDir,
      TestHelper.appName,
      targetEnvName,
      true,
      false,
      true
    );

    // Assert
    const targetParamObj = JSON.parse(
      await fs.readFile(
        path.join(configDir, parameterFileNameTemplate(targetEnvName)),
        fileEncoding
      )
    );
    const targetBotServiceName =
      targetParamObj?.parameters?.provisionParameters?.value?.botServiceName;
    assert.exists(targetBotServiceName);
    assert.notEqual(targetBotServiceName, "oldBot");

    // Assert other parameter content remains the same
    targetParamObj.parameters.provisionParameters.value.botServiceName = "oldBot";
    expect(JSON.stringify(targetParamObj, undefined, 2).replace(/\r?\n/g, os.EOL)).equals(
      paramContent
    );

    expect(res.isOk()).equal(true);
  });

  it("throw exception", async () => {
    // Act

    mocker.stub(fs, "writeFile").throwsException();

    after(async () => {
      mocker.restore();
    });

    const res = await arm.updateAzureParameters(
      TestHelper.rootDir,
      TestHelper.appName,
      targetEnvName,
      true,
      false,
      true
    );

    // Assert
    const targetParamObj = JSON.parse(
      await fs.readFile(
        path.join(configDir, parameterFileNameTemplate(targetEnvName)),
        fileEncoding
      )
    );
    expect(JSON.stringify(targetParamObj, undefined, 2).replace(/\r?\n/g, os.EOL)).equals(
      paramContent
    );

    expect(res.isErr()).equal(true);
    if (res.isErr()) {
      expect(res.error.name).equal(SolutionError.FailedToUpdateAzureParameters);
    }
  });
});
