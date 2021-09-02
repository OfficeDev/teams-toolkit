// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ResourcePlugins } from "../../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import Container from "typedi";
import {
  AzureAccountProvider,
  ConfigMap,
  Err,
  FxError,
  ok,
  Platform,
  PluginContext,
  SolutionConfig,
  SolutionContext,
  SubscriptionInfo,
} from "@microsoft/teamsfx-api";
import * as sinon from "sinon";
import fs, { PathLike } from "fs-extra";
import * as uuid from "uuid";
import {
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
  TabOptionItem,
} from "../../../src/plugins/solution/fx-solution/question";
import {
  deployArmTemplates,
  generateArmTemplate,
} from "../../../src/plugins/solution/fx-solution/arm";
import * as bicepChecker from "../../../src/plugins/solution/fx-solution/utils/depsChecker/bicepChecker";
import { it } from "mocha";
import path from "path";
import { ArmResourcePlugin } from "../../../src/common/armInterface";
import mockedEnv from "mocked-env";
import { UserTokenCredentials } from "@azure/ms-rest-nodeauth";
import { ResourceManagementModels, Deployments } from "@azure/arm-resources";
import { WebResourceLike, HttpHeaders } from "@azure/ms-rest-js";
import {
  mockedAadScaffoldArmResult,
  mockedFehostScaffoldArmResult,
  mockedSimpleAuthScaffoldArmResult,
} from "./util";
import { ExecOptions } from "child_process";
import { Executor } from "../../../src/common/tools";
import * as os from "os";

import "../../../src/plugins/resource/frontend";
import "../../../src/plugins/resource/simpleauth";
import "../../../src/plugins/resource/spfx";
import "../../../src/plugins/resource/aad";
import { environmentManager } from "../../../src";

chai.use(chaiAsPromised);
const expect = chai.expect;

const fehostPlugin = Container.get<Plugin>(ResourcePlugins.FrontendPlugin) as Plugin &
  ArmResourcePlugin;
const simpleAuthPlugin = Container.get<Plugin>(ResourcePlugins.SimpleAuthPlugin) as Plugin &
  ArmResourcePlugin;
const spfxPlugin = Container.get<Plugin>(ResourcePlugins.SpfxPlugin) as Plugin & ArmResourcePlugin;
const aadPlugin = Container.get<Plugin>(ResourcePlugins.AadPlugin) as Plugin & ArmResourcePlugin;

const baseFolder = "./infra/azure";
const parameterFolderName = "parameters";
const templateFolderName = "templates";
const fileEncoding = "UTF8";
const parameterFolder = path.join(baseFolder, parameterFolderName);
const templateFolder = path.join(baseFolder, templateFolderName);

function mockSolutionContext(): SolutionContext {
  return {
    root: "./",
    envInfo: {
      envName: "default",
      profile: new Map<string, any>(),
      config: environmentManager.newEnvConfigData(),
    },
    answers: { platform: Platform.VSCode },
    projectSettings: undefined,
    azureAccountProvider: Object as any & AzureAccountProvider,
  };
}

