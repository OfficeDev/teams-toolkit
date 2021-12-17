import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as fs from "fs-extra";
import {
  ConfigFolderName,
  ConfigMap,
  InputConfigsFolderName,
  Inputs,
  Platform,
  PluginContext,
  v2,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import * as uuid from "uuid";
import { MockedV2Context } from "../util";
import { scaffoldLocalDebugSettings } from "../../../../src/plugins/solution/fx-solution/debug/scaffolding";
import { LocalDebugPlugin, newEnvInfo } from "../../../../src";
import { MockCryptoProvider } from "../../../core/utils";

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
        numTasks: 9,
        numLocalEnvs: 30,
      },
      {
        programmingLanguage: "typescript",
        numConfigurations: 5,
        numCompounds: 2,
        numTasks: 9,
        numLocalEnvs: 30,
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
            activeResourcePlugins: [
              "fx-resource-aad-app-for-teams",
              "fx-resource-simple-auth",
              "fx-resource-frontend-hosting",
              "fx-resource-function",
            ],
          },
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
        chai.assert.equal(Object.keys(settings).length, 4);

        await assertLocalDebugLocalEnvs(v2Context, inputs, parameter.numLocalEnvs);
      });
    });

    const parameters2: TestParameter[] = [
      {
        programmingLanguage: "javascript",
        numConfigurations: 4,
        numCompounds: 2,
        numTasks: 6,
        numLocalEnvs: 16,
      },
      {
        programmingLanguage: "typescript",
        numConfigurations: 4,
        numCompounds: 2,
        numTasks: 6,
        numLocalEnvs: 16,
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
            activeResourcePlugins: [
              "fx-resource-aad-app-for-teams",
              "fx-resource-simple-auth",
              "fx-resource-frontend-hosting",
            ],
          },
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
        chai.assert.equal(Object.keys(settings).length, 1);

        await assertLocalDebugLocalEnvs(v2Context, inputs, parameter.numLocalEnvs);
      });
    });

    const parameters3: TestParameter[] = [
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
        numTasks: 7,
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
            activeResourcePlugins: ["fx-resource-aad-app-for-teams", "fx-resource-bot"],
          },
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
        chai.assert.equal(Object.keys(settings).length, 1);

        await assertLocalDebugLocalEnvs(v2Context, inputs, parameter.numLocalEnvs);
      });
    });

    const parameters4: TestParameter[] = [
      {
        programmingLanguage: "javascript",
        numConfigurations: 6,
        numCompounds: 2,
        numTasks: 12,
        numLocalEnvs: 42,
      },
      {
        programmingLanguage: "typescript",
        numConfigurations: 6,
        numCompounds: 2,
        numTasks: 12,
        numLocalEnvs: 42,
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
            activeResourcePlugins: [
              "fx-resource-aad-app-for-teams",
              "fx-resource-simple-auth",
              "fx-resource-frontend-hosting",
              "fx-resource-function",
              "fx-resource-bot",
            ],
          },
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
        chai.assert.equal(Object.keys(settings).length, 4);

        await assertLocalDebugLocalEnvs(v2Context, inputs, parameter.numLocalEnvs);
      });
    });

    const parameters5: TestParameter[] = [
      {
        programmingLanguage: "javascript",
        numConfigurations: 5,
        numCompounds: 2,
        numTasks: 9,
        numLocalEnvs: 28,
      },
      {
        programmingLanguage: "typescript",
        numConfigurations: 5,
        numCompounds: 2,
        numTasks: 9,
        numLocalEnvs: 28,
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
            activeResourcePlugins: [
              "fx-resource-aad-app-for-teams",
              "fx-resource-frontend-hosting",
              "fx-resource-simple-auth",
              "fx-resource-bot",
            ],
          },
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
        chai.assert.equal(Object.keys(settings).length, 1);

        await assertLocalDebugLocalEnvs(v2Context, inputs, parameter.numLocalEnvs);
      });
    });

    it("spfx", async () => {
      const projectSetting = {
        appName: "",
        projectId: uuid.v4(),
        solutionSettings: {
          name: "",
          version: "",
          activeResourcePlugins: ["fx-resource-spfx"],
        },
      };
      const v2Context = new MockedV2Context(projectSetting);
      const result = await scaffoldLocalDebugSettings(v2Context, inputs);
      chai.assert.isTrue(result.isOk());

      //assert output launch.json
      const launch = fs.readJSONSync(expectedLaunchFile);
      const configurations: [] = launch["configurations"];
      const compounds: [] = launch["compounds"];
      chai.assert.equal(configurations.length, 6);
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
          activeResourcePlugins: ["fx-resource-aad-app-for-teams", "fx-resource-function"],
        },
      };
      const v2Context = new MockedV2Context(projectSetting);
      const result = await scaffoldLocalDebugSettings(v2Context, inputs);
      chai.assert.isTrue(result.isOk());

      //assert output
      chai.assert.isTrue(fs.existsSync(expectedLaunchFile));
      chai.assert.isTrue(fs.existsSync(expectedTasksFile));
      chai.assert.isTrue(fs.existsSync(expectedSettingsFile));
      chai.assert.isTrue(fs.existsSync(expectedLocalSettingsFile));
    });

    it("vs", async () => {
      inputs.platform = Platform.VS;
      const projectSetting = {
        appName: "",
        projectId: uuid.v4(),
        solutionSettings: {
          name: "",
          version: "",
          activeResourcePlugins: [],
        },
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

    const parameters6: TestParameter[] = [
      {
        programmingLanguage: "javascript",
        numConfigurations: 2,
        numCompounds: 2,
        numTasks: 5,
        numLocalEnvs: 4,
      },
      {
        programmingLanguage: "typescript",
        numConfigurations: 2,
        numCompounds: 2,
        numTasks: 5,
        numLocalEnvs: 4,
      },
    ];
    parameters6.forEach((parameter: TestParameter) => {
      it(`happy path: tab migrate from v1 (${parameter.programmingLanguage})`, async () => {
        const projectSetting = {
          appName: "",
          projectId: uuid.v4(),
          solutionSettings: {
            name: "",
            version: "",
            activeResourcePlugins: ["fx-resource-frontend-hosting"],
            migrateFromV1: true,
          },
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

        await assertLocalDebugLocalEnvs(v2Context, inputs, parameter.numLocalEnvs);
      });
    });

    it("multi env", async () => {
      const projectSetting = {
        appName: "",
        projectId: uuid.v4(),
        solutionSettings: {
          name: "",
          version: "",
          activeResourcePlugins: [
            "fx-resource-aad-app-for-teams",
            "fx-resource-simple-auth",
            "fx-resource-frontend-hosting",
            "fx-resource-function",
            "fx-resource-bot",
          ],
        },
        programmingLanguage: "javascript",
      };
      const v2Context = new MockedV2Context(projectSetting);

      const packageJsonPath = path.resolve(__dirname, "./data/package.json");
      fs.writeFileSync(packageJsonPath, "{}");

      const result = await scaffoldLocalDebugSettings(v2Context, inputs);
      chai.assert.isTrue(result.isOk());

      //assert output package
      const packageJson = fs.readJSONSync(packageJsonPath);
      const scripts: [] = packageJson["scripts"];
      chai.assert.isTrue(scripts !== undefined);
    });
  });

  async function assertLocalDebugLocalEnvs(
    ctx: v2.Context,
    inputs: Inputs,
    numLocalEnvs: number
  ): Promise<void> {
    // assert output: localSettings.json
    console.log(`Read folder: ${expectedLocalSettingsFile}`);
    chai.assert.isTrue(await fs.pathExists(expectedLocalSettingsFile));
    // TODO: use LocalEnvManager.getLocalEnv instead
    const plugin = new LocalDebugPlugin();
    const pluginContext: PluginContext = {
      envInfo: newEnvInfo(),
      config: new ConfigMap(),
      root: inputs.projectPath!,
      cryptoProvider: new MockCryptoProvider(),
      projectSettings: ctx.projectSetting,
    };
    const result = await plugin.getLocalDebugEnvs(pluginContext);
    chai.assert.equal(Object.keys(result).length, numLocalEnvs);
  }
});
