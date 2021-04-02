// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as fs from "fs-extra";
import * as sinon from "sinon";
import { default as chaiAsPromised } from "chai-as-promised";
import AdmZip from "adm-zip";
import path from "path";

import { TeamsBot } from "../../../../../src/plugins/resource/bot/index";
import { TeamsBotImpl } from "../../../../../src/plugins/resource/bot/plugin";

import { QuestionNames, ScaffoldPlaceholders } from "../../../../../src/plugins/resource/bot/constants";
import * as downloadByUrl from "../../../../../src/plugins/resource/bot/utils/downloadByUrl";
import * as utils from "../../../../../src/plugins/resource/bot/utils/common";
import { ProgrammingLanguage } from "../../../../../src/plugins/resource/bot/enums/programmingLanguage";
import { FxTeamsBotPluginResultFactory as ResultFactory } from "../../../../../src/plugins/resource/bot/result";
import { WayToRegisterBot } from "../../../../../src/plugins/resource/bot/enums/wayToRegisterBot";
import * as testUtils from "./utils";
import { PluginActRoles } from "../../../../../src/plugins/resource/bot/enums/pluginActRoles";

chai.use(chaiAsPromised);

describe("Teams Bot Resource Plugin", () => {
    describe("Test preScaffold", () => {
        afterEach(() => {
            sinon.restore();
        });

        let botPlugin: TeamsBot;
        let botPluginImpl: TeamsBotImpl;

        beforeEach(() => {
            botPlugin = new TeamsBot();
            botPluginImpl = new TeamsBotImpl();
            botPlugin.teamsBotImpl = botPluginImpl;
        });

        it("Reuse an existing bot registration", async () => {
            // Arrange
            const context = testUtils.newPluginContext();
            context.answers?.set(QuestionNames.PROGRAMMING_LANGUAGE, ProgrammingLanguage.TypeScript);
            context.answers?.set(QuestionNames.WAY_TO_REGISTER_BOT, WayToRegisterBot.ReuseExisting);

            const fakeBotId = utils.genUUID();
            const fakeBotPassword = utils.genUUID();
            context.answers?.set(QuestionNames.GET_BOT_ID, fakeBotId);
            context.answers?.set(QuestionNames.GET_BOT_PASSWORD, fakeBotPassword);

            // Act
            const result = await botPlugin.preScaffold(context);

            // Assert
            chai.assert.deepEqual(result, ResultFactory.Success());
            chai.assert.isTrue(botPluginImpl.config.scaffold.botId === fakeBotId);
            chai.assert.isTrue(botPluginImpl.config.scaffold.botPassword === fakeBotPassword);
        });
    });

    describe("Test scaffold", () => {
        let botPlugin: TeamsBot;
        let botPluginImpl: TeamsBotImpl;
        let scaffoldDir = "";

        beforeEach(async () => {
            // Arrange
            botPlugin = new TeamsBot();
            botPluginImpl = new TeamsBotImpl();
            botPlugin.teamsBotImpl = botPluginImpl;

            botPluginImpl.config.scaffold.scaffolded = false;

            botPluginImpl.config.scaffold.botId = utils.genUUID();
            botPluginImpl.config.scaffold.botPassword = utils.genUUID();

            const randomDirName = utils.genUUID();
            scaffoldDir = path.resolve(__dirname, randomDirName);
            await fs.ensureDir(scaffoldDir);
        });

        afterEach(() => {
            sinon.restore();
        });

        it("happy path typescript", async () => {
            // Arrange
            botPluginImpl.config.scaffold.programmingLanguage = ProgrammingLanguage.TypeScript;
            botPluginImpl.config.scaffold.wayToRegisterBot = WayToRegisterBot.CreateNew;
            botPluginImpl.config.actRoles = [PluginActRoles.Bot];

            // Prepare fake zip buffer
            const zip = new AdmZip();
            zip.addFile(
                ".env",
                Buffer.from(`${ScaffoldPlaceholders.BOT_ID}\n${ScaffoldPlaceholders.BOT_PASSWORD}`),
            );
            zip.addFile(".vscode/launch.json", Buffer.from(ScaffoldPlaceholders.TEAMS_APP_ID));

            sinon.stub(downloadByUrl, "downloadByUrl").resolves(zip.toBuffer());

            const pluginContext = testUtils.newPluginContext();
            pluginContext.root = scaffoldDir;

            // Act
            const result = await botPlugin.scaffold(pluginContext);

            // Assert
            chai.assert.deepEqual(result, ResultFactory.Success());
            chai.assert.isTrue(await fs.pathExists(`${scaffoldDir}/bot/.env`));
            chai.assert.isTrue(await fs.pathExists(`${scaffoldDir}/bot/.vscode/launch.json`));
        });

        it("happy path javascript", async () => {
            // Arrange
            botPluginImpl.config.scaffold.programmingLanguage = ProgrammingLanguage.JavaScript;
            botPluginImpl.config.scaffold.wayToRegisterBot = WayToRegisterBot.CreateNew;
            botPluginImpl.config.actRoles = [PluginActRoles.MessageExtension];

            // Prepare fake zip buffer
            const zip = new AdmZip();
            zip.addFile(
                ".env",
                Buffer.from(`${ScaffoldPlaceholders.BOT_ID}\n${ScaffoldPlaceholders.BOT_PASSWORD}`),
            );
            zip.addFile(".vscode/launch.json", Buffer.from(ScaffoldPlaceholders.TEAMS_APP_ID));

            sinon.stub(downloadByUrl, "downloadByUrl").resolves(zip.toBuffer());

            const pluginContext = testUtils.newPluginContext();
            pluginContext.root = scaffoldDir;

            // Act
            const result = await botPlugin.scaffold(pluginContext);

            // Assert
            chai.assert.deepEqual(result, ResultFactory.Success());
            chai.assert.isTrue(await fs.pathExists(`${scaffoldDir}/bot/.env`));
            chai.assert.isTrue(await fs.pathExists(`${scaffoldDir}/bot/.vscode/launch.json`));
        });
    });

    describe("Test preProvision", () => {
        afterEach(() => {
            sinon.restore();
        });

        let botPlugin: TeamsBot;
        let botPluginImpl: TeamsBotImpl;

        beforeEach(() => {
            botPlugin = new TeamsBot();
            botPluginImpl = new TeamsBotImpl();
            botPlugin.teamsBotImpl = botPluginImpl;
        });

        it("Precondition checking failed", async () => {
            // Arrange
            botPluginImpl.config.scaffold.botId = utils.genUUID();
            botPluginImpl.config.scaffold.botPassword = utils.genUUID();

            // Missing ProgrammingLanguage and others.

            // Act
            const result = await botPlugin.preProvision(testUtils.newPluginContext());

            // Assert
            chai.assert.isTrue(result.isErr());
        });
    });
});
