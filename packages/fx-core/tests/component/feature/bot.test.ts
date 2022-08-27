// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ContextV3,
  InputsWithProjectPath,
  ok,
  Platform,
  ProjectSettingsV3,
  ResourceContextV3,
  TeamsAppManifest,
} from "@microsoft/teamsfx-api";
import * as templatesAction from "../../../src/common/template-utils/templatesActions";
import { manifestUtils } from "../../../src/component/resource/appManifest/utils";
import * as projectSettingsLoader from "../../../src/core/middleware/projectSettingsLoader";
import { assert } from "chai";
import "mocha";
import * as os from "os";
import * as path from "path";
import fs from "fs-extra";
import { createSandbox, SinonStub } from "sinon";
import * as utils from "../../../src/component/utils";
import { getComponent } from "../../../src/component/workflow";
import { setTools } from "../../../src/core/globalVars";
import { MockTools, randomAppName } from "../../core/utils";
import "../../../src/component/core";
import { environmentManager, newEnvInfoV3 } from "../../../src/core/environment";
import {
  AadAppOutputs,
  ComponentNames,
  ProgrammingLanguage,
} from "../../../src/component/constants";
import {
  AzureSolutionQuestionNames,
  NotificationOptionItem,
} from "../../../src/plugins/solution/fx-solution/question";
import { QuestionNames } from "../../../src/plugins/resource/bot/constants";
import { AppServiceOptionItem } from "../../../src/plugins/resource/bot/question";
import Container from "typedi";
import child_process from "child_process";
import { AppSettingConstants } from "../../../src/component/code/appSettingUtils";
describe("Bot Feature", () => {
  const sandbox = createSandbox();
  const tools = new MockTools();
  setTools(tools);
  const appName = `unittest${randomAppName()}`;
  const projectPath = path.join(os.homedir(), "TeamsApps", appName);
  let context: ContextV3;
  const projectSetting: ProjectSettingsV3 = {
    appName: "",
    projectId: "",
    programmingLanguage: "typescript",
    components: [],
  };
  const manifest = {} as TeamsAppManifest;

  let pathExistStub: SinonStub;
  let writeFileStub: SinonStub;
  beforeEach(() => {
    sandbox.stub(tools.ui, "showMessage").resolves(ok("Confirm"));
    sandbox.stub(templatesAction, "scaffoldFromTemplates").resolves();
    sandbox.stub(manifestUtils, "readAppManifest").resolves(ok(manifest));
    sandbox.stub(manifestUtils, "writeAppManifest").resolves(ok(undefined));
    sandbox.stub(projectSettingsLoader, "loadProjectSettings").resolves(ok(projectSetting));
    sandbox.stub(fs, "readJson").resolves({});
    sandbox.stub(fs, "writeJSON").resolves();
    sandbox.stub(fs, "writeJson").resolves();
    pathExistStub = sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "copyFile").resolves();
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(fs, "appendFile").resolves();
    writeFileStub = sandbox.stub(fs, "writeFile").resolves();
    sandbox.stub(fs, "ensureDirSync").returns();
    sandbox.stub(fs, "readdirSync").returns([]);
    sandbox.stub(fs, "appendFileSync").returns();
    sandbox.stub(fs, "writeFileSync").returns();
    sandbox.stub(environmentManager, "listRemoteEnvConfigs").resolves(ok(["dev"]));
    sandbox.stub(utils, "persistBicep").resolves(ok(undefined));
    context = utils.createContextV3();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("add restify notification bot", async () => {
    sandbox.stub(utils.bicepUtils, "persistBiceps").resolves(ok(undefined));
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      [AzureSolutionQuestionNames.Features]: NotificationOptionItem.id,
      language: "typescript",
      "app-name": appName,
      [QuestionNames.BOT_HOST_TYPE_TRIGGER]: [AppServiceOptionItem.id],
    };
    const teamsBotComponent = Container.get("teams-bot") as any;
    const addBotRes = await teamsBotComponent.add(context, inputs);
    if (addBotRes.isErr()) {
      console.log(addBotRes.error);
    }
    assert.isTrue(addBotRes.isOk());
    const teamsBot = getComponent(context.projectSetting, ComponentNames.TeamsBot);
    assert.exists(teamsBot);
    assert.equal(teamsBot?.hosting, ComponentNames.AzureWebApp);
    assert.equal(teamsBot?.folder, "bot");
    assert.isTrue(teamsBot?.build);
    assert.deepEqual(teamsBot?.capabilities, ["notification"]);
    const webApp = getComponent(context.projectSetting, ComponentNames.AzureWebApp);
    assert.exists(webApp?.connections);
    if (webApp?.connections) {
      assert.include(webApp.connections, ComponentNames.TeamsBot);
      assert.include(webApp.connections, ComponentNames.Identity);
      assert.equal(webApp.connections.length, 2);
    }
    const botService = getComponent(context.projectSetting, ComponentNames.BotService);
    assert.exists(botService);
    assert.isTrue(botService?.provision);
  });
  it("configure dotnet bot", async () => {
    const appSettings = [
      AppSettingConstants.Placeholders.botId,
      AppSettingConstants.Placeholders.botPassword,
    ].join(";");
    sandbox.stub(fs, "readFile").resolves(appSettings as any);
    context.projectSetting.programmingLanguage = ProgrammingLanguage.CSharp;
    context.projectSetting.components.push({
      name: ComponentNames.TeamsBot,
      folder: ".",
    });
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VS,
    };
    context.envInfo = newEnvInfoV3("local");
    const botId = "123";
    const botPassword = "abc";
    context.envInfo.state[ComponentNames.TeamsBot] = {
      botId: botId,
      botPassword: botPassword,
    };
    const component = Container.get(ComponentNames.TeamsBot) as any;
    const res = await component.configure(context as ResourceContextV3, inputs);
    assert.isTrue(res.isOk());
    const expectedAppSettings = `${botId};${botPassword}`;
    assert.equal(writeFileStub.args?.[0]?.[1], expectedAppSettings);
  });
  it("configure dotnet sso bot", async () => {
    const appSettings = [
      AppSettingConstants.Placeholders.botId,
      AppSettingConstants.Placeholders.botPassword,
      AppSettingConstants.Placeholders.clientId,
      AppSettingConstants.Placeholders.clientSecret,
      AppSettingConstants.Placeholders.oauthAuthority,
      AppSettingConstants.Placeholders.applicationIdUri,
      AppSettingConstants.Placeholders.initiateLoginEndpoint,
    ].join(";");
    sandbox.stub(fs, "readFile").resolves(appSettings as any);
    context.projectSetting.programmingLanguage = ProgrammingLanguage.CSharp;
    context.projectSetting.components.push({
      name: ComponentNames.TeamsBot,
      folder: ".",
      sso: true,
    });
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VS,
    };
    context.envInfo = newEnvInfoV3("local");
    const botId = "123";
    const botPassword = "abc";
    context.envInfo.state[ComponentNames.TeamsBot] = {
      botId: botId,
      botPassword: botPassword,
    };
    const applicationIdUris = "endpoint/123";
    const clientId = "234";
    const clientSecret = "xcv";
    const oauthAuthority = "https://login.microsoftonline.com/890-86";
    const botEndpoint = "https://345.ngrok.io";
    const loginEndpoint = `${botEndpoint}/bot-auth-start`;
    context.envInfo.state[ComponentNames.AadApp] = {
      [AadAppOutputs.applicationIdUris.key]: applicationIdUris,
      [AadAppOutputs.clientId.key]: clientId,
      [AadAppOutputs.clientSecret.key]: clientSecret,
      [AadAppOutputs.oauthAuthority.key]: oauthAuthority,
      [AadAppOutputs.botEndpoint.key]: botEndpoint,
    };
    const component = Container.get(ComponentNames.TeamsBot) as any;
    const res = await component.configure(context as ResourceContextV3, inputs);
    assert.isTrue(res.isOk());
    const expectedAppSettings = [
      botId,
      botPassword,
      clientId,
      clientSecret,
      oauthAuthority,
      applicationIdUris,
      loginEndpoint,
    ].join(";");
    assert.equal(writeFileStub.args?.[0]?.[1], expectedAppSettings);
  });
  it("configure dotnet sso bot app setting file does not exist", async () => {
    pathExistStub.resolves(false);
    context.projectSetting.programmingLanguage = ProgrammingLanguage.CSharp;
    context.projectSetting.components.push({
      name: ComponentNames.TeamsBot,
      folder: ".",
      sso: true,
    });
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VS,
    };
    context.envInfo = newEnvInfoV3("local");
    const botId = "123";
    const botPassword = "abc";
    context.envInfo.state[ComponentNames.TeamsBot] = {
      botId: botId,
      botPassword: botPassword,
    };
    const applicationIdUris = "endpoint/123";
    const clientId = "234";
    const clientSecret = "xcv";
    const oauthAuthority = "https://login.microsoftonline.com/890-86";
    const botEndpoint = "https://345.ngrok.io";
    const loginEndpoint = `${botEndpoint}/bot-auth-start`;
    context.envInfo.state[ComponentNames.AadApp] = {
      [AadAppOutputs.applicationIdUris.key]: applicationIdUris,
      [AadAppOutputs.clientId.key]: clientId,
      [AadAppOutputs.clientSecret.key]: clientSecret,
      [AadAppOutputs.oauthAuthority.key]: oauthAuthority,
      [AadAppOutputs.botEndpoint.key]: botEndpoint,
    };
    const component = Container.get(ComponentNames.TeamsBot) as any;
    const res = await component.configure(context as ResourceContextV3, inputs);
    assert.isTrue(res.isOk());
    const expectedAppSettings = [
      botId,
      botPassword,
      clientId,
      clientSecret,
      oauthAuthority,
      applicationIdUris,
      loginEndpoint,
    ];
    expectedAppSettings.forEach((v) => {
      assert.include(writeFileStub.args?.[0]?.[1], v);
    });
  });
  it("bot build ts", async () => {
    context.projectSetting.programmingLanguage = ProgrammingLanguage.TS;
    context.projectSetting.components.push({
      name: ComponentNames.TeamsBot,
      folder: "bot",
    });
    const component = Container.get(ComponentNames.TeamsBot) as any;
    const execStub = sandbox.stub(child_process, "exec").yields();
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
    };
    const res = await component.build(context, inputs);
    assert.isTrue(res.isOk());
    assert.isTrue(execStub.calledTwice); // Exec `npm install` & `npm run build`
    assert.equal(execStub.args?.[0]?.[0], "npm install");
    assert.equal(execStub.args?.[1]?.[0], "npm run build");
    assert.isTrue(
      context.projectSetting.components.some(
        (component) =>
          component.name === ComponentNames.TeamsBot &&
          component.artifactFolder === component.folder
      )
    );
  });
  it("bot build js", async () => {
    context.projectSetting.programmingLanguage = ProgrammingLanguage.JS;
    context.projectSetting.components.push({
      name: ComponentNames.TeamsBot,
      folder: "bot",
    });
    const component = Container.get(ComponentNames.TeamsBot) as any;
    const execStub = sandbox.stub(child_process, "exec").yields();
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
    };
    const res = await component.build(context, inputs);
    assert.isTrue(res.isOk());
    assert.isTrue(execStub.calledOnce); // Exec `npm install`
    assert.equal(execStub.args?.[0]?.[0], "npm install");
    assert.isTrue(
      context.projectSetting.components.some(
        (component) =>
          component.name === ComponentNames.TeamsBot &&
          component.artifactFolder === component.folder
      )
    );
  });
  it("bot build csharp", async () => {
    context.projectSetting.programmingLanguage = ProgrammingLanguage.CSharp;
    context.projectSetting.components.push({
      name: ComponentNames.TeamsBot,
      folder: "bot",
    });
    const component = Container.get(ComponentNames.TeamsBot) as any;
    const execStub = sandbox.stub(child_process, "exec").yields();
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
    };
    const res = await component.build(context, inputs);
    assert.isTrue(res.isOk());
    assert.isTrue(execStub.calledOnce); // Exec `dotnet publish`
    assert.include(execStub.args?.[0]?.[0], "dotnet publish");
    assert.isTrue(
      context.projectSetting.components.some(
        (component) =>
          component.name === ComponentNames.TeamsBot &&
          component.artifactFolder?.includes("publish")
      )
    );
  });
});
