import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as dotenv from "dotenv";
import * as fs from "fs-extra";
import { ConfigFolderName, Platform, PluginContext } from "@microsoft/teamsfx-api";
import * as path from "path";

import { LocalDebugPluginInfo } from "../../../../../src/plugins/resource/localdebug/constants";
import { LocalDebugPlugin } from "../../../../../src/plugins/resource/localdebug";

chai.use(chaiAsPromised);

interface TestParameter {
  programmingLanguage: string;
  numConfigurations: number;
  numCompounds: number;
  numTasks: number;
  numLocalEnvs: number;
}

describe(LocalDebugPluginInfo.pluginName, () => {
  const expectedLaunchFile = path.resolve(__dirname, "../data/.vscode/launch.json");
  const expectedLocalEnvFile = path.resolve(__dirname, `../data/.${ConfigFolderName}/local.env`);
  const expectedSettingsFile = path.resolve(__dirname, "../data/.vscode/settings.json");
  const expectedTasksFile = path.resolve(__dirname, "../data/.vscode/tasks.json");

  describe("scaffold", () => {
    let pluginContext: PluginContext;
    let plugin: LocalDebugPlugin;

    beforeEach(() => {
      pluginContext = {
        root: path.resolve(__dirname, "../data/"),
        config: new Map(),
        answers: {platform:Platform.VSCode}
      } as PluginContext;
      plugin = new LocalDebugPlugin();
      fs.emptyDirSync(pluginContext.root); 
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
        pluginContext.configOfOtherPlugins = new Map([
          ["solution", new Map([["programmingLanguage", parameter.programmingLanguage]])],
        ]);
        pluginContext.projectSettings = {
          appName: "",
          currentEnv: "default",
          solutionSettings: {
            name: "",
            version: "",
            activeResourcePlugins: [
              "fx-resource-aad-app-for-teams",
              "fx-resource-frontend-hosting",
              "fx-resource-function",
            ],
          },
        };
        const result = await plugin.scaffold(pluginContext);
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

        //assert output local.env
        const localEnvs = dotenv.parse(fs.readFileSync(expectedLocalEnvFile));
        chai.assert.equal(Object.keys(localEnvs).length, parameter.numLocalEnvs);
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
        pluginContext.configOfOtherPlugins = new Map([
          ["solution", new Map([["programmingLanguage", parameter.programmingLanguage]])],
        ]);
        pluginContext.projectSettings = {
          appName: "",
          currentEnv: "default",
          solutionSettings: {
            name: "",
            version: "",
            activeResourcePlugins: [
              "fx-resource-aad-app-for-teams",
              "fx-resource-frontend-hosting",
            ],
          },
        };
        const result = await plugin.scaffold(pluginContext);
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

        //no settings.json
        chai.assert.isFalse(fs.existsSync(expectedSettingsFile));

        //assert output local.env
        const localEnvs = dotenv.parse(fs.readFileSync(expectedLocalEnvFile));
        chai.assert.equal(Object.keys(localEnvs).length, parameter.numLocalEnvs);
      });
    });

    const parameters3: TestParameter[] = [
      {
        programmingLanguage: "javascript",
        numConfigurations: 5,
        numCompounds: 2,
        numTasks: 7,
        numLocalEnvs: 14,
      },
      {
        programmingLanguage: "typescript",
        numConfigurations: 5,
        numCompounds: 2,
        numTasks: 7,
        numLocalEnvs: 14,
      },
    ];
    parameters3.forEach((parameter) => {
      it(`happy path: bot (${parameter.programmingLanguage})`, async () => {
        pluginContext.configOfOtherPlugins = new Map([
          ["solution", new Map([["programmingLanguage", parameter.programmingLanguage]])],
        ]);
        pluginContext.projectSettings = {
          appName: "",
          currentEnv: "default",
          solutionSettings: {
            name: "",
            version: "",
            activeResourcePlugins: ["fx-resource-aad-app-for-teams", "fx-resource-bot"],
          },
        };
        const result = await plugin.scaffold(pluginContext);
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

        //no settings.json
        chai.assert.isFalse(fs.existsSync(expectedSettingsFile));

        //assert output local.env
        const localEnvs = dotenv.parse(fs.readFileSync(expectedLocalEnvFile));
        chai.assert.equal(Object.keys(localEnvs).length, parameter.numLocalEnvs);
      });
    });

    const parameters4: TestParameter[] = [
      {
        programmingLanguage: "javascript",
        numConfigurations: 6,
        numCompounds: 2,
        numTasks: 12,
        numLocalEnvs: 44,
      },
      {
        programmingLanguage: "typescript",
        numConfigurations: 6,
        numCompounds: 2,
        numTasks: 12,
        numLocalEnvs: 44,
      },
    ];
    parameters4.forEach((parameter) => {
      it(`happy path: tab with function and bot (${parameter.programmingLanguage})`, async () => {
        pluginContext.configOfOtherPlugins = new Map([
          ["solution", new Map([["programmingLanguage", parameter.programmingLanguage]])],
        ]);
        pluginContext.projectSettings = {
          appName: "",
          currentEnv: "default",
          solutionSettings: {
            name: "",
            version: "",
            activeResourcePlugins: [
              "fx-resource-aad-app-for-teams",
              "fx-resource-frontend-hosting",
              "fx-resource-function",
              "fx-resource-bot",
            ],
          },
        };
        const result = await plugin.scaffold(pluginContext);
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

        //assert output local.env
        const localEnvs = dotenv.parse(fs.readFileSync(expectedLocalEnvFile));
        chai.assert.equal(Object.keys(localEnvs).length, parameter.numLocalEnvs);
      });
    });

    const parameters5: TestParameter[] = [
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
    parameters5.forEach((parameter) => {
      it(`happy path: tab without function and bot (${parameter.programmingLanguage})`, async () => {
        pluginContext.configOfOtherPlugins = new Map([
          ["solution", new Map([["programmingLanguage", parameter.programmingLanguage]])],
        ]);
        pluginContext.projectSettings = {
          appName: "",
          currentEnv: "default",
          solutionSettings: {
            name: "",
            version: "",
            activeResourcePlugins: [
              "fx-resource-aad-app-for-teams",
              "fx-resource-frontend-hosting",
              "fx-resource-bot",
            ],
          },
        };
        const result = await plugin.scaffold(pluginContext);
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

        //no settings.json
        chai.assert.isFalse(fs.existsSync(expectedSettingsFile));

        //assert output local.env
        const localEnvs = dotenv.parse(fs.readFileSync(expectedLocalEnvFile));
        chai.assert.equal(Object.keys(localEnvs).length, parameter.numLocalEnvs);
      });
    });

    it("spfx", async () => {
      pluginContext.configOfOtherPlugins = new Map();
      pluginContext.projectSettings = {
        appName: "",
        currentEnv: "default",
        solutionSettings: {
          name: "",
          version: "",
          activeResourcePlugins: ["fx-resource-spfx"],
        },
      };
      const result = await plugin.scaffold(pluginContext);
      chai.assert.isTrue(result.isOk());

      //assert output launch.json
      const launch = fs.readJSONSync(expectedLaunchFile);
      const configurations: [] = launch["configurations"];
      chai.assert.equal(configurations.length, 4);

      //assert output tasks.json
      const tasksAll = fs.readJSONSync(expectedTasksFile);
      const tasks: [] = tasksAll["tasks"];
      const tasksInput: [] = tasksAll["inputs"];
      chai.assert.equal(tasks.length, 5);
      chai.assert.equal(tasksInput.length, 1);

      //no settings.json
      chai.assert.isFalse(fs.existsSync(expectedSettingsFile));

      //no local.env
      chai.assert.isFalse(fs.existsSync(expectedLocalEnvFile));
    });

    it("cli", async () => {
      pluginContext.answers!.platform = Platform.CLI;
      pluginContext.configOfOtherPlugins = new Map([["fx-resource-function", new Map()]]);
      pluginContext.projectSettings = {
        appName: "",
        currentEnv: "default",
        solutionSettings: {
          name: "",
          version: "",
          activeResourcePlugins: ["fx-resource-aad-app-for-teams", "fx-resource-function"],
        },
      };
      const result = await plugin.scaffold(pluginContext);
      chai.assert.isTrue(result.isOk());

      //assert output
      chai.assert.isTrue(fs.existsSync(expectedLaunchFile));
      chai.assert.isTrue(fs.existsSync(expectedTasksFile));
      chai.assert.isTrue(fs.existsSync(expectedSettingsFile));
      chai.assert.isTrue(fs.existsSync(expectedLocalEnvFile));
    });

    it("vs", async () => {
      pluginContext.answers!.platform = Platform.VS;
      const result = await plugin.scaffold(pluginContext);
      chai.assert.isTrue(result.isOk());

      //assert output
      chai.assert.isFalse(fs.existsSync(expectedLaunchFile));
      chai.assert.isFalse(fs.existsSync(expectedTasksFile));
      chai.assert.isFalse(fs.existsSync(expectedSettingsFile));
      chai.assert.isFalse(fs.existsSync(expectedLocalEnvFile));
    });
  });

  describe("localDebug", () => {
    let pluginContext: PluginContext;
    let plugin: LocalDebugPlugin;

    beforeEach(() => {
      pluginContext = {} as PluginContext;
      plugin = new LocalDebugPlugin();
    });

    it("happy path", async () => {
      const result = await plugin.localDebug(pluginContext);
      chai.assert.isTrue(result.isOk());
    });
  });

  describe("postLocalDebug", () => {
    let pluginContext: PluginContext;
    let plugin: LocalDebugPlugin;

    beforeEach(() => {
      pluginContext = {} as PluginContext;
      plugin = new LocalDebugPlugin();
    });

    it("happy path", async () => {
      const result = await plugin.postLocalDebug(pluginContext);
      chai.assert.isTrue(result.isOk());
    });
  });
});
