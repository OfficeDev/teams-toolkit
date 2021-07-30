// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ResourcePlugins } from "../../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import Container from "typedi";
import {
  AzureAccountProvider,
  ConfigMap,
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
import child_process from "child_process";

chai.use(chaiAsPromised);
const expect = chai.expect;

const fehostPlugin = Container.get<Plugin>(ResourcePlugins.FrontendPlugin) as Plugin &
  ArmResourcePlugin;
const simpleAuthPlugin = Container.get<Plugin>(ResourcePlugins.SimpleAuthPlugin) as Plugin &
  ArmResourcePlugin;
const spfxPlugin = Container.get<Plugin>(ResourcePlugins.SpfxPlugin) as Plugin & ArmResourcePlugin;
const aadPlugin = Container.get<Plugin>(ResourcePlugins.AadPlugin) as Plugin & ArmResourcePlugin;

function mockSolutionContext(testProjectDir: string): SolutionContext {
  const config: SolutionConfig = new Map();
  return {
    root: testProjectDir,
    config,
    answers: { platform: Platform.VSCode },
    projectSettings: undefined,
    azureAccountProvider: Object as any & AzureAccountProvider,
  };
}

describe("Generate ARM Template for project", () => {
  const mocker = sinon.createSandbox();
  const testProjectDir = ".";
  const fileContent: Map<string, any> = new Map();

  beforeEach(() => {
    mocker.stub(fs, "writeFile").callsFake((path: number | PathLike, data: any) => {
      fileContent.set(path.toString(), data);
    });
  });

  afterEach(() => {
    mocker.restore();
  });

  it("should do nothing when no plugin implements required interface", async () => {
    fileContent.clear();
    const mockedCtx = mockSolutionContext(testProjectDir);
    mockedCtx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
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
    fileContent.clear();
    const mockedCtx = mockSolutionContext(testProjectDir);
    mockedCtx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
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
    expect(fileContent.get(path.join("./infra/azure/templates", "main.bicep"))).equals(
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
      fileContent.get(path.join("./infra/azure/templates", "frontendHostingProvision.bicep"))
    ).equals("Mocked frontend hosting provision module content");
    expect(
      fileContent.get(path.join("./infra/azure/templates", "simpleAuthProvision.bicep"))
    ).equals("Mocked simple auth provision module content");
    expect(
      fileContent.get(path.join("./infra/azure/parameters", "parameter.template.json"))
    ).equals(
      `{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "resourceBaseName": {
      "value": "{{SOLUTION_RESOURCE_BASE_NAME}}"
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
  const testProjectDir = path.join(__dirname, "./testProject");
  let envRestore: () => void;
  const testResourceBaseName = "test_resource_base_name";
  const testClientId = "test_client_id";
  const testClientSecret = "test_client_secret";
  const testM365TenantId = "test_m365_tenant_id";
  const testM365OauthAuthorityHost = "test_M365_oauth_authority_host";
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

  beforeEach(() => {
    envRestore = mockedEnv({
      SOLUTION_RESOURCE_BASE_NAME: testResourceBaseName,
      CLIENT_ID: testClientId,
      CLIENT_SECRET: testClientSecret,
      M365_TENANT_ID: testM365TenantId,
      M365_OAUTH_AUTHORITY_HOST: testM365OauthAuthorityHost,
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

    mocker.stub(child_process, "exec");
  });

  afterEach(() => {
    envRestore();
    mocker.restore();
  });

  //   it("should successfully update parameter and deploy arm templates to azure", async () => {
  //     resultFileContent.clear();
  //     const mockedCtx = mockSolutionContext(testProjectDir);
  //     mockedCtx.projectSettings = {
  //       appName: "my app",
  //       currentEnv: "default",
  //       projectId: uuid.v4(),
  //       solutionSettings: {
  //         hostType: HostTypeOptionAzure.id,
  //         name: "azure",
  //         version: "1.0",
  //         activeResourcePlugins: [fehostPlugin.name, simpleAuthPlugin.name],
  //         capabilities: [TabOptionItem.id],
  //       },
  //     };
  //     mockedCtx.azureAccountProvider!.getAccountCredentialAsync = async function () {
  //       const azureToken = new UserTokenCredentials(
  //         testClientId,
  //         "test_domain",
  //         "test_username",
  //         "test_password"
  //       );
  //       return azureToken;
  //     };
  //     mockedCtx.azureAccountProvider!.getSelectedSubscription = async function () {
  //       const subscriptionInfo = {
  //         subscriptionId: "test_subsctiption_id",
  //         subscriptionName: "test_subsctiption_name",
  //       } as SubscriptionInfo;
  //       return subscriptionInfo;
  //     };
  //     const SOLUTION_CONFIG = "solution";
  //     if (!mockedCtx.config.has(SOLUTION_CONFIG)) {
  //       mockedCtx.config.set(SOLUTION_CONFIG, new ConfigMap());
  //     }
  //     mockedCtx.config.get(SOLUTION_CONFIG)?.set("resourceGroupName", "test_resource_group_name");

  //     await deployArmTemplates(mockedCtx);
  //     chai.assert.strictEqual(
  //       mockedCtx.config.get(SOLUTION_CONFIG)?.get("armTemplateOutput"),
  //       testArmTemplateOutput
  //     );
  //     expect(
  //       JSON.stringify(
  //         resultFileContent.get(
  //           path.join(testProjectDir, "./infra/azure/parameters/parameter.default.json")
  //         ),
  //         undefined,
  //         2
  //       )
  //     ).equals(`{
  //   "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  //   "contentVersion": "1.0.0.0",
  //   "parameters": {
  //     "resourceBaseName": {
  //       "value": "${testResourceBaseName}"
  //     },
  //     "aadClientId": {
  //       "value": "${testClientId}"
  //     },
  //     "aadClientSecret": {
  //       "value": "${testClientSecret}"
  //     },
  //     "m365TenantId": {
  //       "value": "${testM365TenantId}"
  //     },
  //     "m365OauthAuthorityHost": {
  //       "value": "${testM365OauthAuthorityHost}"
  //     }
  //   }
  // }`);
  //   });
});
