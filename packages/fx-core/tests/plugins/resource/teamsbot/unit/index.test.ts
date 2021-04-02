// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import 'mocha';
import * as chai from 'chai';
import * as dotenv from 'dotenv';
import * as fs from 'fs-extra';
import * as sinon from 'sinon';
import { default as chaiAsPromised } from 'chai-as-promised';
import AdmZip from 'adm-zip';
import path from 'path';

dotenv.config();

import { TeamsBot } from '../../src/index';
import { TeamsBotImpl } from '../../src/plugin';

import { QuestionNames, ScaffoldPlaceholders } from '../../src/constants';
import * as downloadByUrl from '../../src/utils/downloadByUrl';
import * as utils from '../../src/utils/common';
import { ProgrammingLanguage } from '../../src/enums/programmingLanguage';
import { FxTeamsBotPluginResultFactory as ResultFactory } from '../../src/result';
import { WayToRegisterBot } from '../../src/enums/wayToRegisterBot';
import * as testUtils from '../utils';

chai.use(chaiAsPromised);

describe('Teams Bot Resource Plugin', () => {
    describe('Test preScaffold', () => {
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

        it('Reuse an existing bot registration', async () => {
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

    describe('Test scaffold', () => {
        let botPlugin: TeamsBot;
        let botPluginImpl: TeamsBotImpl;
        let scaffoldDir = '';

        beforeEach(async () => {
            // Arrange
            botPlugin = new TeamsBot();
            botPluginImpl = new TeamsBotImpl();
            botPlugin.teamsBotImpl = botPluginImpl;

            botPluginImpl.config.scaffold.scaffolded = false;

            botPluginImpl.config.scaffold.botId = utils.genUUID();
            botPluginImpl.config.scaffold.botPassword = utils.genUUID();
            botPluginImpl.config.scaffold.teamsAppId = utils.genUUID();

            let randomDirName = utils.genUUID();
            scaffoldDir = path.resolve(__dirname, randomDirName);
            await fs.ensureDir(scaffoldDir);
        });

        afterEach(() => {
            sinon.restore();
        });

        it('happy path typescript', async () => {
            // Arrange
            botPluginImpl.config.scaffold.programmingLanguage = ProgrammingLanguage.TypeScript;
            botPluginImpl.config.scaffold.wayToRegisterBot = WayToRegisterBot.CreateNew;

            // Prepare fake zip buffer
            const zip = new AdmZip();
            zip.addFile(
                '.env',
                Buffer.from(`${ScaffoldPlaceholders.BOT_ID}\n${ScaffoldPlaceholders.BOT_PASSWORD}`),
            );
            zip.addFile('.vscode/launch.json', Buffer.from(ScaffoldPlaceholders.TEAMS_APP_ID));

            sinon.stub(downloadByUrl, 'downloadByUrl').resolves(zip.toBuffer());

            const pluginContext = testUtils.newPluginContext();
            pluginContext.root = scaffoldDir;

            // Act
            let result = await botPlugin.scaffold(pluginContext);

            // Assert
            chai.assert.deepEqual(result, ResultFactory.Success());
            chai.assert.isTrue(await fs.pathExists(`${scaffoldDir}/bot/.env`));
            chai.assert.isTrue(await fs.pathExists(`${scaffoldDir}/bot/.vscode/launch.json`));
        });

        it('happy path csharp', async () => {
            // Arrange
            botPluginImpl.config.scaffold.programmingLanguage = ProgrammingLanguage.CSharp;
            botPluginImpl.config.scaffold.wayToRegisterBot = WayToRegisterBot.CreateNew;

            // Prepare fake zip buffer
            const zip = new AdmZip();
            zip.addFile(
                'appsettings.json',
                Buffer.from(`${ScaffoldPlaceholders.BOT_ID}\n${ScaffoldPlaceholders.BOT_PASSWORD}`),
            );
            zip.addFile('.vscode/launch.json', Buffer.from(ScaffoldPlaceholders.TEAMS_APP_ID));

            sinon.stub(downloadByUrl, 'downloadByUrl').resolves(zip.toBuffer());

            const pluginContext = testUtils.newPluginContext();
            pluginContext.root = scaffoldDir;

            // Act
            let result = await botPlugin.scaffold(pluginContext);

            // Assert
            chai.assert.deepEqual(result, ResultFactory.Success());
            chai.assert.isTrue(await fs.pathExists(`${scaffoldDir}/bot/appsettings.json`));
            chai.assert.isTrue(await fs.pathExists(`${scaffoldDir}/bot/.vscode/launch.json`));
        });

        it('happy path javascript', async () => {
            // Arrange
            botPluginImpl.config.scaffold.programmingLanguage = ProgrammingLanguage.JavaScript;
            botPluginImpl.config.scaffold.wayToRegisterBot = WayToRegisterBot.CreateNew;

            // Prepare fake zip buffer
            const zip = new AdmZip();
            zip.addFile(
                '.env',
                Buffer.from(`${ScaffoldPlaceholders.BOT_ID}\n${ScaffoldPlaceholders.BOT_PASSWORD}`),
            );
            zip.addFile('.vscode/launch.json', Buffer.from(ScaffoldPlaceholders.TEAMS_APP_ID));

            sinon.stub(downloadByUrl, 'downloadByUrl').resolves(zip.toBuffer());

            const pluginContext = testUtils.newPluginContext();
            pluginContext.root = scaffoldDir;

            // Act
            let result = await botPlugin.scaffold(pluginContext);

            // Assert
            chai.assert.deepEqual(result, ResultFactory.Success());
            chai.assert.isTrue(await fs.pathExists(`${scaffoldDir}/bot/.env`));
            chai.assert.isTrue(await fs.pathExists(`${scaffoldDir}/bot/.vscode/launch.json`));
        });
    });

    describe('Test preProvision', () => {
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

        it('Precondition checking pass', async () => {
            // Arrange
            botPluginImpl.config.scaffold.botId = utils.genUUID();
            botPluginImpl.config.scaffold.botPassword = utils.genUUID();
            botPluginImpl.config.scaffold.programmingLanguage = ProgrammingLanguage.TypeScript;

            // Act
            const result = await botPlugin.preProvision(testUtils.newPluginContext());

            // Assert
            chai.assert.deepEqual(result, ResultFactory.Success());
        });

        it('Precondition checking failed', async () => {
            // Arrange
            botPluginImpl.config.scaffold.botId = utils.genUUID();
            botPluginImpl.config.scaffold.botPassword = utils.genUUID();

            // Missing ProgrammingLanguage.

            // Act
            const result = await botPlugin.preProvision(testUtils.newPluginContext());

            // Assert
            chai.assert.isTrue(result.isErr());
        });
    });

    describe('Test provision & deploy', () => {
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

        it('Test preDeploy', async () => {
            // Arrange
            botPluginImpl.config.provision.siteEndpoint = 'https://5sf2z8ankkb8941p.azurewebsites.net';

            // Act
            const result = await botPlugin.preDeploy(testUtils.newPluginContext());

            // Assert
            chai.assert.deepEqual(result, ResultFactory.Success());
        });
    });
});