describe("Generate ARM Template for project", () => {
  const mocker = sinon.createSandbox();
  const testAppName = "my test app";
  const testFolder = "./tests/plugins/solution/testproject";

  beforeEach(async () => {
    await fs.ensureDir(testFolder);
  });

  afterEach(async () => {
    await fs.remove(testFolder);
    mocker.restore();
  });

  it("should do nothing when no plugin implements required interface", async () => {
    const mockedCtx = mockSolutionContext();
    mockedCtx.root = testFolder;
    mockedCtx.projectSettings = {
      appName: testAppName,
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "spfx",
        version: "1.0",
        activeResourcePlugins: [spfxPlugin.name],
        capabilities: [TabOptionItem.id],
      },
    };

    const result = await generateArmTemplate(mockedCtx);
    expect(result.isOk()).to.be.true;
    expect(await fs.pathExists(path.join(testFolder, baseFolder))).to.be.false;
  });

  it("should output templates when plugin implements required interface", async () => {
    const mockedCtx = mockSolutionContext();
    mockedCtx.root = testFolder;
    mockedCtx.projectSettings = {
      appName: testAppName,
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [fehostPlugin.name, simpleAuthPlugin.name],
        capabilities: [TabOptionItem.id],
      },
    };

    // mock plugin behavior
    mocker.stub(fehostPlugin, "generateArmTemplates").callsFake(async (ctx: PluginContext) => {
      return ok(mockedFehostScaffoldArmResult);
    });

    mocker.stub(simpleAuthPlugin, "generateArmTemplates").callsFake(async (ctx: PluginContext) => {
      return ok(mockedSimpleAuthScaffoldArmResult);
    });

    mocker.stub(aadPlugin, "generateArmTemplates").callsFake(async (ctx: PluginContext) => {
      return ok(mockedAadScaffoldArmResult);
    });

    const projectArmTemplateFolder = path.join(testFolder, templateFolder);
    const projectArmParameterFolder = path.join(testFolder, parameterFolder);
    const projectArmBaseFolder = path.join(testFolder, baseFolder);
    const result = await generateArmTemplate(mockedCtx);
    expect(result.isOk()).to.be.true;
    expect(
      await fs.readFile(path.join(projectArmTemplateFolder, "main.bicep"), fileEncoding)
    ).equals(
      `param resourceBaseName string
Mocked frontend hosting parameter content
Mocked simple auth parameter content

Mocked frontend hosting variable content
Mocked simple auth variable content

Mocked frontend hosting module content. Module path: ./frontendHostingProvision.bicep. Variable: Mocked simple auth endpoint
Mocked simple auth module content. Module path: ./simpleAuthProvision.bicep. Variable: Mocked frontend hosting endpoint

Mocked frontend hosting output content
Mocked simple auth output content`
    );
    expect(
      await fs.readFile(
        path.join(projectArmTemplateFolder, "frontendHostingProvision.bicep"),
        fileEncoding
      )
    ).equals("Mocked frontend hosting provision module content");
    expect(
      await fs.readFile(
        path.join(projectArmTemplateFolder, "simpleAuthProvision.bicep"),
        fileEncoding
      )
    ).equals("Mocked simple auth provision module content");
    expect(
      await fs.readFile(
        path.join(projectArmParameterFolder, "parameters.template.json"),
        fileEncoding
      )
    ).equals(
      `{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "resourceBaseName": {
      "value": "{{SOLUTION__RESOURCE_BASE_NAME}}"
    },
    "FrontendParameter": "FrontendParameterValue",
    "SimpleAuthParameter": "SimpleAuthParameterValue"
  }
}`
    );
    expect(await fs.readFile(path.join(projectArmBaseFolder, ".gitignore"), fileEncoding)).equals(
      `# ignore ARM template backup folder${os.EOL}/backup`
    );
  });

  it("should create backup folder when ARM template already exists", async () => {
    const mockedCtx = mockSolutionContext();
    mockedCtx.root = testFolder;
    mockedCtx.projectSettings = {
      appName: testAppName,
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [fehostPlugin.name, simpleAuthPlugin.name],
        capabilities: [TabOptionItem.id],
      },
    };

    const projectArmBaseFolder = path.join(mockedCtx.root, baseFolder);
    const projectArmTemplateFolder = path.join(mockedCtx.root, templateFolder);
    const projectArmParameterFolder = path.join(mockedCtx.root, parameterFolder);
    const mockedParameterDefaultJsonContent = "mocked parameter.default.json file";
    const mockedMainBicepContent = "mocked main.bicep file";
    await fs.ensureDir(projectArmTemplateFolder);
    await fs.ensureDir(projectArmParameterFolder);
    await fs.writeFile(
      path.join(projectArmParameterFolder, "parameter.default.json"),
      mockedParameterDefaultJsonContent
    );
    await fs.writeFile(path.join(projectArmTemplateFolder, "main.bicep"), mockedMainBicepContent);

    const result = await generateArmTemplate(mockedCtx);

    expect(result.isOk()).to.be.true;
    const backupBaseFolder = path.join(projectArmBaseFolder, "backup");
    expect(await fs.pathExists(backupBaseFolder)).to.be.true;
    const backupFolderItems = await fs.readdir(backupBaseFolder);
    expect(backupFolderItems.length).equals(1);
    const parameterBackupFolder = path.join(
      backupBaseFolder,
      backupFolderItems[0],
      parameterFolderName
    );
    const parameterBackupFiles = await fs.readdir(parameterBackupFolder);
    expect(parameterBackupFiles.length).equals(1);
    expect(
      await fs.readFile(path.join(parameterBackupFolder, parameterBackupFiles[0]), fileEncoding)
    ).equals(mockedParameterDefaultJsonContent);
    const templateBackupFolder = path.join(
      backupBaseFolder,
      backupFolderItems[0],
      templateFolderName
    );
    const templateBackupFiles = await fs.readdir(templateBackupFolder);
    expect(templateBackupFiles.length).equals(1);
    expect(
      await fs.readFile(path.join(templateBackupFolder, templateBackupFiles[0]), fileEncoding)
    ).equals(mockedMainBicepContent);
  });
});

