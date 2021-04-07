import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as dotenv from "dotenv";
import * as fs from "fs-extra";
import { ConfigFolderName, Platform, PluginContext } from "fx-api";
import * as path from "path";

import { LocalDebugPluginInfo } from "../../../../../src/plugins/resource/localdebug/constants";
import { LocalDebugPlugin } from "../../../../../src/plugins/resource/localdebug";

chai.use(chaiAsPromised);

describe(LocalDebugPluginInfo.pluginName, ()=> {
    const expectedLaunchFile = path.resolve(__dirname, "../data/.vscode/launch.json");
    const expectedLocalEnvFile = path.resolve(__dirname, `../data/.${ConfigFolderName}/local.env`);
    const expectedSettingsFile = path.resolve(__dirname, "../data/.vscode/settings.json");
    const expectedTasksFile = path.resolve(__dirname, "../data/.vscode/tasks.json");

    describe("scaffold", () => {
        let pluginContext: PluginContext;
        let plugin: LocalDebugPlugin;

        beforeEach(() => {
            pluginContext = {
                root: path.resolve(__dirname, "../data/")
            } as PluginContext;
            plugin = new LocalDebugPlugin();
            fs.emptyDirSync(pluginContext.root);
        });

        it("happy path: tab with function", async () => {
            pluginContext.platform = Platform.VSCode;
            pluginContext.configOfOtherPlugins = new Map([
                ["solution", new Map([
                    ["selectedPlugins", ["fx-resource-aad-app-for-teams", "fx-resource-frontend-hosting", "fx-resource-function"]]
                ])],
                ["fx-resource-function", new Map()]]);
            const result = await plugin.scaffold(pluginContext);
            chai.assert.isTrue(result.isOk());

            //assert output launch.json
            const launch = fs.readJSONSync(expectedLaunchFile);
            const configurations:[] = launch["configurations"];
            const compounds:[] = launch["compounds"];
            chai.assert.equal(configurations.length, 5);
            chai.assert.equal(compounds.length, 2);

            //assert output tasks.json
            const tasksAll = fs.readJSONSync(expectedTasksFile);
            const tasks:[] = tasksAll["tasks"];
            const tasksInput:[] = tasksAll["inputs"];
            chai.assert.equal(tasks.length, 9);
            chai.assert.equal(tasksInput.length, 1);

            //assert output settings.json
            const settings = fs.readJSONSync(expectedSettingsFile);
            chai.assert.isTrue(Object.keys(settings).some(key => key === "azureFunctions.stopFuncTaskPostDebug"));
            chai.assert.equal(settings["azureFunctions.stopFuncTaskPostDebug"], false);

            //assert output local.env
            const localEnvs = dotenv.parse(fs.readFileSync(expectedLocalEnvFile));
            chai.assert.equal(Object.keys(localEnvs).length, 23);
        });

        it("happy path: tab without function", async () => {
            pluginContext.platform = Platform.VSCode;
            pluginContext.configOfOtherPlugins = new Map([
                ["solution", new Map([
                    ["selectedPlugins", ["fx-resource-aad-app-for-teams", "fx-resource-frontend-hosting"]]
                ])]]);
            const result = await plugin.scaffold(pluginContext);
            chai.assert.isTrue(result.isOk());

            //assert output launch.json
            const launch = fs.readJSONSync(expectedLaunchFile);
            const configurations:[] = launch["configurations"];
            const compounds:[] = launch["compounds"];
            chai.assert.equal(configurations.length, 4);
            chai.assert.equal(compounds.length, 2);

            //assert output tasks.json
            const tasksAll = fs.readJSONSync(expectedTasksFile);
            const tasks:[] = tasksAll["tasks"];
            const tasksInput:[] = tasksAll["inputs"];
            chai.assert.equal(tasks.length, 7);
            chai.assert.equal(tasksInput.length, 1);

            //no settings.json
            chai.assert.isFalse(fs.existsSync(expectedSettingsFile));

            //assert output local.env
            const localEnvs = dotenv.parse(fs.readFileSync(expectedLocalEnvFile));
            chai.assert.equal(Object.keys(localEnvs).length, 13);
        });

        it("happy path: bot", async () => {
            pluginContext.platform = Platform.VSCode;
            pluginContext.configOfOtherPlugins = new Map([
                ["solution", new Map([
                    ["selectedPlugins", ["fx-resource-aad-app-for-teams", "fx-resource-teamsbot"]]
                ])]]);
            const result = await plugin.scaffold(pluginContext);
            chai.assert.isTrue(result.isOk());

            //assert output launch.json
            const launch = fs.readJSONSync(expectedLaunchFile);
            const configurations:[] = launch["configurations"];
            const compounds:[] = launch["compounds"];
            chai.assert.equal(configurations.length, 5);
            chai.assert.equal(compounds.length, 2);

            //assert output tasks.json
            const tasksAll = fs.readJSONSync(expectedTasksFile);
            const tasks:[] = tasksAll["tasks"];
            const tasksInput:[] = tasksAll["inputs"];
            chai.assert.equal(tasks.length, 7);
            chai.assert.equal(tasksInput.length, 1);

            //no settings.json
            chai.assert.isFalse(fs.existsSync(expectedSettingsFile));

            //assert output local.env
            const localEnvs = dotenv.parse(fs.readFileSync(expectedLocalEnvFile));
            chai.assert.equal(Object.keys(localEnvs).length, 15);
        });

        it("happy path: tab with function and bot", async () => {
            pluginContext.platform = Platform.VSCode;
            pluginContext.configOfOtherPlugins = new Map([
                ["solution", new Map([
                    ["selectedPlugins", ["teamsfx-resource-aad-app-for-teams", "teamsfx-resource-frontend-hosting", "teamsfx-resource-function", "teamsfx-resource-teamsbot"]]
                ])]]);
            const result = await plugin.scaffold(pluginContext);
            chai.assert.isTrue(result.isOk());

            //assert output launch.json
            const launch = fs.readJSONSync(expectedLaunchFile);
            const configurations:[] = launch["configurations"];
            const compounds:[] = launch["compounds"];
            chai.assert.equal(configurations.length, 6);
            chai.assert.equal(compounds.length, 2);

            //assert output tasks.json
            const tasksAll = fs.readJSONSync(expectedTasksFile);
            const tasks:[] = tasksAll["tasks"];
            const tasksInput:[] = tasksAll["inputs"];
            chai.assert.equal(tasks.length, 11);
            chai.assert.equal(tasksInput.length, 1);

            //assert output settings.json
            const settings = fs.readJSONSync(expectedSettingsFile);
            chai.assert.isTrue(Object.keys(settings).some(key => key === "azureFunctions.stopFuncTaskPostDebug"));
            chai.assert.equal(settings["azureFunctions.stopFuncTaskPostDebug"], false);

            //assert output local.env
            const localEnvs = dotenv.parse(fs.readFileSync(expectedLocalEnvFile));
            chai.assert.equal(Object.keys(localEnvs).length, 31);
        });

        it("happy path: tab without function and bot", async () => {
            pluginContext.platform = Platform.VSCode;
            pluginContext.configOfOtherPlugins = new Map([
                ["solution", new Map([
                    ["selectedPlugins", ["teamsfx-resource-aad-app-for-teams", "teamsfx-resource-frontend-hosting", "teamsfx-resource-teamsbot"]]
                ])]]);
            const result = await plugin.scaffold(pluginContext);
            chai.assert.isTrue(result.isOk());

            //assert output launch.json
            const launch = fs.readJSONSync(expectedLaunchFile);
            const configurations:[] = launch["configurations"];
            const compounds:[] = launch["compounds"];
            chai.assert.equal(configurations.length, 5);
            chai.assert.equal(compounds.length, 2);

            //assert output tasks.json
            const tasksAll = fs.readJSONSync(expectedTasksFile);
            const tasks:[] = tasksAll["tasks"];
            const tasksInput:[] = tasksAll["inputs"];
            chai.assert.equal(tasks.length, 9);
            chai.assert.equal(tasksInput.length, 1);

            //no settings.json
            chai.assert.isFalse(fs.existsSync(expectedSettingsFile));

            //assert output local.env
            const localEnvs = dotenv.parse(fs.readFileSync(expectedLocalEnvFile));
            chai.assert.equal(Object.keys(localEnvs).length, 21);
        });

        it("spfx", async () => {
            pluginContext.platform = Platform.VSCode;
            pluginContext.configOfOtherPlugins = new Map([
                ["solution", new Map([
                    ["selectedPlugins", ["fx-resource-spfx"]]
                ])]]);
            const result = await plugin.scaffold(pluginContext);
            chai.assert.isTrue(result.isOk());

            //assert output launch.json
            const launch = fs.readJSONSync(expectedLaunchFile);
            const configurations:[] = launch["configurations"];
            chai.assert.equal(configurations.length, 2);

            //assert output tasks.json
            const tasksAll = fs.readJSONSync(expectedTasksFile);
            const tasks:[] = tasksAll["tasks"];
            const tasksInput:[] = tasksAll["inputs"];
            chai.assert.equal(tasks.length, 3);
            chai.assert.equal(tasksInput.length, 1);

            //no settings.json
            chai.assert.isFalse(fs.existsSync(expectedSettingsFile));

            //no local.env
            chai.assert.isFalse(fs.existsSync(expectedLocalEnvFile));
        });

        it("cli", async () => {
            pluginContext.platform = Platform.CLI;
            pluginContext.configOfOtherPlugins = new Map([
                ["solution", new Map([
                    ["selectedPlugins", ["fx-resource-aad-app-for-teams", "fx-resource-function"]]
                ])],
                ["fx-resource-function", new Map()]]);
            const result = await plugin.scaffold(pluginContext);
            chai.assert.isTrue(result.isOk());

            //assert output
            chai.assert.isTrue(fs.existsSync(expectedLaunchFile));
            chai.assert.isTrue(fs.existsSync(expectedTasksFile));
            chai.assert.isTrue(fs.existsSync(expectedSettingsFile));
            chai.assert.isTrue(fs.existsSync(expectedLocalEnvFile));
        });

        it("vs", async () => {
            pluginContext.platform = Platform.VS;
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
