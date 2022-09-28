import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as fs from "fs-extra";
import { ConfigFolderName, InputConfigsFolderName, Inputs, Platform } from "@microsoft/teamsfx-api";
import * as path from "path";
import * as uuid from "uuid";
import { MockedV2Context } from "../util";
import {
  scaffoldLocalDebugSettings,
  updateNgrokConfigFile,
} from "../../../../src/plugins/solution/fx-solution/debug/scaffolding";
import {
  AzureSolutionQuestionNames,
  BotScenario,
} from "../../../../src/plugins/solution/fx-solution/question";
import { PluginBot } from "../../../../src/component/resource/botService/strings";
import { isAadManifestEnabled } from "../../../../src/common/tools";
import { BotHostTypes } from "../../../../src/common/local/constants";
import { BotCapabilities } from "../../../../src/component/feature/bot/constants";

chai.use(chaiAsPromised);

interface TestParameter {
  programmingLanguage: string;
  numConfigurations: number;
  numCompounds: number;
  numTasks: number;
  numLocalEnvs: number;
}

describe("solution.debug.scaffolding", () => {
  const expectedLaunchFile = path.resolve(__dirname, "./data/.vscode/launch.json");
  const expectedLocalEnvFile = path.resolve(__dirname, `./data/.${ConfigFolderName}/local.env`);
  const expectedLocalSettingsFile = path.resolve(
    __dirname,
    `./data/.${ConfigFolderName}/${InputConfigsFolderName}/localSettings.json`
  );
  const expectedSettingsFile = path.resolve(__dirname, "./data/.vscode/settings.json");
  const expectedTasksFile = path.resolve(__dirname, "./data/.vscode/tasks.json");
  const expectedNgrokConfigFile = path.resolve(
    __dirname,
    `./data/.${ConfigFolderName}/${InputConfigsFolderName}/ngrok.yml`
  );

  describe("updateNgrokConfigFile", () => {
    beforeEach(() => {
      fs.emptyDirSync(path.resolve(__dirname, "./data/"));
      fs.ensureDirSync(
        path.resolve(__dirname, `./data/.${ConfigFolderName}/${InputConfigsFolderName}`)
      );
    });

    it(`happy path: bot`, async () => {
      await updateNgrokConfigFile(true, expectedNgrokConfigFile);
      const hasNgrokConfigFile = await fs.pathExists(expectedNgrokConfigFile);
      chai.assert.isTrue(hasNgrokConfigFile);
    });

    it(`happy path: tab`, async () => {
      await updateNgrokConfigFile(false, expectedNgrokConfigFile);
      const hasNgrokConfigFile = await fs.pathExists(expectedNgrokConfigFile);
      chai.assert.isFalse(hasNgrokConfigFile);
    });
  });

  describe("scaffoldLocalDebugSettings", () => {
    let inputs: Inputs;

    beforeEach(() => {
      inputs = {
        platform: Platform.VSCode,
        projectPath: path.resolve(__dirname, "./data/"),
      };
      fs.emptyDirSync(inputs.projectPath!);
    });

    const parameters1: TestParameter[] = [
      {
        programmingLanguage: "javascript",
        numConfigurations: 5,
        numCompounds: 2,
        numTasks: 6,
        numLocalEnvs: 21,
      },
      {
        programmingLanguage: "typescript",
        numConfigurations: 5,
        numCompounds: 2,
        numTasks: 7,
        numLocalEnvs: 21,
      },
    ];
    parameters1.forEach((parameter: TestParameter) => {
      it(`happy path: tab with function (${parameter.programmingLanguage})`, async () => {
        const projectSetting = {
          appName: "",
          projectId: uuid.v4(),
          solutionSettings: {
            name: "",
            version: "",
            hostType: "Azure",
            capabilities: ["Tab"],
            azureResources: ["function"],
            activeResourcePlugins: ["fx-resource-aad-app-for-teams"],
          },
          components: [{ name: "teams-tab" }, { name: "teams-api" }, { name: "aad-app" }],
          programmingLanguage: parameter.programmingLanguage,
        };
        const v2Context = new MockedV2Context(projectSetting);
        const result = await scaffoldLocalDebugSettings(v2Context, inputs);
        chai.assert.isTrue(result.isOk());

        //assert output launch.json
        const launch = fs.readJSONSync(expectedLaunchFile);
        const configurations: [] = launch["configurations"];
        const compounds: [] = launch["compounds"];
        chai.assert.equal(configurations.length, parameter.numConfigurations);
        chai.assert.equal(compounds.length, parameter.numCompounds);

        //assert output tasks.json
        const tasksAll = fs.readJSONSync(expectedTasksFile);
        const tasks: [] = tasksAll["tasks"];
        chai.assert.equal(tasks.length, parameter.numTasks);

        //assert output settings.json
        const settings = fs.readJSONSync(expectedSettingsFile);
        chai.assert.isTrue(
          Object.keys(settings).some((key) => key === "azureFunctions.stopFuncTaskPostDebug")
        );
        chai.assert.equal(settings["azureFunctions.stopFuncTaskPostDebug"], false);
        if (isAadManifestEnabled()) {
          chai.assert.equal(Object.keys(settings).length, 5);
          chai.assert.deepEqual(settings["json.schemas"], [
            {
              fileMatch: ["/aad.*.json"],
              schema: {},
            },
          ]);
        } else {
          chai.assert.equal(Object.keys(settings).length, 4);
        }
      });
    });

    const parameters2: TestParameter[] = [
      {
        programmingLanguage: "javascript",
        numConfigurations: 4,
        numCompounds: 2,
        numTasks: 5,
        numLocalEnvs: 7,
      },
      {
        programmingLanguage: "typescript",
        numConfigurations: 4,
        numCompounds: 2,
        numTasks: 5,
        numLocalEnvs: 7,
      },
    ];
    parameters2.forEach((parameter) => {
      it(`happy path: tab without function (${parameter.programmingLanguage})`, async () => {
        const projectSetting = {
          appName: "",
          projectId: uuid.v4(),
          solutionSettings: {
            name: "",
            version: "",
            hostType: "Azure",
            capabilities: ["Tab"],
            activeResourcePlugins: ["fx-resource-aad-app-for-teams"],
          },
          components: [{ name: "teams-tab" }, { name: "aad-app" }],
          programmingLanguage: parameter.programmingLanguage,
        };
        const v2Context = new MockedV2Context(projectSetting);
        const result = await scaffoldLocalDebugSettings(v2Context, inputs);
        chai.assert.isTrue(result.isOk());

        //assert output launch.json
        const launch = fs.readJSONSync(expectedLaunchFile);
        const configurations: [] = launch["configurations"];
        const compounds: [] = launch["compounds"];
        chai.assert.equal(configurations.length, parameter.numConfigurations);
        chai.assert.equal(compounds.length, parameter.numCompounds);

        //assert output tasks.json
        const tasksAll = fs.readJSONSync(expectedTasksFile);
        const tasks: [] = tasksAll["tasks"];
        chai.assert.equal(tasks.length, parameter.numTasks);

        //assert output settings.json
        const settings = fs.readJSONSync(expectedSettingsFile);
        if (isAadManifestEnabled()) {
          chai.assert.equal(Object.keys(settings).length, 2);
          chai.assert.deepEqual(settings["json.schemas"], [
            {
              fileMatch: ["/aad.*.json"],
              schema: {},
            },
          ]);
        } else {
          chai.assert.equal(Object.keys(settings).length, 1);
        }
      });

      it(`happy path: tab with Simple Auth and without function (${parameter.programmingLanguage})`, async () => {
        const projectSetting = {
          appName: "",
          projectId: uuid.v4(),
          solutionSettings: {
            name: "",
            version: "",
            hostType: "Azure",
            capabilities: ["Tab"],
            activeResourcePlugins: ["fx-resource-aad-app-for-teams", "fx-resource-simple-auth"],
          },
          components: [{ name: "teams-tab" }, { name: "aad-app" }, { name: "simple-auth" }],
          programmingLanguage: parameter.programmingLanguage,
        };
        const v2Context = new MockedV2Context(projectSetting);
        const result = await scaffoldLocalDebugSettings(v2Context, inputs);
        chai.assert.isTrue(result.isOk());

        //assert output launch.json
        const launch = fs.readJSONSync(expectedLaunchFile);
        const configurations: [] = launch["configurations"];
        const compounds: [] = launch["compounds"];
        chai.assert.equal(configurations.length, parameter.numConfigurations);
        chai.assert.equal(compounds.length, parameter.numCompounds);

        //assert output tasks.json
        const tasksAll = fs.readJSONSync(expectedTasksFile);
        const tasks: [] = tasksAll["tasks"];
        chai.assert.equal(tasks.length, parameter.numTasks);

        //assert output settings.json
        const settings = fs.readJSONSync(expectedSettingsFile);
        if (isAadManifestEnabled()) {
          chai.assert.equal(Object.keys(settings).length, 2);
          chai.assert.deepEqual(settings["json.schemas"], [
            {
              fileMatch: ["/aad.*.json"],
              schema: {},
            },
          ]);
        } else {
          chai.assert.equal(Object.keys(settings).length, 1);
        }
      });

      it(`happy path: tab without function (${parameter.programmingLanguage}) and AAD`, async () => {
        const projectSetting = {
          appName: "",
          projectId: uuid.v4(),
          solutionSettings: {
            name: "",
            version: "",
            hostType: "Azure",
            capabilities: ["Tab"],
            activeResourcePlugins: [],
          },
          components: [{ name: "teams-tab" }],
          programmingLanguage: parameter.programmingLanguage,
        };
        const v2Context = new MockedV2Context(projectSetting);
        const result = await scaffoldLocalDebugSettings(v2Context, inputs);
        chai.assert.isTrue(result.isOk());

        //assert output launch.json
        const launch = fs.readJSONSync(expectedLaunchFile);
        const configurations: [] = launch["configurations"];
        const compounds: [] = launch["compounds"];
        chai.assert.equal(configurations.length, parameter.numConfigurations);
        chai.assert.equal(compounds.length, parameter.numCompounds);

        //assert output tasks.json
        const tasksAll = fs.readJSONSync(expectedTasksFile);
        const tasks: [] = tasksAll["tasks"];
        chai.assert.equal(tasks.length, parameter.numTasks);

        //assert output settings.json
        const settings = fs.readJSONSync(expectedSettingsFile);
        if (isAadManifestEnabled()) {
          chai.assert.equal(Object.keys(settings).length, 2);
          chai.assert.deepEqual(settings["json.schemas"], [
            {
              fileMatch: ["/aad.*.json"],
              schema: {},
            },
          ]);
        } else {
          chai.assert.equal(Object.keys(settings).length, 1);
        }
      });
    });

    const parameters3: TestParameter[] = [
      {
        programmingLanguage: "javascript",
        numConfigurations: 5,
        numCompounds: 2,
        numTasks: 6,
        numLocalEnvs: 12,
      },
      {
        programmingLanguage: "typescript",
        numConfigurations: 5,
        numCompounds: 2,
        numTasks: 6,
        numLocalEnvs: 12,
      },
    ];
    parameters3.forEach((parameter) => {
      it(`happy path: bot (${parameter.programmingLanguage})`, async () => {
        const projectSetting = {
          appName: "",
          projectId: uuid.v4(),
          solutionSettings: {
            name: "",
            version: "",
            hostType: "Azure",
            capabilities: ["Bot"],
          },
          components: [{ name: "teams-bot" }],
          programmingLanguage: parameter.programmingLanguage,
        };
        const v2Context = new MockedV2Context(projectSetting);
        const result = await scaffoldLocalDebugSettings(v2Context, inputs);
        chai.assert.isTrue(result.isOk());

        //assert output launch.json
        const launch = fs.readJSONSync(expectedLaunchFile);
        const configurations: [] = launch["configurations"];
        const compounds: [] = launch["compounds"];
        chai.assert.equal(configurations.length, parameter.numConfigurations);
        chai.assert.equal(compounds.length, parameter.numCompounds);

        //assert output tasks.json
        const tasksAll = fs.readJSONSync(expectedTasksFile);
        const tasks: [] = tasksAll["tasks"];
        chai.assert.equal(tasks.length, parameter.numTasks);

        //assert output settings.json
        const settings = fs.readJSONSync(expectedSettingsFile);
        if (isAadManifestEnabled()) {
          chai.assert.equal(Object.keys(settings).length, 2);
          chai.assert.deepEqual(settings["json.schemas"], [
            {
              fileMatch: ["/aad.*.json"],
              schema: {},
            },
          ]);
        } else {
          chai.assert.equal(Object.keys(settings).length, 1);
        }
      });

      it(`happy path: app service hosted command and response bot (${parameter.programmingLanguage})`, async () => {
        const projectSetting = {
          appName: "",
          projectId: uuid.v4(),
          solutionSettings: {
            name: "",
            version: "",
            hostType: "Azure",
            capabilities: ["Bot"],
          },
          components: [{ name: "teams-bot", hosting: "azure-web-app" }],
          programmingLanguage: parameter.programmingLanguage,
          pluginSettings: {
            [PluginBot.PLUGIN_NAME]: {
              [PluginBot.HOST_TYPE]: BotHostTypes.AppService,
              [PluginBot.BOT_CAPABILITIES]: [BotCapabilities.COMMAND_AND_RESPONSE],
            },
          },
        };
        const v2Context = new MockedV2Context(projectSetting);
        inputs[AzureSolutionQuestionNames.Scenarios] = [BotScenario.NotificationBot];
        const result = await scaffoldLocalDebugSettings(v2Context, inputs);
        chai.assert.isTrue(result.isOk());

        //assert output launch.json
        const launch = fs.readJSONSync(expectedLaunchFile);
        const configurations: [] = launch["configurations"];
        const compounds: [] = launch["compounds"];
        chai.assert.equal(configurations.length, parameter.numConfigurations);
        chai.assert.equal(compounds.length, parameter.numCompounds);

        //assert output tasks.json
        const tasksAll = fs.readJSONSync(expectedTasksFile);
        const tasks: [] = tasksAll["tasks"];
        chai.assert.equal(tasks.length, parameter.numTasks);

        //assert output settings.json
        const settings = fs.readJSONSync(expectedSettingsFile);
        if (isAadManifestEnabled()) {
          chai.assert.equal(Object.keys(settings).length, 2);
          chai.assert.deepEqual(settings["json.schemas"], [
            {
              fileMatch: ["/aad.*.json"],
              schema: {},
            },
          ]);
        } else {
          chai.assert.equal(Object.keys(settings).length, 1);
        }
      });
    });
    const parameters99: TestParameter[] = [
      {
        programmingLanguage: "javascript",
        numConfigurations: 5,
        numCompounds: 2,
        numTasks: 7,
        numLocalEnvs: 12,
      },
      {
        programmingLanguage: "typescript",
        numConfigurations: 5,
        numCompounds: 2,
        numTasks: 8,
        numLocalEnvs: 12,
      },
    ];
    parameters99.forEach((parameter) => {
      it(`happy path: func hosted bot (${parameter.programmingLanguage})`, async () => {
        const projectSetting = {
          appName: "",
          projectId: uuid.v4(),
          solutionSettings: {
            name: "",
            version: "",
            hostType: "Azure",
            capabilities: ["Bot"],
          },
          components: [{ name: "teams-bot", hosting: "azure-function" }],
          programmingLanguage: parameter.programmingLanguage,
          pluginSettings: {
            [PluginBot.PLUGIN_NAME]: {
              [PluginBot.HOST_TYPE]: BotHostTypes.AzureFunctions,
              [PluginBot.BOT_CAPABILITIES]: [BotCapabilities.NOTIFICATION],
            },
          },
        };
        const v2Context = new MockedV2Context(projectSetting);
        inputs[AzureSolutionQuestionNames.Scenarios] = [BotScenario.NotificationBot];
        const result = await scaffoldLocalDebugSettings(v2Context, inputs);
        chai.assert.isTrue(result.isOk());

        //assert output launch.json
        const launch = fs.readJSONSync(expectedLaunchFile);
        const configurations: [] = launch["configurations"];
        const compounds: [] = launch["compounds"];
        chai.assert.equal(configurations.length, parameter.numConfigurations);
        chai.assert.equal(compounds.length, parameter.numCompounds);

        //assert output tasks.json
        const tasksAll = fs.readJSONSync(expectedTasksFile);
        const tasks: [] = tasksAll["tasks"];
        chai.assert.equal(tasks.length, parameter.numTasks);

        //assert output settings.json
        // settings is the same as function projects
        const settings = fs.readJSONSync(expectedSettingsFile);
        chai.assert.isTrue(
          Object.keys(settings).some((key) => key === "azureFunctions.stopFuncTaskPostDebug")
        );
        chai.assert.equal(settings["azureFunctions.stopFuncTaskPostDebug"], false);
        if (isAadManifestEnabled()) {
          chai.assert.equal(Object.keys(settings).length, 5);
          chai.assert.deepEqual(settings["json.schemas"], [
            {
              fileMatch: ["/aad.*.json"],
              schema: {},
            },
          ]);
        } else {
          chai.assert.equal(Object.keys(settings).length, 4);
        }
      });
    });

    const parameters4: TestParameter[] = [
      {
        programmingLanguage: "javascript",
        numConfigurations: 6,
        numCompounds: 2,
        numTasks: 8,
        numLocalEnvs: 33,
      },
      {
        programmingLanguage: "typescript",
        numConfigurations: 6,
        numCompounds: 2,
        numTasks: 9,
        numLocalEnvs: 33,
      },
    ];
    parameters4.forEach((parameter) => {
      it(`happy path: tab with function and bot (${parameter.programmingLanguage})`, async () => {
        const projectSetting = {
          appName: "",
          projectId: uuid.v4(),
          solutionSettings: {
            name: "",
            version: "",
            hostType: "Azure",
            capabilities: ["Tab", "Bot"],
            azureResources: ["function"],
            activeResourcePlugins: ["fx-resource-aad-app-for-teams"],
          },
          components: [
            { name: "teams-bot" },
            { name: "teams-tab" },
            { name: "teams-api" },
            { name: "aad-app" },
          ],
          programmingLanguage: parameter.programmingLanguage,
        };
        const v2Context = new MockedV2Context(projectSetting);
        const result = await scaffoldLocalDebugSettings(v2Context, inputs);
        chai.assert.isTrue(result.isOk());

        //assert output launch.json
        const launch = fs.readJSONSync(expectedLaunchFile);
        const configurations: [] = launch["configurations"];
        const compounds: [] = launch["compounds"];
        chai.assert.equal(configurations.length, parameter.numConfigurations);
        chai.assert.equal(compounds.length, parameter.numCompounds);

        //assert output tasks.json
        const tasksAll = fs.readJSONSync(expectedTasksFile);
        const tasks: [] = tasksAll["tasks"];
        chai.assert.equal(tasks.length, parameter.numTasks);

        //assert output settings.json
        const settings = fs.readJSONSync(expectedSettingsFile);
        chai.assert.isTrue(
          Object.keys(settings).some((key) => key === "azureFunctions.stopFuncTaskPostDebug")
        );
        chai.assert.equal(settings["azureFunctions.stopFuncTaskPostDebug"], false);
        if (isAadManifestEnabled()) {
          chai.assert.equal(Object.keys(settings).length, 5);
          chai.assert.deepEqual(settings["json.schemas"], [
            {
              fileMatch: ["/aad.*.json"],
              schema: {},
            },
          ]);
        } else {
          chai.assert.equal(Object.keys(settings).length, 4);
        }
      });
    });

    const parameters5: TestParameter[] = [
      {
        programmingLanguage: "javascript",
        numConfigurations: 5,
        numCompounds: 2,
        numTasks: 7,
        numLocalEnvs: 19,
      },
      {
        programmingLanguage: "typescript",
        numConfigurations: 5,
        numCompounds: 2,
        numTasks: 7,
        numLocalEnvs: 19,
      },
    ];
    parameters5.forEach((parameter) => {
      it(`happy path: tab without function and bot (${parameter.programmingLanguage})`, async () => {
        const projectSetting = {
          appName: "",
          projectId: uuid.v4(),
          solutionSettings: {
            name: "",
            version: "",
            hostType: "Azure",
            capabilities: ["Tab", "Bot"],
            activeResourcePlugins: ["fx-resource-aad-app-for-teams"],
          },
          components: [{ name: "teams-bot" }, { name: "teams-tab" }, { name: "aad-app" }],
          programmingLanguage: parameter.programmingLanguage,
        };
        const v2Context = new MockedV2Context(projectSetting);
        const result = await scaffoldLocalDebugSettings(v2Context, inputs);
        chai.assert.isTrue(result.isOk());

        //assert output launch.json
        const launch = fs.readJSONSync(expectedLaunchFile);
        const configurations: [] = launch["configurations"];
        const compounds: [] = launch["compounds"];
        chai.assert.equal(configurations.length, parameter.numConfigurations);
        chai.assert.equal(compounds.length, parameter.numCompounds);

        //assert output tasks.json
        const tasksAll = fs.readJSONSync(expectedTasksFile);
        const tasks: [] = tasksAll["tasks"];
        chai.assert.equal(tasks.length, parameter.numTasks);

        //assert output settings.json
        const settings = fs.readJSONSync(expectedSettingsFile);
        if (isAadManifestEnabled()) {
          chai.assert.equal(Object.keys(settings).length, 2);
          chai.assert.deepEqual(settings["json.schemas"], [
            {
              fileMatch: ["/aad.*.json"],
              schema: {},
            },
          ]);
        } else {
          chai.assert.equal(Object.keys(settings).length, 1);
        }
      });

      it(`happy path: tab with Simple Auth and without function and bot (${parameter.programmingLanguage})`, async () => {
        const projectSetting = {
          appName: "",
          projectId: uuid.v4(),
          solutionSettings: {
            name: "",
            version: "",
            hostType: "Azure",
            capabilities: ["Tab", "Bot"],
            activeResourcePlugins: ["fx-resource-aad-app-for-teams", "fx-resource-simple-auth"],
          },
          components: [
            { name: "teams-bot" },
            { name: "teams-tab" },
            { name: "aad-app" },
            { name: "simple-auth" },
          ],
          programmingLanguage: parameter.programmingLanguage,
        };
        const v2Context = new MockedV2Context(projectSetting);
        const result = await scaffoldLocalDebugSettings(v2Context, inputs);
        chai.assert.isTrue(result.isOk());

        //assert output launch.json
        const launch = fs.readJSONSync(expectedLaunchFile);
        const configurations: [] = launch["configurations"];
        const compounds: [] = launch["compounds"];
        chai.assert.equal(configurations.length, parameter.numConfigurations);
        chai.assert.equal(compounds.length, parameter.numCompounds);

        //assert output tasks.json
        const tasksAll = fs.readJSONSync(expectedTasksFile);
        const tasks: [] = tasksAll["tasks"];
        chai.assert.equal(tasks.length, parameter.numTasks);

        //assert output settings.json
        const settings = fs.readJSONSync(expectedSettingsFile);
        if (isAadManifestEnabled()) {
          chai.assert.equal(Object.keys(settings).length, 2);
          chai.assert.deepEqual(settings["json.schemas"], [
            {
              fileMatch: ["/aad.*.json"],
              schema: {},
            },
          ]);
        } else {
          chai.assert.equal(Object.keys(settings).length, 1);
        }
      });

      it(`happy path: tab without function and bot (${parameter.programmingLanguage}) and AAD`, async () => {
        const projectSetting = {
          appName: "",
          projectId: uuid.v4(),
          solutionSettings: {
            name: "",
            version: "",
            hostType: "Azure",
            capabilities: ["Tab", "Bot"],
            activeResourcePlugins: [],
          },
          components: [{ name: "teams-bot" }, { name: "teams-tab" }],
          programmingLanguage: parameter.programmingLanguage,
        };
        const v2Context = new MockedV2Context(projectSetting);
        const result = await scaffoldLocalDebugSettings(v2Context, inputs);
        chai.assert.isTrue(result.isOk());

        //assert output launch.json
        const launch = fs.readJSONSync(expectedLaunchFile);
        const configurations: [] = launch["configurations"];
        const compounds: [] = launch["compounds"];
        chai.assert.equal(configurations.length, parameter.numConfigurations);
        chai.assert.equal(compounds.length, parameter.numCompounds);

        //assert output tasks.json
        const tasksAll = fs.readJSONSync(expectedTasksFile);
        const tasks: [] = tasksAll["tasks"];
        chai.assert.equal(tasks.length, parameter.numTasks);

        //assert output settings.json
        const settings = fs.readJSONSync(expectedSettingsFile);
        if (isAadManifestEnabled()) {
          chai.assert.equal(Object.keys(settings).length, 2);
          chai.assert.deepEqual(settings["json.schemas"], [
            {
              fileMatch: ["/aad.*.json"],
              schema: {},
            },
          ]);
        } else {
          chai.assert.equal(Object.keys(settings).length, 1);
        }
      });
    });

    const parameters6: TestParameter[] = [
      {
        programmingLanguage: "javascript",
        numConfigurations: 6,
        numCompounds: 6,
        numTasks: 7,
        numLocalEnvs: 7,
      },
      {
        programmingLanguage: "typescript",
        numConfigurations: 6,
        numCompounds: 6,
        numTasks: 7,
        numLocalEnvs: 7,
      },
    ];
    parameters6.forEach((parameter) => {
      it(`happy path: m365 tab without function (${parameter.programmingLanguage})`, async () => {
        const projectSetting = {
          appName: "",
          projectId: uuid.v4(),
          isM365: true,
          solutionSettings: {
            name: "",
            version: "",
            hostType: "Azure",
            capabilities: ["Tab"],
            activeResourcePlugins: ["fx-resource-aad-app-for-teams"],
          },
          components: [{ name: "teams-tab" }, { name: "aad-app" }],
          programmingLanguage: parameter.programmingLanguage,
        };
        const v2Context = new MockedV2Context(projectSetting);
        const result = await scaffoldLocalDebugSettings(v2Context, inputs);
        chai.assert.isTrue(result.isOk());

        //assert output launch.json
        const launch = fs.readJSONSync(expectedLaunchFile);
        const configurations: [] = launch["configurations"];
        const compounds: [] = launch["compounds"];
        chai.assert.equal(configurations.length, parameter.numConfigurations);
        chai.assert.equal(compounds.length, parameter.numCompounds);

        //assert output tasks.json
        const tasksAll = fs.readJSONSync(expectedTasksFile);
        const tasks: [] = tasksAll["tasks"];
        chai.assert.equal(tasks.length, parameter.numTasks);

        //assert output settings.json
        const settings = fs.readJSONSync(expectedSettingsFile);
        if (isAadManifestEnabled()) {
          chai.assert.equal(Object.keys(settings).length, 2);
          chai.assert.deepEqual(settings["json.schemas"], [
            {
              fileMatch: ["/aad.*.json"],
              schema: {},
            },
          ]);
        } else {
          chai.assert.equal(Object.keys(settings).length, 1);
        }
      });
    });

    const parameters7: TestParameter[] = [
      {
        programmingLanguage: "javascript",
        numConfigurations: 5,
        numCompounds: 4,
        numTasks: 8,
        numLocalEnvs: 12,
      },
      {
        programmingLanguage: "typescript",
        numConfigurations: 5,
        numCompounds: 4,
        numTasks: 8,
        numLocalEnvs: 12,
      },
    ];
    parameters7.forEach((parameter) => {
      it(`happy path: m365 bot (${parameter.programmingLanguage})`, async () => {
        const projectSetting = {
          appName: "",
          projectId: uuid.v4(),
          isM365: true,
          solutionSettings: {
            name: "",
            version: "",
            hostType: "Azure",
            capabilities: ["Bot"],
          },
          components: [{ name: "teams-bot" }],
          programmingLanguage: parameter.programmingLanguage,
        };
        const v2Context = new MockedV2Context(projectSetting);
        const result = await scaffoldLocalDebugSettings(v2Context, inputs);
        chai.assert.isTrue(result.isOk());

        //assert output launch.json
        const launch = fs.readJSONSync(expectedLaunchFile);
        const configurations: [] = launch["configurations"];
        const compounds: [] = launch["compounds"];
        chai.assert.equal(configurations.length, parameter.numConfigurations);
        chai.assert.equal(compounds.length, parameter.numCompounds);

        //assert output tasks.json
        const tasksAll = fs.readJSONSync(expectedTasksFile);
        const tasks: [] = tasksAll["tasks"];
        chai.assert.equal(tasks.length, parameter.numTasks);

        //assert output settings.json
        const settings = fs.readJSONSync(expectedSettingsFile);
        if (isAadManifestEnabled()) {
          chai.assert.equal(Object.keys(settings).length, 2);
          chai.assert.deepEqual(settings["json.schemas"], [
            {
              fileMatch: ["/aad.*.json"],
              schema: {},
            },
          ]);
        } else {
          chai.assert.equal(Object.keys(settings).length, 1);
        }
      });
    });

    it("spfx", async () => {
      const projectSetting = {
        appName: "",
        projectId: uuid.v4(),
        solutionSettings: {
          name: "",
          version: "",
          hostType: "SPFx",
        },
        components: [{ name: "teams-tab", hosting: "spfx" }],
      };
      const v2Context = new MockedV2Context(projectSetting);
      const result = await scaffoldLocalDebugSettings(v2Context, inputs);
      chai.assert.isTrue(result.isOk());

      //assert output launch.json
      const launch = fs.readJSONSync(expectedLaunchFile);
      const configurations: [] = launch["configurations"];
      const compounds: [] = launch["compounds"];
      chai.assert.equal(configurations.length, 4);
      chai.assert.equal(compounds.length, 2);

      //assert output tasks.json
      const tasksAll = fs.readJSONSync(expectedTasksFile);
      const tasks: [] = tasksAll["tasks"];
      const tasksInput: [] = tasksAll["inputs"];
      chai.assert.equal(tasks.length, 7);
      chai.assert.equal(tasksInput.length, 1);

      //assert output settings.json
      const settings = fs.readJSONSync(expectedSettingsFile);
      chai.assert.equal(Object.keys(settings).length, 1);

      //no local.env
      chai.assert.isFalse(fs.existsSync(expectedLocalEnvFile));
    });

    it("cli", async () => {
      inputs.platform = Platform.CLI;
      const projectSetting = {
        appName: "",
        projectId: uuid.v4(),
        solutionSettings: {
          name: "",
          version: "",
          hostType: "Azure",
          capabilities: ["Tab"],
          azureResources: ["function"],
          activeResourcePlugins: [],
        },
        components: [{ name: "teams-tab" }, { name: "teams-api" }],
      };
      const v2Context = new MockedV2Context(projectSetting);
      const result = await scaffoldLocalDebugSettings(v2Context, inputs);
      chai.assert.isTrue(result.isOk());

      //assert output
      chai.assert.isTrue(fs.existsSync(expectedLaunchFile));
      chai.assert.isTrue(fs.existsSync(expectedTasksFile));
      chai.assert.isTrue(fs.existsSync(expectedSettingsFile));
    });

    it("vs", async () => {
      inputs.platform = Platform.VS;
      const projectSetting = {
        appName: "",
        projectId: uuid.v4(),
        solutionSettings: {
          name: "",
          version: "",
        },
        components: [],
      };

      const v2Context = new MockedV2Context(projectSetting);
      const result = await scaffoldLocalDebugSettings(v2Context, inputs);
      chai.assert.isTrue(result.isOk());

      //assert output
      chai.assert.isFalse(fs.existsSync(expectedLaunchFile));
      chai.assert.isFalse(fs.existsSync(expectedTasksFile));
      chai.assert.isFalse(fs.existsSync(expectedSettingsFile));
      chai.assert.isFalse(fs.existsSync(expectedLocalEnvFile));
    });

    it("multi env", async () => {
      const projectSetting = {
        appName: "",
        projectId: uuid.v4(),
        solutionSettings: {
          name: "",
          version: "",
          hostType: "Azure",
          capabilities: ["Tab", "Bot"],
          azureResources: ["function"],
          activeResourcePlugins: ["fx-resource-aad-app-for-teams"],
        },
        components: [
          { name: "teams-tab" },
          { name: "teams-bot" },
          { name: "teams-api" },
          { name: "aad-app" },
        ],
        programmingLanguage: "javascript",
      };
      const v2Context = new MockedV2Context(projectSetting);
      const result = await scaffoldLocalDebugSettings(v2Context, inputs);
      chai.assert.isTrue(result.isOk());
    });

    it("happy path: add capability", async () => {
      fs.ensureDirSync(`${inputs.projectPath}/.vscode`);
      fs.writeJSONSync(expectedTasksFile, {
        version: "2.0.0",
        tasks: [
          {
            label: "Pre Debug Check & Start All",
            dependsOn: "validate local prerequisites",
          },
          {
            label: "validate local prerequisites",
            type: "shell",
            command: "exit ${command:fx-extension.validate-local-prerequisites}",
          },
        ],
      });
      const projectSetting = {
        appName: "",
        projectId: uuid.v4(),
        solutionSettings: {
          name: "",
          version: "",
          hostType: "Azure",
          capabilities: ["Tab", "Bot"],
          activeResourcePlugins: ["fx-resource-aad-app-for-teams"],
        },
        components: [{ name: "teams-tab" }, { name: "teams-bot" }, { name: "aad-app" }],
        programmingLanguage: "javascript",
      };
      const v2Context = new MockedV2Context(projectSetting);
      const result = await scaffoldLocalDebugSettings(v2Context, inputs);
      chai.assert.isTrue(result.isOk());

      //assert output launch.json
      const launch = fs.readJSONSync(expectedLaunchFile);
      const configurations: [] = launch["configurations"];
      const compounds: [] = launch["compounds"];
      chai.assert.equal(configurations.length, 5);
      chai.assert.equal(compounds.length, 2);

      //assert output tasks.json
      const tasksAll = fs.readJSONSync(expectedTasksFile);
      const tasks: [] = tasksAll["tasks"];
      chai.assert.equal(tasks.length, 7);
    });

    it("happy path: add capability to old project", async () => {
      fs.ensureDirSync(`${inputs.projectPath}/.vscode`);
      fs.writeJSONSync(expectedTasksFile, {
        version: "2.0.0",
        tasks: [
          {
            label: "Pre Debug Check",
            dependsOn: "dependency check",
          },
          {
            label: "dependency check",
            type: "shell",
            command: "exit ${command:fx-extension.validate-dependencies}",
          },
        ],
      });
      const projectSetting = {
        appName: "",
        projectId: uuid.v4(),
        solutionSettings: {
          name: "",
          version: "",
          hostType: "Azure",
          capabilities: ["Tab", "Bot"],
          activeResourcePlugins: ["fx-resource-aad-app-for-teams"],
        },
        components: [{ name: "teams-tab" }, { name: "teams-bot" }, { name: "aad-app" }],
        programmingLanguage: "javascript",
      };
      const v2Context = new MockedV2Context(projectSetting);
      const result = await scaffoldLocalDebugSettings(v2Context, inputs);
      chai.assert.isTrue(result.isOk());

      //assert output launch.json
      const launch = fs.readJSONSync(expectedLaunchFile);
      const configurations: [] = launch["configurations"];
      const compounds: [] = launch["compounds"];
      chai.assert.equal(configurations.length, 5);
      chai.assert.equal(compounds.length, 2);

      //assert output tasks.json
      const tasksAll = fs.readJSONSync(expectedTasksFile);
      const tasks: [] = tasksAll["tasks"];
      chai.assert.equal(tasks.length, 9);
    });

    it("happy path: .vscode exists", async () => {
      fs.ensureDirSync(`${inputs.projectPath}/.vscode`);
      fs.writeJSONSync(expectedLaunchFile, {
        version: "0.2.0",
        configurations: [
          {
            name: "My Launch Configuration 1",
            foo1: "bar1",
          },
        ],
        compounds: [
          {
            name: "My Launch Compound 1",
            foo2: "bar2",
          },
        ],
      });
      fs.writeJSONSync(expectedSettingsFile, {
        "my.setting": "my setting value",
      });
      fs.writeJSONSync(expectedTasksFile, {
        version: "2.0.0",
        tasks: [
          {
            label: "My Task 1",
            foo: "bar",
          },
        ],
        inputs: [
          {
            id: "My Input 1",
            foo: "bar",
          },
        ],
      });
      const projectSetting = {
        appName: "",
        projectId: uuid.v4(),
        solutionSettings: {
          name: "",
          version: "",
          hostType: "Azure",
          capabilities: ["Tab", "Bot"],
          activeResourcePlugins: ["fx-resource-aad-app-for-teams"],
        },
        components: [{ name: "teams-tab" }, { name: "teams-bot" }, { name: "aad-app" }],
        programmingLanguage: "javascript",
      };
      const v2Context = new MockedV2Context(projectSetting);
      const result = await scaffoldLocalDebugSettings(v2Context, inputs);
      chai.assert.isTrue(result.isOk());

      //assert output launch.json
      const launch = fs.readJSONSync(expectedLaunchFile);
      const configurations: [] = launch["configurations"];
      const compounds: [] = launch["compounds"];
      chai.assert.equal(configurations.length, 6);
      chai.assert.equal(compounds.length, 3);

      //assert output tasks.json
      const tasksAll = fs.readJSONSync(expectedTasksFile);
      const tasks: [] = tasksAll["tasks"];
      const taskInputs: [] = tasksAll["inputs"];
      chai.assert.equal(tasks.length, 10);
      chai.assert.equal(taskInputs.length, 1);

      //assert output settings.json
      const settingsAll = fs.readJSONSync(expectedSettingsFile);
      chai.assert.equal(Object.keys(settingsAll).length, 2);
    });
  });
});
