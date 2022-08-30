// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
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
  StorageOutputs,
} from "../../../src/component/constants";
import * as aadManifest from "../../../src/core/generateAadManifestTemplate";
import Container from "typedi";
import { AppSettingConstants } from "../../../src/component/code/appSettingUtils";
describe("Tab Feature", () => {
  const sandbox = createSandbox();
  const tools = new MockTools();
  setTools(tools);
  const appName = `unittest${randomAppName()}`;
  const projectPath = path.join(os.homedir(), "TeamsApps", appName);
  const context = utils.createContextV3();
  const projectSetting: ProjectSettingsV3 = {
    appName: "",
    projectId: "",
    programmingLanguage: "typescript",
    components: [],
  };
  context.projectSetting = projectSetting;
  const manifest = {} as TeamsAppManifest;

  let writeFileStub: SinonStub;
  beforeEach(() => {
    sandbox.stub(tools.ui, "showMessage").resolves(ok("Confirm"));
    sandbox.stub(manifestUtils, "readAppManifest").resolves(ok(manifest));
    sandbox.stub(manifestUtils, "writeAppManifest").resolves(ok(undefined));
    sandbox.stub(projectSettingsLoader, "loadProjectSettings").resolves(ok(projectSetting));
    sandbox.stub(fs, "readJson").resolves({});
    sandbox.stub(fs, "writeJSON").resolves();
    sandbox.stub(fs, "writeJson").resolves();
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "copyFile").resolves();
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(fs, "appendFile").resolves();
    writeFileStub = sandbox.stub(fs, "writeFile").resolves();
    sandbox.stub(fs, "ensureDirSync").returns();
    sandbox.stub(fs, "readdirSync").returns([]);
    sandbox.stub(fs, "appendFileSync").returns();
    sandbox.stub(fs, "writeFileSync").returns();
    sandbox.stub(environmentManager, "listRemoteEnvConfigs").resolves(ok(["dev"]));
    sandbox.stub(aadManifest, "generateAadManifestTemplate").resolves();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("add react tab", async () => {
    sandbox.stub(templatesAction, "scaffoldFromTemplates").resolves();
    sandbox.stub(utils.bicepUtils, "persistBiceps").resolves(ok(undefined));

    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      language: "typescript",
      "app-name": appName,
    };
    const component = Container.get("teams-tab") as any;
    const addTabRes = await component.add(context, inputs);
    if (addTabRes.isErr()) {
      console.log(addTabRes.error);
    }
    assert.isTrue(addTabRes.isOk());
    const teamsTab = getComponent(context.projectSetting, ComponentNames.TeamsTab);
    assert.exists(teamsTab);
    assert.equal(teamsTab?.hosting, ComponentNames.AzureStorage);
    assert.equal(teamsTab?.folder, "tabs");
    assert.isTrue(teamsTab?.build);
    const storage = getComponent(context.projectSetting, ComponentNames.AzureStorage);
    assert.exists(storage);
  });

  it("add react tab twice", async () => {
    sandbox.stub(templatesAction, "scaffoldFromTemplates").rejects();
    sandbox.stub(utils.bicepUtils, "persistBiceps").resolves(ok(undefined));

    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      language: "typescript",
      "app-name": appName,
    };
    const component = Container.get("teams-tab") as any;
    const addTabRes = await component.add(context, inputs);
    if (addTabRes.isErr()) {
      console.log(addTabRes.error);
    }
    assert.isTrue(addTabRes.isOk());
    const teamsTab = context.projectSetting.components.filter(
      (component) => component.name === ComponentNames.TeamsTab
    );
    assert.equal(teamsTab.length, 1);
    const storage = context.projectSetting.components.filter(
      (component) => component.name === ComponentNames.AzureStorage
    );
    assert.equal(storage.length, 1);
  });
  it("local debug config state vsc", async () => {
    context.projectSetting.programmingLanguage = ProgrammingLanguage.JS;
    context.projectSetting.components.push({
      name: ComponentNames.TeamsTab,
    });
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
    };
    context.envInfo = newEnvInfoV3("local");
    const component = Container.get(ComponentNames.TeamsTab) as any;
    const res = await component.provision(context as ResourceContextV3, inputs);
    assert.isTrue(res.isOk());
    const tabState = context.envInfo.state?.[ComponentNames.TeamsTab];
    assert.equal(tabState?.[StorageOutputs.indexPath.key], "/index.html#");
  });
  it("local debug config state vs", async () => {
    context.projectSetting.programmingLanguage = ProgrammingLanguage.CSharp;
    context.projectSetting.components.push({
      name: ComponentNames.TeamsTab,
    });
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VS,
    };
    context.envInfo = newEnvInfoV3("local");
    const component = Container.get(ComponentNames.TeamsTab) as any;
    const res = await component.provision(context as ResourceContextV3, inputs);
    assert.isTrue(res.isOk());
    const tabState = context.envInfo.state?.[ComponentNames.TeamsTab];
    assert.equal(tabState?.[StorageOutputs.indexPath.key], "");
  });
  it("configure sso blazor tab", async () => {
    const appSettings = [
      AppSettingConstants.Placeholders.clientId,
      AppSettingConstants.Placeholders.clientSecret,
      AppSettingConstants.Placeholders.oauthAuthority,
    ].join(";");
    sandbox.stub(fs, "readFile").resolves(appSettings as any);
    context.projectSetting.programmingLanguage = ProgrammingLanguage.CSharp;
    context.projectSetting.components.push({
      name: ComponentNames.TeamsTab,
      folder: ".",
      sso: true,
    });
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VS,
    };
    context.envInfo = newEnvInfoV3("local");
    const clientId = "123";
    const clientSecret = "abc";
    const oauthAuthority = "https://login.microsoftonline.com/890-86";
    context.envInfo.state[ComponentNames.AadApp] = {
      [AadAppOutputs.clientId.key]: clientId,
      [AadAppOutputs.clientSecret.key]: clientSecret,
      [AadAppOutputs.oauthAuthority.key]: oauthAuthority,
    };
    const component = Container.get(ComponentNames.TeamsTab) as any;
    const res = await component.configure(context as ResourceContextV3, inputs);
    assert.isTrue(res.isOk());
    const expectedAppSettings = [clientId, clientSecret, oauthAuthority].join(";");
    assert.equal(writeFileStub.args?.[0]?.[1], expectedAppSettings);
  });
});