describe("Deploy ARM Template to Azure", () => {
  const mocker = sinon.createSandbox();
  const testAppName = "my test app";
  let envRestore: () => void;
  const testClientId = "test_client_id";
  const testClientSecret = "test_client_secret";
  const testEnvValue = "test env value";
  const testResourceSuffix = "-testSuffix";
  const testArmTemplateOutput = {
    frontendHosting_storageName: {
      type: "String",
      value: "frontendstgagag4xom3ewiq",
    },
    frontendHosting_endpoint: {
      type: "String",
      value: "https://frontendstgagag4xom3ewiq.z13.web.core.windows.net/",
    },
    frontendHosting_domain: {
      type: "String",
      value: "frontendstgagag4xom3ewiq.z13.web.core.windows.net",
    },
    simpleAuth_skuName: {
      type: "String",
      value: "B1",
    },
    simpleAuth_endpoint: {
      type: "String",
      value: "https://testproject-simpleauth-webapp.azurewebsites.net",
    },
  };
  const SOLUTION_CONFIG = "solution";
  let fileContent: Map<string, any>;

  beforeEach(() => {
    ((mocker.stub(fs, "readFile") as unknown) as sinon.SinonStub<
      [file: number | fs.PathLike],
      Promise<string>
    >).callsFake(
      (file: number | PathLike): Promise<string> => {
        return fileContent.get(file.toString());
      }
    );
    mocker.stub(fs, "stat").callsFake(
      (filePath: PathLike): Promise<fs.Stats> => {
        if (fileContent.has(filePath.toString())) {
          return new Promise<fs.Stats>((resolve) => {
            resolve({} as fs.Stats);
          });
        }
        throw new Error(`${filePath} does not exist.`);
      }
    );
    mocker.stub(fs, "writeFile").callsFake((path: number | PathLike, data: any) => {
      fileContent.set(path.toString(), data);
    });
    mocker.stub(bicepChecker, "ensureBicep").callsFake(async (ctx: SolutionContext) => "bicep");

    fileContent = new Map([
      [
        path.join(parameterFolder, "parameters.template.json"),
        `{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "resourceBaseName": {
      "value": "{{SOLUTION__RESOURCE_BASE_NAME}}"
    },
    "aadClientId": {
      "value": "{{FX_RESOURCE_AAD_APP_FOR_TEAMS__CLIENTID}}"
    },
    "aadClientSecret": {
      "value": "{{FX_RESOURCE_AAD_APP_FOR_TEAMS__CLIENTSECRET}}"
    },
    "envValue": {
      "value": "{{MOCKED_EXPAND_VAR_TEST}}"
    }
  }
  }
  `,
      ],
      [path.join(templateFolder, "main.json"), `{"test_key": "test_value"}`],
    ]);
  });

  afterEach(() => {
    envRestore();
    mocker.restore();
  });

  it("should fail when main.bicep do not exist", async () => {
    // Arrange
    const mockedCtx = mockSolutionContext();
    mockedCtx.projectSettings = {
      appName: testAppName,
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [fehostPlugin.name, simpleAuthPlugin.name],
        capabilities: [TabOptionItem.id],
      },
    };
    mockedCtx.envInfo.profile.set(
      "fx-resource-aad-app-for-teams",
      new ConfigMap([["clientId", testClientId]])
    );
    mockedCtx.envInfo.profile.set(
      SOLUTION_CONFIG,
      new ConfigMap([
        ["resource-base-name", "mocked resource base name"],
        ["resourceGroupName", "mocked resource group name"],
      ])
    );

    envRestore = mockedEnv({
      MOCKED_EXPAND_VAR_TEST: "mocked environment variable",
    });

    // Act
    const result = await deployArmTemplates(mockedCtx);

    // Assert
    chai.assert.isTrue(result.isErr());
    const error = (result as Err<void, FxError>).error;
    chai.expect(error.name).to.equal("FailedToDeployArmTemplatesToAzure");
    chai
      .expect(error.message)
      .to.have.string("Failed to compile bicep files to Json arm templates file:");
  });

  it("should successfully update parameter and deploy arm templates to azure", async () => {
    // Arrange
    const mockedCtx = mockSolutionContext();
    mockedCtx.projectSettings = {
      appName: testAppName,
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [fehostPlugin.name, simpleAuthPlugin.name],
        capabilities: [TabOptionItem.id],
      },
    };
    mockArmDeploymentDependencies(mockedCtx);

    mockedCtx.envInfo.profile.set(
      "fx-resource-aad-app-for-teams",
      new ConfigMap([
        ["clientId", testClientId],
        ["clientSecret", testClientSecret],
      ])
    );
    envRestore = mockedEnv({
      MOCKED_EXPAND_VAR_TEST: testEnvValue,
    });

    mocker
      .stub(Deployments.prototype, "createOrUpdate")
      .callsFake(
        (
          resourceGroupName: string,
          deploymentName: string,
          parameters: ResourceManagementModels.Deployment
        ) => {
          chai.assert.exists(parameters.properties.parameters?.aadClientSecret);
          chai.assert.notStrictEqual(
            parameters.properties.parameters?.aadClientSecret,
            "{{FX_RESOURCE_AAD_APP_FOR_TEAMS__CLIENTSECRET}}"
          );

          return new Promise((resolve) => {
            resolve({
              properties: {
                outputs: testArmTemplateOutput,
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
    chai.assert.isTrue(result.isErr());

    expect(
      JSON.parse(fileContent.get(path.join(parameterFolder, "parameters.default.json")))
    ).to.deep.equals(
      JSON.parse(`{
      "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {
        "resourceBaseName": {
          "value": "mytestapp${testResourceSuffix}"
        },
        "aadClientId": {
          "value": "${testClientId}"
        },
        "aadClientSecret": {
          "value": "{{FX_RESOURCE_AAD_APP_FOR_TEAMS__CLIENTSECRET}}"
        },
        "envValue": {
          "value": "${testEnvValue}"
        }
      }
      }`)
    );
    chai.assert.strictEqual(
      mockedCtx.envInfo.profile.get(SOLUTION_CONFIG)?.get("armTemplateOutput"),
      testArmTemplateOutput
    );
  });

  it("should use existing parameter file", async () => {
    const mockedCtx = mockSolutionContext();
    mockedCtx.projectSettings = {
      appName: testAppName,
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [fehostPlugin.name, simpleAuthPlugin.name],
        capabilities: [TabOptionItem.id],
      },
    };

    mockArmDeploymentDependencies(mockedCtx);

    fileContent.set(
      path.join(parameterFolder, "parameters.default.json"),
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
                outputs: testArmTemplateOutput,
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
    chai.assert.isTrue(result.isErr());
    chai.assert.strictEqual(usedExistingParameterDefaultFile, true);
  });

  function mockArmDeploymentDependencies(mockedCtx: SolutionContext) {
    mockedCtx.envInfo.profile.set(
      SOLUTION_CONFIG,
      new ConfigMap([
        ["resourceGroupName", "mocked resource group name"],
        ["resourceNameSuffix", testResourceSuffix],
      ])
    );

    mockedCtx.azureAccountProvider!.getAccountCredentialAsync = async function () {
      const azureToken = new UserTokenCredentials(
        testClientId,
        "test_domain",
        "test_username",
        "test_password"
      );
      return azureToken;
    };

    mockedCtx.azureAccountProvider!.getSelectedSubscription = async function () {
      const subscriptionInfo = {
        subscriptionId: "test_subsctiption_id",
        subscriptionName: "test_subsctiption_name",
      } as SubscriptionInfo;
      return subscriptionInfo;
    };

    mocker.stub(Executor, "execCommandAsync").callsFake(
      (command: string, options?: ExecOptions): Promise<void> => {
        return new Promise((resolve) => {
          resolve();
        });
      }
    );
  }
});
