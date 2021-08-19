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

import "../../../src/plugins/resource/frontend";
import "../../../src/plugins/resource/simpleauth";
import "../../../src/plugins/resource/spfx";
import "../../../src/plugins/resource/aad";

chai.use(chaiAsPromised);
const expect = chai.expect;

const fehostPlugin = Container.get<Plugin>(ResourcePlugins.FrontendPlugin) as Plugin &
  ArmResourcePlugin;
const simpleAuthPlugin = Container.get<Plugin>(ResourcePlugins.SimpleAuthPlugin) as Plugin &
  ArmResourcePlugin;
const spfxPlugin = Container.get<Plugin>(ResourcePlugins.SpfxPlugin) as Plugin & ArmResourcePlugin;
const aadPlugin = Container.get<Plugin>(ResourcePlugins.AadPlugin) as Plugin & ArmResourcePlugin;

const parameterFolder = "./infra/azure/parameters";
const templateFolder = "./infra/azure/templates";

function mockSolutionContext(): SolutionContext {
  const config: SolutionConfig = new Map();
  return {
    root: "./",
    targetEnvName: "default",
    config,
    answers: { platform: Platform.VSCode },
    projectSettings: undefined,
    azureAccountProvider: Object as any & AzureAccountProvider,
  };
}

describe("Generate ARM Template for project", () => {
  const mocker = sinon.createSandbox();
  const testAppName = "my test app";
  const fileContent: Map<string, any> = new Map();

  beforeEach(() => {
    fileContent.clear();
    mocker.stub(fs, "writeFile").callsFake((path: number | PathLike, data: any) => {
      fileContent.set(path.toString(), data);
    });
  });

  afterEach(() => {
    mocker.restore();
  });

  it("should do nothing when no plugin implements required interface", async () => {
    const mockedCtx = mockSolutionContext();
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
    expect(fileContent.size).equals(0);
  });

  it("should output templates when plugin implements required interface", async () => {
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

    const result = await generateArmTemplate(mockedCtx);
    expect(result.isOk()).to.be.true;
    expect(fileContent.get(path.join(templateFolder, "main.bicep"))).equals(
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
    expect(fileContent.get(path.join(templateFolder, "frontendHostingProvision.bicep"))).equals(
      "Mocked frontend hosting provision module content"
    );
    expect(fileContent.get(path.join(templateFolder, "simpleAuthProvision.bicep"))).equals(
      "Mocked simple auth provision module content"
    );
    expect(fileContent.get(path.join(parameterFolder, "parameters.template.json"))).equals(
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
  });
});

describe("Deploy ARM Template to Azure", () => {
  const mocker = sinon.createSandbox();
  const testAppName = "my test app";
  let envRestore: () => void;
  const testClientId = "test_client_id";
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
  const resultFileContent: Map<string, any> = new Map();
  const SOLUTION_CONFIG = "solution";
  const inputFileContent: Map<string, any> = new Map([
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
  "envValue": {
    "value": "{{MOCKED_EXPAND_VAR_TEST}}"
  }
}
}
`,
    ],
    [path.join(templateFolder, "main.json"), `{"test_key": "test_value"}`],
  ]);

  beforeEach(() => {
    (
      mocker.stub(fs, "readFile") as unknown as sinon.SinonStub<
        [file: number | fs.PathLike],
        Promise<string>
      >
    ).callsFake((file: number | PathLike): Promise<string> => {
      return inputFileContent.get(file.toString());
    });
    mocker.stub(fs, "stat").callsFake((filePath: PathLike): Promise<fs.Stats> => {
      if (filePath === path.join(parameterFolder, "parameters.default.json")) {
        throw new Error(`${filePath} does not exist.`);
      }
      return new Promise<fs.Stats>((resolve) => {
        resolve({} as fs.Stats);
      });
    });
    mocker.stub(fs, "writeFile").callsFake((path: number | PathLike, data: any) => {
      resultFileContent.set(path.toString(), data);
    });
    mocker.stub(Deployments.prototype, "createOrUpdate").resolves({
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

    resultFileContent.clear();
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
    mockedCtx.config.set(
      "fx-resource-aad-app-for-teams",
      new ConfigMap([["clientId", testClientId]])
    );
    mockedCtx.config.set(
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
    chai.assert.strictEqual(error.name, "FailedToDeployArmTemplatesToAzure");
    chai.assert.isTrue(
      error.message.startsWith("Failed to compile bicep files to Json arm templates file:")
    );
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
    mockedCtx.config.set(
      "fx-resource-aad-app-for-teams",
      new ConfigMap([["clientId", testClientId]])
    );
    mockedCtx.config.set(
      SOLUTION_CONFIG,
      new ConfigMap([
        ["resourceGroupName", "mocked resource group name"],
        ["resourceNameSuffix", testResourceSuffix],
      ])
    );
    envRestore = mockedEnv({
      MOCKED_EXPAND_VAR_TEST: testEnvValue,
    });

    mocker
      .stub(Executor, "execCommandAsync")
      .callsFake((command: string, options?: ExecOptions): Promise<void> => {
        return new Promise((resolve) => {
          resolve();
        });
      });

    // Act
    await deployArmTemplates(mockedCtx);

    // Assert
    expect(
      JSON.parse(resultFileContent.get(path.join(parameterFolder, "parameters.default.json")))
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
        "envValue": {
          "value": "${testEnvValue}"
        }
      }
      }`)
    );
    chai.assert.strictEqual(
      mockedCtx.config.get(SOLUTION_CONFIG)?.get("armTemplateOutput"),
      testArmTemplateOutput
    );
  });
});
