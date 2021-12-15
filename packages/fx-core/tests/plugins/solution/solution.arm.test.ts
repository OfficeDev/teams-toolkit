// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  ConfigMap,
  Err,
  FxError,
  ok,
  SolutionContext,
  SubscriptionInfo,
  AzureSolutionSettings,
} from "@microsoft/teamsfx-api";
import * as sinon from "sinon";
import fs from "fs-extra";
import {
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
  TabOptionItem,
  BotOptionItem,
} from "../../../src/plugins/solution/fx-solution/question";
import {
  deployArmTemplates,
  formattedDeploymentError,
  generateArmTemplate,
  pollDeploymentStatus,
} from "../../../src/plugins/solution/fx-solution/arm";
import path from "path";
import mockedEnv from "mocked-env";
import { UserTokenCredentials } from "@azure/ms-rest-nodeauth";
import { ResourceManagementModels, Deployments } from "@azure/arm-resources";
import { WebResourceLike, HttpHeaders } from "@azure/ms-rest-js";
import * as tools from "../../../src/common/tools";
import * as cpUtils from "../../../src/common/cpUtils";
import { environmentManager } from "../../../src/core/environment";
import {
  aadPlugin,
  botPlugin,
  ErrorName,
  fehostPlugin,
  fileEncoding,
  identityPlugin,
  PluginId,
  simpleAuthPlugin,
  spfxPlugin,
  TestFileContent,
  TestFilePath,
} from "../../constants";
import os from "os";

import "mocha";
import chai, { assert } from "chai";
import chaiAsPromised from "chai-as-promised";
import { TestHelper } from "./helper";
chai.use(chaiAsPromised);
const expect = chai.expect;
let mockedEnvRestore: () => void;

