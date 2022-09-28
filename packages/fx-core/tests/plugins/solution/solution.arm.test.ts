// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  ConfigMap,
  Err,
  FxError,
  ok,
  SolutionContext,
  AzureSolutionSettings,
  UserError,
  ProjectSettingsV3,
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
  copyParameterJson,
  deployArmTemplates,
  formattedDeploymentError,
  generateArmTemplate,
  pollDeploymentStatus,
} from "../../../src/plugins/solution/fx-solution/arm";
import * as arm from "../../../src/plugins/solution/fx-solution/arm";
import path from "path";
import mockedEnv from "mocked-env";
import { ResourceManagementModels, Deployments } from "@azure/arm-resources";
import { WebResourceLike, HttpHeaders } from "@azure/ms-rest-js";
import * as tools from "../../../src/common/tools";
import { environmentManager } from "../../../src/core/environment";
import {
  aadPlugin,
  ErrorName,
  fehostPlugin,
  fileEncoding,
  identityPlugin,
  SOLUTION_CONFIG_NAME,
  TestFileContent,
  TestFilePath,
} from "../../constants";
import os from "os";

import "mocha";
import chai, { assert, expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { TestHelper } from "./helper";
import * as bicepChecker from "../../../src/plugins/solution/fx-solution/utils/depsChecker/bicepChecker";
chai.use(chaiAsPromised);
import { MockedLogProvider } from "./util";
import { SolutionError } from "../../../src/plugins/solution/fx-solution/constants";
import { ComponentNames } from "../../../src/component/constants";

describe("Generate ARM Template for project", () => {
  const mocker = sinon.createSandbox();
  let mockedCtx: SolutionContext;

  beforeEach(async () => {
    mockedCtx = TestHelper.mockSolutionContext();
    mocker.stub(environmentManager, "listRemoteEnvConfigs").resolves(ok(["default"]));
    mocker.stub(environmentManager, "listAllEnvConfigs").resolves(ok(["default", "local"]));
    mocker.stub(tools, "getUuid").returns("00000000-0000-0000-0000-000000000000");
    await fs.ensureDir(TestHelper.rootDir);
  });

  afterEach(async () => {
    await fs.remove(TestHelper.rootDir);
    mocker.restore();
  });

  it("should do nothing when no plugin implements generateArmTemplate interface", async () => {
    // Arrange
    mockedCtx.projectSettings!.solutionSettings = {
      hostType: HostTypeOptionSPFx.id,
      name: "spfx",
      activeResourcePlugins: [],
      capabilities: [TabOptionItem.id],
    };

    // Action
    const result = await generateArmTemplate(mockedCtx, []);

    // Assert
    expect(result.isOk()).to.be.true;
    expect(await fs.pathExists(path.join(TestHelper.rootDir, TestFilePath.armTemplateBaseFolder)))
      .to.be.false;
  });

  it("should successfully generate arm templates only tab", async () => {
    // Arrange
    mockedCtx.projectSettings!.solutionSettings = {
      hostType: HostTypeOptionAzure.id,
      name: "azure",
      activeResourcePlugins: [aadPlugin.name, fehostPlugin.name, identityPlugin.name],
      capabilities: [TabOptionItem.id],
    };
    TestHelper.mockedFehostGenerateArmTemplates(mocker);
    TestHelper.mockedIdentityGenerateArmTemplates(mocker);

    // Action
    const result = await generateArmTemplate(mockedCtx, [aadPlugin, fehostPlugin, identityPlugin]);

    // Assert
    const projectArmTemplateFolder = path.join(
      TestHelper.rootDir,
      TestFilePath.armTemplateBaseFolder
    );
    expect(result.isOk()).to.be.true;
    const projectMainBicep = await fs.readFile(
      path.join(projectArmTemplateFolder, TestFilePath.mainFileName),
      fileEncoding
    );
    expect(projectMainBicep.replace(/\r?\n/g, os.EOL)).equals(
      `@secure()
param provisionParameters object

module provision './provision.bicep' = {
  name: 'provisionResources'
  params: {
    provisionParameters: provisionParameters
  }
}
output provisionOutput object = provision
`.replace(/\r?\n/g, os.EOL)
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
Mocked identity provision orchestration content. Module path: './provision/identityProvision.bicep'.`.replace(
        /\r?\n/g,
        os.EOL
      )
    );

    expect(await fs.pathExists(path.join(projectArmTemplateFolder, TestFilePath.configFileName))).to
      .be.false;

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
      await fs.pathExists(
        path.join(
          projectArmTemplateFolder,
          TestFilePath.provisionFolder,
          TestFilePath.aadProvisionFileName
        )
      )
    ).to.be.false;
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
      await fs.pathExists(path.join(projectArmTemplateFolder, TestFilePath.configurationFolder))
    ).to.be.false;

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
      TestHelper.getParameterFileContent({
        resourceBaseName: `${TestHelper.resourceBaseName}`,
        FrontendParameter: `${TestFileContent.feHostParameterValue}`,
        IdentityParameter: `${TestFileContent.identityParameterValue}`,
      })
    );
  });

  //   it("add bot capability on tab app success", async () => {
  //     // Arrange
  //     mockedCtx.projectSettings!.solutionSettings = {
  //       hostType: HostTypeOptionAzure.id,
  //       name: "azure",
  //       activeResourcePlugins: [aadPlugin.name, fehostPlugin.name, identityPlugin.name],
  //       capabilities: [TabOptionItem.id],
  //     };
  //     TestHelper.mockedFehostGenerateArmTemplates(mocker);
  //     TestHelper.mockedIdentityGenerateArmTemplates(mocker);
  //     const botGenerateArmTemplatesStub = TestHelper.mockedBotGenerateArmTemplates(mocker);
  //
  //     const botUpdateArmTemplatesStub = TestHelper.mockedBotUpdateArmTemplates(mocker);
  //     TestHelper.mockedFeHostUpdateArmTemplates(mocker);
  //     TestHelper.mockedIdentityUpdateArmTemplates(mocker);
  //
  //     // Scaffold tab project
  //     let result = await generateArmTemplate(mockedCtx, [aadPlugin, fehostPlugin, identityPlugin]);
  //     const projectArmTemplateFolder = path.join(
  //       TestHelper.rootDir,
  //       TestFilePath.armTemplateBaseFolder
  //     );
  //     expect(result.isOk()).to.be.true;
  //     expect(
  //       await fs.readFile(
  //         path.join(
  //           TestHelper.rootDir,
  //           TestFilePath.configFolder,
  //           TestFilePath.defaultParameterFileName
  //         ),
  //         fileEncoding
  //       )
  //     ).equals(
  //       TestHelper.getParameterFileContent({
  //         resourceBaseName: `${TestHelper.resourceBaseName}`,
  //         FrontendParameter: `${TestFileContent.feHostParameterValue}`,
  //         IdentityParameter: `${TestFileContent.identityParameterValue}`,
  //       })
  //     );
  //     expect(await fs.pathExists(path.join(projectArmTemplateFolder, TestFilePath.configFileName))).to
  //       .be.false;
  //     expect(await fs.pathExists(path.join(projectArmTemplateFolder, TestFilePath.provisionFileName)))
  //       .to.be.true;
  //     expect(
  //       await fs.pathExists(
  //         path.join(
  //           projectArmTemplateFolder,
  //           TestFilePath.provisionFolder,
  //           TestFilePath.botProvisionFileName
  //         )
  //       )
  //     ).to.be.false;
  //     expect(
  //       await fs.pathExists(path.join(projectArmTemplateFolder, TestFilePath.configurationFolder))
  //     ).to.be.false;
  //     assert(botGenerateArmTemplatesStub.notCalled);
  //     assert(botUpdateArmTemplatesStub.notCalled);
  //
  //     // Add bot capability
  //     (
  //       mockedCtx.projectSettings!.solutionSettings as AzureSolutionSettings
  //     ).activeResourcePlugins.push(botPluginV2.name);
  //     (mockedCtx.projectSettings!.solutionSettings as AzureSolutionSettings).capabilities.push(
  //       BotOptionItem.id
  //     );
  //     result = await generateArmTemplate(mockedCtx, [botPluginV2]);
  //
  //     expect(result.isOk()).to.be.true;
  //     expect(
  //       await fs.readFile(
  //         path.join(
  //           TestHelper.rootDir,
  //           TestFilePath.configFolder,
  //           TestFilePath.defaultParameterFileName
  //         ),
  //         fileEncoding
  //       )
  //     ).equals(
  //       TestHelper.getParameterFileContent({
  //         resourceBaseName: `${TestHelper.resourceBaseName}`,
  //         FrontendParameter: `${TestFileContent.feHostParameterValue}`,
  //         IdentityParameter: `${TestFileContent.identityParameterValue}`,
  //         BotParameter: `${TestFileContent.botParameterValue}`,
  //       })
  //     );
  //     expect(
  //       await fs.readFile(
  //         path.join(
  //           projectArmTemplateFolder,
  //           TestFilePath.provisionFolder,
  //           TestFilePath.botProvisionFileName
  //         ),
  //         fileEncoding
  //       )
  //     ).equals(TestFileContent.botProvisionModule);
  //     expect(
  //       await fs.readFile(
  //         path.join(
  //           projectArmTemplateFolder,
  //           TestFilePath.configurationFolder,
  //           TestFilePath.botConfigFileName
  //         ),
  //         fileEncoding
  //       )
  //     ).equals(TestFileContent.botConfigurationModule);
  //     assert(botGenerateArmTemplatesStub.calledOnce);
  //     assert(botUpdateArmTemplatesStub.notCalled);
  //
  //     expect(
  //       await fs.readFile(
  //         path.join(projectArmTemplateFolder, TestFilePath.provisionFileName),
  //         fileEncoding
  //       )
  //     ).equals(
  //       `@secure()
  // param provisionParameters object
  // Mocked frontend hosting provision orchestration content. Module path: './provision/frontendHostingProvision.bicep'.
  // Mocked identity provision orchestration content. Module path: './provision/identityProvision.bicep'.
  // Mocked bot provision orchestration content. Module path: './provision/botProvision.bicep'.`.replace(
  //         /\r?\n/g,
  //         os.EOL
  //       )
  //     );
  //
  //     expect(
  //       await fs.readFile(
  //         path.join(projectArmTemplateFolder, TestFilePath.configFileName),
  //         fileEncoding
  //       )
  //     ).equals(
  //       `@secure()
  // param provisionParameters object
  // param provisionOutputs object
  // Mocked bot configuration orchestration content. Module path: './teamsFx/botConfig.bicep'.`.replace(
  //         /\r?\n/g,
  //         os.EOL
  //       )
  //     );
  //   });

  //   it("add bot capability on tab app with simple auth success", async () => {
  //     // Arrange
  //     mockedCtx.projectSettings!.solutionSettings = {
  //       hostType: HostTypeOptionAzure.id,
  //       name: "azure",
  //       activeResourcePlugins: [
  //         aadPlugin.name,
  //         fehostPlugin.name,
  //         identityPlugin.name,
  //       ],
  //       capabilities: [TabOptionItem.id],
  //     };
  //     TestHelper.mockedFehostGenerateArmTemplates(mocker);
  //     TestHelper.mockedAadGenerateArmTemplates(mocker);
  //     TestHelper.mockedIdentityGenerateArmTemplates(mocker);
  //     TestHelper.mockedBotGenerateArmTemplates(mocker);
  //     TestHelper.mockedFeHostUpdateArmTemplates(mocker);
  //     TestHelper.mockedIdentityUpdateArmTemplates(mocker);
  //     // TestHelper.mockedSimpleAuthUpdateArmTemplates(mocker);
  //     // Action
  //     let result = await generateArmTemplate(mockedCtx, [
  //       aadPlugin,
  //       fehostPlugin,
  //       identityPlugin,
  //     ]);

  //     // Assert
  //     const projectArmTemplateFolder = path.join(
  //       TestHelper.rootDir,
  //       TestFilePath.armTemplateBaseFolder
  //     );
  //     expect(result.isOk()).to.be.true;
  //     const projectMainBicep = await fs.readFile(
  //       path.join(projectArmTemplateFolder, TestFilePath.mainFileName),
  //       fileEncoding
  //     );
  //     expect(projectMainBicep.replace(/\r?\n/g, os.EOL)).equals(
  //       `@secure()
  // param provisionParameters object

  // module provision './provision.bicep' = {
  //   name: 'provisionResources'
  //   params: {
  //     provisionParameters: provisionParameters
  //   }
  // }
  // output provisionOutput object = provision
  // module teamsFxConfig './config.bicep' = {
  //   name: 'addTeamsFxConfigurations'
  //   params: {
  //     provisionParameters: provisionParameters
  //     provisionOutputs: provision
  //   }
  // }
  // output teamsFxConfigurationOutput object = contains(reference(resourceId('Microsoft.Resources/deployments', teamsFxConfig.name), '2020-06-01'), 'outputs') ? teamsFxConfig : {}
  // `.replace(/\r?\n/g, os.EOL)
  //     );
  //     const projectConfigBicep = await fs.readFile(
  //       path.join(projectArmTemplateFolder, TestFilePath.configFileName),
  //       fileEncoding
  //     );
  //     expect(projectConfigBicep.replace(/\r?\n/g, os.EOL)).equals(
  //       `@secure()
  // param provisionParameters object
  // param provisionOutputs object
  // Mocked simple auth configuration orchestration content. Module path: './teamsFx/simpleAuthConfig.bicep'.`.replace(
  //         /\r?\n/g,
  //         os.EOL
  //       )
  //     );
  //     // const simpleAuthConfigContent = await fs.readFile(
  //     //   path.join(
  //     //     projectArmTemplateFolder,
  //     //     TestFilePath.configurationFolder,
  //     //     TestFilePath.simpleAuthConfigFileName
  //     //   ),
  //     //   fileEncoding
  //     // );
  //     // expect(simpleAuthConfigContent.replace(/\r?\n/g, os.EOL)).equals(
  //     //   TestFileContent.simpleAuthConfigurationModule
  //     // );

  //     expect(
  //       await fs.pathExists(path.join(projectArmTemplateFolder, TestFilePath.configurationFolder))
  //     ).to.be.true;
  //     // Add bot capability
  //     (
  //       mockedCtx.projectSettings!.solutionSettings as AzureSolutionSettings
  //     ).activeResourcePlugins.push(botPluginV2.name);
  //     (mockedCtx.projectSettings!.solutionSettings as AzureSolutionSettings).capabilities.push(
  //       BotOptionItem.id
  //     );
  //     result = await generateArmTemplate(mockedCtx, [botPluginV2]);

  //     const projectMainBicepWithBot = await fs.readFile(
  //       path.join(projectArmTemplateFolder, TestFilePath.mainFileName),
  //       fileEncoding
  //     );
  //     expect(projectMainBicepWithBot.replace(/\r?\n/g, os.EOL)).equals(
  //       projectMainBicep.replace(/\r?\n/g, os.EOL)
  //     );
  //     // const simpleAuthConfigContentWithBot = await fs.readFile(
  //     //   path.join(
  //     //     projectArmTemplateFolder,
  //     //     TestFilePath.configurationFolder,
  //     //     TestFilePath.simpleAuthConfigFileName
  //     //   ),
  //     //   fileEncoding
  //     // );
  //     // expect(simpleAuthConfigContentWithBot.replace(/\r?\n/g, os.EOL)).equals(
  //     //   TestFileContent.simpleAuthUpdatedConfigurationModule.replace(/\r?\n/g, os.EOL)
  //     // );
  //     expect(
  //       await fs.readFile(
  //         path.join(projectArmTemplateFolder, TestFilePath.configFileName),
  //         fileEncoding
  //       )
  //     ).equals(
  //       `@secure()
  // param provisionParameters object
  // param provisionOutputs object
  // Mocked simple auth configuration orchestration content. Module path: './teamsFx/simpleAuthConfig.bicep'.
  // Mocked bot configuration orchestration content. Module path: './teamsFx/botConfig.bicep'.`.replace(
  //         /\r?\n/g,
  //         os.EOL
  //       )
  //     );

  //     expect(
  //       await fs.readFile(
  //         path.join(
  //           projectArmTemplateFolder,
  //           TestFilePath.configurationFolder,
  //           TestFilePath.botConfigFileName
  //         ),
  //         fileEncoding
  //       )
  //     ).equals(TestFileContent.botConfigurationModule);
  //   });

  //   it("add tab capibility to bot to check config bicep update", async () => {
  //     // Arrange
  //     mockedCtx.projectSettings!.solutionSettings = {
  //       hostType: HostTypeOptionAzure.id,
  //       name: "azure",
  //       activeResourcePlugins: [aadPlugin.name, botPluginV2.name, identityPlugin.name],
  //       capabilities: [BotOptionItem.id],
  //     };
  //     TestHelper.mockedFehostGenerateArmTemplates(mocker);
  //     TestHelper.mockedIdentityGenerateArmTemplates(mocker);
  //     TestHelper.mockedBotGenerateArmTemplates(mocker);
  //     TestHelper.mockedBotUpdateArmTemplates(mocker);
  //     TestHelper.mockedFeHostUpdateArmTemplates(mocker);
  //     TestHelper.mockedIdentityUpdateArmTemplates(mocker);
  //
  //     // Action
  //     let result = await generateArmTemplate(mockedCtx, [aadPlugin, botPluginV2, identityPlugin]);
  //
  //     // Assert
  //     const projectArmTemplateFolder = path.join(
  //       TestHelper.rootDir,
  //       TestFilePath.armTemplateBaseFolder
  //     );
  //     expect(result.isOk()).to.be.true;
  //     const projectMainBicep = await fs.readFile(
  //       path.join(projectArmTemplateFolder, TestFilePath.mainFileName),
  //       fileEncoding
  //     );
  //     expect(projectMainBicep.replace(/\r?\n/g, os.EOL)).equals(
  //       `@secure()
  // param provisionParameters object
  //
  // module provision './provision.bicep' = {
  //   name: 'provisionResources'
  //   params: {
  //     provisionParameters: provisionParameters
  //   }
  // }
  // output provisionOutput object = provision
  // module teamsFxConfig './config.bicep' = {
  //   name: 'addTeamsFxConfigurations'
  //   params: {
  //     provisionParameters: provisionParameters
  //     provisionOutputs: provision
  //   }
  // }
  // output teamsFxConfigurationOutput object = contains(reference(resourceId('Microsoft.Resources/deployments', teamsFxConfig.name), '2020-06-01'), 'outputs') ? teamsFxConfig : {}
  // `.replace(/\r?\n/g, os.EOL)
  //     );
  //     const projectConfigBicep = await fs.readFile(
  //       path.join(projectArmTemplateFolder, TestFilePath.configFileName),
  //       fileEncoding
  //     );
  //     expect(projectConfigBicep.replace(/\r?\n/g, os.EOL)).equals(
  //       `@secure()
  // param provisionParameters object
  // param provisionOutputs object
  // Mocked bot configuration orchestration content. Module path: './teamsFx/botConfig.bicep'.`.replace(
  //         /\r?\n/g,
  //         os.EOL
  //       )
  //     );
  //     let botConfigContent = await fs.readFile(
  //       path.join(
  //         projectArmTemplateFolder,
  //         TestFilePath.configurationFolder,
  //         TestFilePath.botConfigFileName
  //       ),
  //       fileEncoding
  //     );
  //     expect(botConfigContent.replace(/\r?\n/g, os.EOL)).equals(
  //       TestFileContent.botConfigurationModule
  //     );
  //
  //     // Add bot capability
  //     (
  //       mockedCtx.projectSettings!.solutionSettings as AzureSolutionSettings
  //     ).activeResourcePlugins.push(fehostPlugin.name);
  //     (mockedCtx.projectSettings!.solutionSettings as AzureSolutionSettings).capabilities.push(
  //       TabOptionItem.id
  //     );
  //     result = await generateArmTemplate(mockedCtx, [fehostPlugin]);
  //     expect(result.isOk()).to.be.true;
  //     const projectMainBicepWithTab = await fs.readFile(
  //       path.join(projectArmTemplateFolder, TestFilePath.mainFileName),
  //       fileEncoding
  //     );
  //     expect(projectMainBicep.replace(/\r?\n/g, os.EOL)).equals(
  //       projectMainBicepWithTab.replace(/\r?\n/g, os.EOL)
  //     );
  //     const projectConfigBicepWithTab = await fs.readFile(
  //       path.join(projectArmTemplateFolder, TestFilePath.configFileName),
  //       fileEncoding
  //     );
  //     expect(projectConfigBicepWithTab.replace(/\r?\n/g, os.EOL)).equals(
  //       projectConfigBicep.replace(/\r?\n/g, os.EOL)
  //     );
  //     botConfigContent = await fs.readFile(
  //       path.join(
  //         projectArmTemplateFolder,
  //         TestFilePath.configurationFolder,
  //         TestFilePath.botConfigFileName
  //       ),
  //       fileEncoding
  //     );
  //     expect(botConfigContent.replace(/\r?\n/g, os.EOL)).equals(
  //       TestFileContent.botConfigUpdateModule
  //     );
  //   });
});

describe("Deploy ARM Template to Azure", () => {
  const mocker = sinon.createSandbox();
  let mockedCtx: SolutionContext;
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
    mockedCtx = TestHelper.mockSolutionContext();
    mockedCtx.projectSettings!.solutionSettings = {
      hostType: HostTypeOptionAzure.id,
      name: "azure",
      activeResourcePlugins: [aadPlugin.name, fehostPlugin.name, identityPlugin.name],
      capabilities: [TabOptionItem.id],
    };
    (mockedCtx.projectSettings as ProjectSettingsV3).components = [
      { name: ComponentNames.TeamsTab },
      { name: ComponentNames.AadApp },
      { name: ComponentNames.Identity },
    ];
    mockedCtx.envInfo.state.set(
      ComponentNames.AadApp,
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
    TestHelper.mockArmDeploymentDependencies(mockedCtx, mocker);

    const envRestore = mockedEnv({
      MOCKED_EXPAND_VAR_TEST: TestHelper.envVariable,
    });

    let parameterAfterDeploy = "";
    let armTemplateJson = "";
    mocker.stub(bicepChecker, "ensureBicep").resolves(bicepCommand);
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
    //     expect(
    //       JSON.stringify(parameterAfterDeploy, undefined, 2).replace(/\r?\n/g, os.EOL)
    //     ).to.deep.equals(
    //       `{
    //   "provisionParameters": {
    //     "value": {
    //       "resourceBaseName": "${TestHelper.resourceBaseName}",
    //       "aadClientId": "${TestHelper.clientId}",
    //       "aadClientSecret": "${TestHelper.clientSecret}",
    //       "envValue": "${TestHelper.envVariable}"
    //     }
    //   },
    //   "envValue2": "${TestHelper.envVariable}"
    // }`.replace(/\r?\n/g, os.EOL)
    //     );

    // Assert arm output is successfully set in context
    chai.assert.strictEqual(
      mockedCtx.envInfo.state.get(ComponentNames.TeamsTab)?.get("frontendHostingOutputKey"),
      TestHelper.frontendhostingOutputValue
    );
    chai.assert.strictEqual(
      mockedCtx.envInfo.state.get(ComponentNames.Identity)?.get("identityOutputKey"),
      TestHelper.identityOutputValue
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
      TestHelper.getParameterFileContent({
        existingFileTest: "mocked value",
      })
    );

    let usedExistingParameterDefaultFile = false;
    mocker.stub(bicepChecker, "ensureBicep").resolves(bicepCommand);
    mocker
      .stub(Deployments.prototype, "createOrUpdate")
      .callsFake(
        (
          resourceGroupName: string,
          deploymentName: string,
          parameters: ResourceManagementModels.Deployment
        ) => {
          if (parameters.properties.parameters?.provisionParameters?.value?.existingFileTest) {
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

  it("should return system error if resource group name not exists in project solution settings", async () => {
    // Arrange
    mockedCtx.envInfo.state.get(SOLUTION_CONFIG_NAME)?.delete("resourceGroupName");

    // Act
    const result = await deployArmTemplates(mockedCtx);

    // Assert
    chai.assert.isTrue(result.isErr());
    const error = (result as Err<void, Error>).error;
    chai.assert.strictEqual(error.name, "NoResourceGroupFound");
    chai.assert.strictEqual(
      error.message,
      "Failed to get resource group from project solution settings."
    );
  });

  it("should return user error if target environment name not exists in project solution settings", async () => {
    // Arrange
    mockedCtx.envInfo.envName = "";

    // Act
    const result = await deployArmTemplates(mockedCtx);

    // Assert
    chai.assert.isTrue(result.isErr());
    const error = (result as Err<void, FxError>).error;
    chai.assert.strictEqual(error.name, "FailedToGetEnvironmentName");
    chai.assert.strictEqual(
      error.message,
      "Failed to get target environment name from solution context."
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
    const result = await deployArmTemplates(mockedCtx);

    // Assert
    chai.assert.isTrue(result.isErr());
    const error = (result as Err<void, FxError>).error;
    chai.assert.strictEqual(error.name, "ParameterFileNotExist");
    expect(error.message)
      .to.be.a("string")
      .that.contains("azure.parameters.default.json does not exist.");
  });

  it("should return user error if fail to ensure bicep command", async () => {
    // Arrange
    const testErrorMsg = "mock ensuring bicep command fails";
    mocker.stub(bicepChecker, "ensureBicep").throws(new Error(testErrorMsg));

    // Act
    const result = await deployArmTemplates(mockedCtx);

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
    mocker.stub(Deployments.prototype, "createOrUpdate").throwsException(thrownError);
    mocker.stub(arm, "wrapGetDeploymentError").resolves(ok(fetchError));
    mocker.stub(arm, "pollDeploymentStatus").resolves();
    mocker.stub(bicepChecker, "ensureBicep").resolves(bicepCommand);

    // Act
    const result = await deployArmTemplates(mockedCtx);

    // Assert
    chai.assert.isTrue(result.isErr());
    const returnedError = result._unsafeUnwrapErr() as UserError;
    chai.assert.isNotNull(returnedError.displayMessage);

    envRestore();
  });
});

describe("Poll Deployment Status", () => {
  const mocker = sinon.createSandbox();
  let mockedCtx: SolutionContext;
  let mockedDeployCtx: any;

  beforeEach(async () => {
    mockedCtx = TestHelper.mockSolutionContext();
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
    assert(logger.called);
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