describe("Generate ARM Template for project", () => {
  const mocker = sinon.createSandbox();
  let mockedCtx: SolutionContext;

  beforeEach(async () => {
    mockedEnvRestore = mockedEnv({
      __TEAMSFX_INSIDER_PREVIEW: "true",
    });
    mockedCtx = TestHelper.mockSolutionContext();
    mocker.stub(environmentManager, "listEnvConfigs").resolves(ok(["default"]));
    mocker.stub(tools, "getUuid").returns("00000000-0000-0000-0000-000000000000");
    await fs.ensureDir(TestHelper.rootDir);
  });

  afterEach(async () => {
    mockedEnvRestore();
    await fs.remove(TestHelper.rootDir);
    mocker.restore();
  });

  it("should do nothing when no plugin implements generateArmTemplate interface", async () => {
    // Arrange
    mockedCtx.projectSettings!.solutionSettings = {
      hostType: HostTypeOptionSPFx.id,
      name: "spfx",
      activeResourcePlugins: [spfxPlugin.name],
      capabilities: [TabOptionItem.id],
    };

    // Action
    const result = await generateArmTemplate(mockedCtx, [spfxPlugin]);

    // Assert
    expect(result.isOk()).to.be.true;
    expect(await fs.pathExists(path.join(TestHelper.rootDir, TestFilePath.armTemplateBaseFolder)))
      .to.be.false;
  });

  it("should successfully generate arm templates", async () => {
    // Arrange
    mockedCtx.projectSettings!.solutionSettings = {
      hostType: HostTypeOptionAzure.id,
      name: "azure",
      activeResourcePlugins: [
        aadPlugin.name,
        fehostPlugin.name,
        simpleAuthPlugin.name,
        identityPlugin.name,
      ],
      capabilities: [TabOptionItem.id],
    };
    TestHelper.mockedFehostGenerateArmTemplates(mocker);
    TestHelper.mockedSimpleAuthGenerateArmTemplates(mocker);
    TestHelper.mockedAadGenerateArmTemplates(mocker);
    TestHelper.mockedIdentityGenerateArmTemplates(mocker);

    // Action
    const result = await generateArmTemplate(mockedCtx, [
      aadPlugin,
      simpleAuthPlugin,
      fehostPlugin,
      identityPlugin,
    ]);

    // Assert
    const projectArmTemplateFolder = path.join(
      TestHelper.rootDir,
      TestFilePath.armTemplateBaseFolder
    );
    expect(result.isOk()).to.be.true;
    expect(
      await fs.readFile(
        path.join(projectArmTemplateFolder, TestFilePath.mainFileName),
        fileEncoding
      )
    ).equals(
      `@secure()
param provisionParameters object

module provision './provision.bicep' = {
  name: 'provisionResources'
  params: {
    provisionParameters: provisionParameters
  }
}

module teamsFxConfig './config.bicep' = {
  name: 'addTeamsFxConfigurations'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provision
  }
}

output provisionOutput object = provision
output teamsFxConfigurationOutput object = contains(reference(resourceId('Microsoft.Resources/deployments', teamsFxConfig.name), '2020-06-01'), 'outputs') ? teamsFxConfig : {}
`
    );

    expect(
      await fs.readFile(
        path.join(projectArmTemplateFolder, TestFilePath.provisionFileName),
        fileEncoding
      )
    ).equals(
      `@secure()
param provisionParameters object
Mocked frontend hosting provision orchestration content. Module path: './provision/frontendHostingProvision.bicep'.
Mocked identity provision orchestration content. Module path: './provision/identityProvision.bicep'.
Mocked aad provision orchestration content. Module path: './provision/aadProvision.bicep'.
Mocked simple auth provision orchestration content. Module path: './provision/simpleAuthProvision.bicep'.`.replace(
        /\r?\n/g,
        os.EOL
      )
    );

    expect(
      await fs.readFile(
        path.join(projectArmTemplateFolder, TestFilePath.configFileName),
        fileEncoding
      )
    ).equals(
      `@secure()
param provisionParameters object
param provisionOutputs object
Mocked frontend hosting configuration orchestration content. Module path: './teamsFx/frontendHostingConfig.bicep'.
Mocked identity configuration orchestration content. Module path: './teamsFx/identityConfig.bicep'.
Mocked aad configuration orchestration content. Module path: './teamsFx/aadConfig.bicep'.
Mocked simple auth configuration orchestration content. Module path: './teamsFx/simpleAuthConfig.bicep'.`.replace(
        /\r?\n/g,
        os.EOL
      )
    );

    expect(
      await fs.readFile(
        path.join(
          projectArmTemplateFolder,
          TestFilePath.provisionFolder,
          TestFilePath.fehostProvisionFileName
        ),
        fileEncoding
      )
    ).equals(TestFileContent.feHostProvisionModule);
    expect(
      await fs.readFile(
        path.join(
          projectArmTemplateFolder,
          TestFilePath.provisionFolder,
          TestFilePath.simpleAuthProvisionFileName
        ),
        fileEncoding
      )
    ).equals(TestFileContent.simpleAuthProvisionModule);
    expect(
      await fs.readFile(
        path.join(
          projectArmTemplateFolder,
          TestFilePath.provisionFolder,
          TestFilePath.aadProvisionFileName
        ),
        fileEncoding
      )
    ).equals(TestFileContent.aadProvisionModule);
    expect(
      await fs.readFile(
        path.join(
          projectArmTemplateFolder,
          TestFilePath.provisionFolder,
          TestFilePath.identityProvisionFileName
        ),
        fileEncoding
      )
    ).equals(TestFileContent.identityProvisionModule);

    expect(
      await fs.readFile(
        path.join(
          projectArmTemplateFolder,
          TestFilePath.configurationFolder,
          TestFilePath.fehostConfigFileName
        ),
        fileEncoding
      )
    ).equals(TestFileContent.feHostConfigurationModule);
    expect(
      await fs.readFile(
        path.join(
          projectArmTemplateFolder,
          TestFilePath.configurationFolder,
          TestFilePath.simpleAuthConfigFileName
        ),
        fileEncoding
      )
    ).equals(TestFileContent.simpleAuthConfigurationModule);
    expect(
      await fs.readFile(
        path.join(
          projectArmTemplateFolder,
          TestFilePath.configurationFolder,
          TestFilePath.aadConfigFileName
        ),
        fileEncoding
      )
    ).equals(TestFileContent.aadConfigurationModule);
    expect(
      await fs.readFile(
        path.join(
          projectArmTemplateFolder,
          TestFilePath.configurationFolder,
          TestFilePath.identityConfigFileName
        ),
        fileEncoding
      )
    ).equals(TestFileContent.identityConfigurationModule);

    expect(
      await fs.readFile(
        path.join(
          TestHelper.rootDir,
          TestFilePath.configFolder,
          TestFilePath.defaultParameterFileName
        ),
        fileEncoding
      )
    ).equals(
      `{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "provisionParameters": {
      "value": {
        "resourceBaseName": "${TestHelper.resourceBaseName}",
        "FrontendParameter": "${TestFileContent.feHostParameterValue}",
        "IdentityParameter": "${TestFileContent.identityParameterValue}",
        "AadParameter": "${TestFileContent.aadParameterValue}",
        "SimpleAuthParameter": "${TestFileContent.simpleAuthParameterValue}"
      }
    }
  }
}`.replace(/\r?\n/g, os.EOL)
    );
  });

  it("add bot capability on tab app success", async () => {
    // Arrange
    mockedCtx.projectSettings!.solutionSettings = {
      hostType: HostTypeOptionAzure.id,
      name: "azure",
      activeResourcePlugins: [
        aadPlugin.name,
        fehostPlugin.name,
        simpleAuthPlugin.name,
        identityPlugin.name,
      ],
      capabilities: [TabOptionItem.id],
    };
    TestHelper.mockedFehostGenerateArmTemplates(mocker);
    TestHelper.mockedAadGenerateArmTemplates(mocker);
    TestHelper.mockedIdentityGenerateArmTemplates(mocker);
    const simpleAuthGenerateArmTemplatesStub =
      TestHelper.mockedSimpleAuthGenerateArmTemplates(mocker);
    const botGenerateArmTemplatesStub = TestHelper.mockedBotGenerateArmTemplates(mocker);

    const simpleAuthUpdateArmTemplatesStub = TestHelper.mockedSimpleAuthUpdateArmTemplates(mocker);
    const botUpdateArmTemplatesStub = TestHelper.mockedBotUpdateArmTemplates(mocker);
    TestHelper.mockedFeHostUpdateArmTemplates(mocker);
    TestHelper.mockedAadUpdateArmTemplates(mocker);
    TestHelper.mockedIdentityUpdateArmTemplates(mocker);

    // Scaffold tab project
    let result = await generateArmTemplate(mockedCtx, [
      aadPlugin,
      simpleAuthPlugin,
      fehostPlugin,
      identityPlugin,
    ]);
    const projectArmTemplateFolder = path.join(
      TestHelper.rootDir,
      TestFilePath.armTemplateBaseFolder
    );
    expect(result.isOk()).to.be.true;
    expect(
      await fs.readFile(
        path.join(
          TestHelper.rootDir,
          TestFilePath.configFolder,
          TestFilePath.defaultParameterFileName
        ),
        fileEncoding
      )
    ).equals(
      `{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "provisionParameters": {
      "value": {
        "resourceBaseName": "${TestHelper.resourceBaseName}",
        "FrontendParameter": "${TestFileContent.feHostParameterValue}",
        "IdentityParameter": "${TestFileContent.identityParameterValue}",
        "AadParameter": "${TestFileContent.aadParameterValue}",
        "SimpleAuthParameter": "${TestFileContent.simpleAuthParameterValue}"
      }
    }
  }
}`.replace(/\r?\n/g, os.EOL)
    );
    expect(
      await fs.pathExists(
        path.join(
          projectArmTemplateFolder,
          TestFilePath.provisionFolder,
          TestFilePath.botProvisionFileName
        )
      )
    ).to.be.false;
    expect(
      await fs.pathExists(
        path.join(
          projectArmTemplateFolder,
          TestFilePath.configurationFolder,
          TestFilePath.botConfigFileName
        )
      )
    ).to.be.false;
    expect(
      await fs.readFile(
        path.join(
          projectArmTemplateFolder,
          TestFilePath.configurationFolder,
          TestFilePath.simpleAuthConfigFileName
        ),
        fileEncoding
      )
    ).equals(TestFileContent.simpleAuthConfigurationModule);
    assert(botGenerateArmTemplatesStub.notCalled);
    assert(botUpdateArmTemplatesStub.notCalled);
    assert(simpleAuthUpdateArmTemplatesStub.notCalled);
    assert(simpleAuthGenerateArmTemplatesStub.calledOnce);

    // Add bot capability
    (
      mockedCtx.projectSettings!.solutionSettings as AzureSolutionSettings
    ).activeResourcePlugins.push(botPlugin.name);
    (mockedCtx.projectSettings!.solutionSettings as AzureSolutionSettings).capabilities.push(
      BotOptionItem.id
    );
    result = await generateArmTemplate(mockedCtx, [botPlugin]);

    expect(result.isOk()).to.be.true;
    expect(
      await fs.readFile(
        path.join(
          TestHelper.rootDir,
          TestFilePath.configFolder,
          TestFilePath.defaultParameterFileName
        ),
        fileEncoding
      )
    ).equals(
      `{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "provisionParameters": {
      "value": {
        "resourceBaseName": "${TestHelper.resourceBaseName}",
        "FrontendParameter": "${TestFileContent.feHostParameterValue}",
        "IdentityParameter": "${TestFileContent.identityParameterValue}",
        "AadParameter": "${TestFileContent.aadParameterValue}",
        "SimpleAuthParameter": "${TestFileContent.simpleAuthParameterValue}",
        "BotParameter": "${TestFileContent.botParameterValue}"
      }
    }
  }
}`.replace(/\r?\n/g, os.EOL)
    );
    expect(
      await fs.readFile(
        path.join(
          projectArmTemplateFolder,
          TestFilePath.provisionFolder,
          TestFilePath.botProvisionFileName
        ),
        fileEncoding
      )
    ).equals(TestFileContent.botProvisionModule);
    expect(
      await fs.readFile(
        path.join(
          projectArmTemplateFolder,
          TestFilePath.configurationFolder,
          TestFilePath.botConfigFileName
        ),
        fileEncoding
      )
    ).equals(TestFileContent.botConfigurationModule);
    expect(
      await fs.readFile(
        path.join(
          projectArmTemplateFolder,
          TestFilePath.configurationFolder,
          TestFilePath.simpleAuthConfigFileName
        ),
        fileEncoding
      )
    ).equals(TestFileContent.simpleAuthUpdatedConfigurationModule);
    assert(botGenerateArmTemplatesStub.calledOnce);
    assert(botUpdateArmTemplatesStub.notCalled);
    assert(simpleAuthUpdateArmTemplatesStub.calledOnce);
    assert(simpleAuthGenerateArmTemplatesStub.calledOnce);

    expect(
      await fs.readFile(
        path.join(projectArmTemplateFolder, TestFilePath.provisionFileName),
        fileEncoding
      )
    ).equals(
      `@secure()
param provisionParameters object
Mocked frontend hosting provision orchestration content. Module path: './provision/frontendHostingProvision.bicep'.
Mocked identity provision orchestration content. Module path: './provision/identityProvision.bicep'.
Mocked aad provision orchestration content. Module path: './provision/aadProvision.bicep'.
Mocked simple auth provision orchestration content. Module path: './provision/simpleAuthProvision.bicep'.
Mocked bot provision orchestration content. Module path: './provision/botProvision.bicep'.`.replace(
        /\r?\n/g,
        os.EOL
      )
    );

    expect(
      await fs.readFile(
        path.join(projectArmTemplateFolder, TestFilePath.configFileName),
        fileEncoding
      )
    ).equals(
      `@secure()
param provisionParameters object
param provisionOutputs object
Mocked frontend hosting configuration orchestration content. Module path: './teamsFx/frontendHostingConfig.bicep'.
Mocked identity configuration orchestration content. Module path: './teamsFx/identityConfig.bicep'.
Mocked aad configuration orchestration content. Module path: './teamsFx/aadConfig.bicep'.
Mocked simple auth configuration orchestration content. Module path: './teamsFx/simpleAuthConfig.bicep'.
Mocked bot configuration orchestration content. Module path: './teamsFx/botConfig.bicep'.`.replace(
        /\r?\n/g,
        os.EOL
      )
    );
  });
});

describe("Deploy ARM Template to Azure", () => {
  const mocker = sinon.createSandbox();
  let mockedCtx: SolutionContext;
  const mockedArmTemplateOutput = {
    provisionOutput: {
      type: "Object",
      value: {
        frontendHostingOutput: {
          type: "Object",
          value: {
            teamsFxPluginId: PluginId.FrontendHosting,
            frontendHostingOutputKey: TestHelper.frontendhostingOutputValue,
          },
        },
        identityOutput: {
          type: "Object",
          value: {
            teamsFxPluginId: PluginId.Identity,
            identityOutputKey: TestHelper.identityOutputValue,
          },
        },
        simpleAuthOutput: {
          type: "Object",
          value: {
            teamsFxPluginId: PluginId.SimpleAuth,
            simpleAuthOutputKey: TestHelper.simpleAuthOutputValue,
          },
        },
      },
    },
  };

  beforeEach(async () => {
    mockedEnvRestore = mockedEnv({
      __TEAMSFX_INSIDER_PREVIEW: "true",
    });
    mockedCtx = TestHelper.mockSolutionContext();
    mockedCtx.projectSettings!.solutionSettings = {
      hostType: HostTypeOptionAzure.id,
      name: "azure",
      activeResourcePlugins: [
        aadPlugin.name,
        fehostPlugin.name,
        simpleAuthPlugin.name,
        identityPlugin.name,
      ],
      capabilities: [TabOptionItem.id],
    };
    mockedCtx.envInfo.state.set(
      PluginId.Aad,
      new ConfigMap([
        ["clientId", TestHelper.clientId],
        ["clientSecret", TestHelper.clientSecret],
      ])
    );

    await fs.ensureDir(TestHelper.rootDir);
    const configDir = path.join(TestHelper.rootDir, TestFilePath.configFolder);
    await fs.ensureDir(configDir);
    await fs.writeFile(
      path.join(configDir, TestFilePath.defaultParameterFileName),
      `{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "resourceBaseName": {
      "value": "{{state.solution.resourceBaseName}}"
    },
    "aadClientId": {
      "value": "{{state.fx-resource-aad-app-for-teams.clientId}}"
    },
    "aadClientSecret": {
      "value": "{{state.fx-resource-aad-app-for-teams.clientSecret}}"
    },
    "envValue": {
      "value": "{{$env.MOCKED_EXPAND_VAR_TEST}}"
    }
  }
  }
  `
    );
  });

  afterEach(async () => {
    mockedEnvRestore();
    mocker.restore();
    await fs.remove(TestHelper.rootDir);
  });

  it("should fail when main.bicep do not exist", async () => {
    // Act
    const result = await deployArmTemplates(mockedCtx);

    // Assert
    chai.assert.isTrue(result.isErr());
    const error = (result as Err<void, FxError>).error;
    chai.expect(error.name).to.equal(ErrorName.FailedToDeployArmTemplatesToAzureError);
    chai
      .expect(error.message)
      .to.have.string("Failed to compile bicep files to Json arm templates file:");
  });

  it("should successfully update parameter and deploy arm templates to azure", async () => {
    mockedCtx.azureAccountProvider!.getAccountCredentialAsync = async function () {
      const azureToken = new UserTokenCredentials(
        TestHelper.clientId,
        TestHelper.domain,
        TestHelper.username,
        TestHelper.password
      );
      return azureToken;
    };
    mockedCtx.azureAccountProvider!.getSelectedSubscription = async function () {
      const subscriptionInfo = {
        subscriptionId: TestHelper.subscriptionId,
        subscriptionName: TestHelper.subscriptionName,
      } as SubscriptionInfo;
      return subscriptionInfo;
    };

    mocker.stub(cpUtils, "executeCommand").returns(
      new Promise((resolve) => {
        resolve(TestHelper.armTemplateJson);
      })
    );
    const envRestore = mockedEnv({
      MOCKED_EXPAND_VAR_TEST: TestHelper.envVariable,
    });

    let parameterAfterDeploy = "";
    let armTemplateJson = "";
    mocker
      .stub(Deployments.prototype, "createOrUpdate")
      .callsFake(
        (
          resourceGroupName: string,
          deploymentName: string,
          parameters: ResourceManagementModels.Deployment
        ) => {
          armTemplateJson = parameters.properties.template;
          parameterAfterDeploy = parameters.properties.parameters;
          chai.assert.exists(parameters.properties.parameters?.aadClientSecret);
          chai.assert.notStrictEqual(
            parameters.properties.parameters?.aadClientSecret,
            "{{state.fx-resource-aad-app-for-teams.clientSecret}}"
          );

          return new Promise((resolve) => {
            resolve({
              properties: {
                outputs: mockedArmTemplateOutput,
              },
              _response: {
                request: {} as WebResourceLike,
                status: 200,
                headers: new HttpHeaders(),
                bodyAsText: "",
                parsedBody: {} as ResourceManagementModels.DeploymentExtended,
              },
            });
          });
        }
      );

    // Act
    const result = await deployArmTemplates(mockedCtx);

    // Assert
    chai.assert.isTrue(result.isOk());
    // Assert parameters are successfully expanded by: 1.plugin context var; 2. solution config; 3. env var
    expect(armTemplateJson).to.deep.equals(JSON.parse(TestHelper.armTemplateJson));
    expect(parameterAfterDeploy).to.deep.equals(
      JSON.parse(`{
        "resourceBaseName": {
          "value": "${TestHelper.resourceBaseName}"
        },
        "aadClientId": {
          "value": "${TestHelper.clientId}"
        },
        "aadClientSecret": {
          "value": "${TestHelper.clientSecret}"
        },
        "envValue": {
          "value": "${TestHelper.envVariable}"
        }
      }`)
    );

    // Assert arm output is successfully set in context
    chai.assert.strictEqual(
      mockedCtx.envInfo.state.get(PluginId.FrontendHosting)?.get("frontendHostingOutputKey"),
      TestHelper.frontendhostingOutputValue
    );
    chai.assert.strictEqual(
      mockedCtx.envInfo.state.get(PluginId.Identity)?.get("identityOutputKey"),
      TestHelper.identityOutputValue
    );
    chai.assert.strictEqual(
      mockedCtx.envInfo.state.get(PluginId.SimpleAuth)?.get("simpleAuthOutputKey"),
      TestHelper.simpleAuthOutputValue
    );

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
      `{
    "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
        "existingFileTest": {
            "value": "mocked value"
        }
    }
}`
    );

    let usedExistingParameterDefaultFile = false;
    mocker
      .stub(Deployments.prototype, "createOrUpdate")
      .callsFake(
        (
          resourceGroupName: string,
          deploymentName: string,
          parameters: ResourceManagementModels.Deployment
        ) => {
          if (parameters.properties.parameters?.existingFileTest) {
            usedExistingParameterDefaultFile = true;
          } //content of parameter.default.json should be used

          return new Promise((resolve) => {
            resolve({
              properties: {
                outputs: mockedArmTemplateOutput,
              },
              _response: {
                request: {} as WebResourceLike,
                status: 200,
                headers: new HttpHeaders(),
                bodyAsText: "",
                parsedBody: {} as ResourceManagementModels.DeploymentExtended,
              },
            });
          });
        }
      );

    // Act
    const result = await deployArmTemplates(mockedCtx);
    chai.assert.isTrue(result.isOk());
    chai.assert.strictEqual(usedExistingParameterDefaultFile, true);
  });
});

describe("Poll Deployment Status", () => {
  const mocker = sinon.createSandbox();
  let mockedCtx: SolutionContext;
  let mockedDeployCtx: any;

  beforeEach(async () => {
    mockedEnvRestore = mockedEnv({
      __TEAMSFX_INSIDER_PREVIEW: "true",
    });
    mockedCtx = TestHelper.mockSolutionContext();
    mockedDeployCtx = TestHelper.getMockedDeployCtx(mockedCtx);
    mocker.stub(tools, "waitSeconds").resolves();
  });

  afterEach(async () => {
    mockedEnvRestore();
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

    await expect(pollDeploymentStatus(mockedDeployCtx))
      .to.eventually.be.rejectedWith(Error)
      .and.property("message", mockedErrorMsg);
  });

  it("pollDeploymentStatus OK", async () => {
    const operations = [
      {
        properties: {
          targetResource: {
            resourceName: "test resource",
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
