// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import sinon from "sinon";
import path from "path";
import * as os from "os";
import fs from "fs-extra";
import _ from "lodash";
import AdmZip from "adm-zip";
import {
  ContextV3,
  InputsWithProjectPath,
  Platform,
  ResourceContextV3,
  TeamsAppManifest,
  ok,
  SingleSelectResult,
} from "@microsoft/teamsfx-api";
import Container from "typedi";
import { randomAppName, MockLogProvider, MockTools } from "../../../core/utils";
import { createContextV3 } from "../../../../src/component/utils";
import { setTools } from "../../../../src/core/globalVars";
import { AppManifest } from "../../../../src/component/resource/appManifest/appManifest";
import { AppStudioError } from "../../../../src/component/resource/appManifest/errors";
import { ComponentNames } from "../../../../src/component/constants";
import { AppStudioClient } from "../../../../src/component/resource/appManifest/appStudioClient";
import { Constants } from "../../../../src/component/resource/appManifest/constants";
import { autoPublishOption } from "../../../../src/component/resource/appManifest/questions";
import { PublishingState } from "../../../../src/component/resource/appManifest/interfaces/IPublishingAppDefinition";
import { getAzureProjectRoot } from "../../../plugins/resource/appstudio/helper";
import { manifestUtils } from "../../../../src/component/resource/appManifest/utils/ManifestUtils";
import * as uuid from "uuid";
import { newEnvInfoV3 } from "../../../../src/core/environment";
import { AppDefinition } from "../../../../src/component/resource/appManifest/interfaces/appDefinition";
import mockedEnv, { RestoreFn } from "mocked-env";
import { FeatureFlagName } from "../../../../src/common/constants";
import * as commonTools from "../../../../src/common/tools";
import { CreateAppPackageDriver } from "../../../../src/component/driver/teamsApp/createAppPackage";
import { envUtil } from "../../../../src/component/utils/envUtil";

describe("App-manifest Component", () => {
  const sandbox = sinon.createSandbox();
  const component = new AppManifest();
  const tools = new MockTools();
  const appName = randomAppName();
  const inputs: InputsWithProjectPath = {
    projectPath: getAzureProjectRoot(),
    platform: Platform.VSCode,
    "app-name": appName,
    appPackagePath: "fakePath",
  };
  const appDef: AppDefinition = {
    appName: "fake",
    teamsAppId: uuid.v4(),
    userList: [],
  };
  const inputsWithoutUserProvidedZip: InputsWithProjectPath = {
    projectPath: getAzureProjectRoot(),
    platform: Platform.VSCode,
    "app-name": appName,
  };
  let context: ContextV3;
  setTools(tools);

  beforeEach(() => {
    context = createContextV3();
    context.envInfo = newEnvInfoV3();
    context.envInfo!.state["solution"] = {
      ["provisionSucceed"]: true,
    };
    context.envInfo!.state[ComponentNames.AppManifest] = {
      ["teamsAppUpdatedAt"]: undefined,
    };
    sandbox.stub(tools.tokenProvider.m365TokenProvider, "getAccessToken").resolves(ok("fakeToken"));
    sandbox.stub(tools.tokenProvider.m365TokenProvider, "getJsonObject").resolves(
      ok({
        unique_name: "fakename",
      })
    );

    const res: SingleSelectResult = {
      type: "success",
      result: autoPublishOption(),
    };
    sandbox.stub(context.userInteraction, "selectOption").resolves(ok(res));

    context.logProvider = new MockLogProvider();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("validate manifest", async function () {
    sandbox.stub(manifestUtils, "getManifest").resolves(ok(new TeamsAppManifest()));
    const validationAction = await component.validate(context as ResourceContextV3, inputs);
    chai.assert.isTrue(validationAction.isOk());
  });

  it.skip("validation manifest - without schema", async function () {
    const manifest = new TeamsAppManifest();
    manifest.$schema = undefined;
    sandbox.stub(manifestUtils, "getManifest").resolves(ok(manifest));
    const validationAction = await component.validate(context as ResourceContextV3, inputs);
    chai.assert.isTrue(validationAction.isErr());
    if (validationAction.isErr()) {
      chai.assert.equal(validationAction.error.name, AppStudioError.ValidationFailedError.name);
    }
  });

  it("build", async function () {
    const manifest = new TeamsAppManifest();
    manifest.icons.color = "resources/color.png";
    manifest.icons.outline = "resources/outline.png";
    manifest.id = "";
    manifest.localizationInfo = {
      defaultLanguageTag: "en",
      additionalLanguages: [
        {
          languageTag: "de",
          file: "resources/de.json",
        },
      ],
    };
    sandbox.stub(manifestUtils, "getManifest").resolves(ok(manifest));
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "writeFile").resolves();
    sandbox.stub(fs, "chmod").resolves();

    const buildAction = await component.build(context as ResourceContextV3, inputs);
    chai.assert(buildAction.isOk());
  });

  it("build for SPFx project", async function () {
    const manifest = new TeamsAppManifest();
    manifest.icons.color = "resources/color.png";
    manifest.icons.outline = "resources/outline.png";
    manifest.id = "";
    context.projectSetting!["solutionSettings"] = {
      name: "fx-solution-azure",
      activeResourcePlugins: "fx-resource-spfx",
    };
    const webpartId1 = uuid.v4();
    const webpartId2 = uuid.v4();
    sandbox.stub(manifestUtils, "getManifest").resolves(ok(manifest));
    sandbox.stub(fs, "pathExists").resolves(true);
    const stubWriteFile = sandbox.stub(fs, "writeFile").resolves();
    sandbox.stub(fs, "chmod").resolves();
    sandbox.stub(fs, "copyFile").resolves();
    sandbox
      .stub(fs, "readdir")
      .resolves([
        `${webpartId1}_color.png`,
        `${webpartId1}_outline.png`,
        `${webpartId2}_color.png`,
        `${webpartId2}_outline.png`,
      ] as any);
    sandbox.stub(fs, "readFile").resolves();

    const buildAction = await component.build(context as ResourceContextV3, inputs);
    chai.assert(buildAction.isOk());
  });

  it("deploy - filenotfound", async function () {
    const inputs2 = _.cloneDeep(inputs);
    inputs2.projectPath = path.join(os.homedir(), "TeamsApps", appName);
    const deployAction = await component.deploy(context as ResourceContextV3, inputs2);
    chai.assert.isTrue(deployAction.isErr());
    if (deployAction.isErr()) {
      chai.assert.equal(deployAction.error.name, AppStudioError.FileNotFoundError.name);
    }
  });

  it("deploy - preview only", async function () {
    const manifest = new TeamsAppManifest();
    manifest.id = "";
    manifest.icons.color = "resources/color.png";
    manifest.icons.outline = "resources/outline.png";
    sandbox.stub(manifestUtils, "readAppManifest").resolves(ok(manifest));
    sandbox.stub(manifestUtils, "getManifest").resolves(ok(manifest));
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readJSON").resolves(manifest);
    sandbox.stub(fs, "readFile").resolves(new Buffer(JSON.stringify(manifest)));
    sandbox.stub(context.userInteraction, "showMessage").resolves(ok("Preview only"));
    sandbox.stub(AppStudioClient, "importApp").resolves(appDef);

    const deployAction = await component.deploy(context as ResourceContextV3, inputs);
    chai.assert.isTrue(deployAction.isErr());
  });

  it.skip("deploy - succeed", async function () {
    const manifest = new TeamsAppManifest();
    sandbox.stub(manifestUtils, "readAppManifest").resolves(ok(manifest));
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readJSON").resolves(manifest);
    sandbox.stub(fs, "readFile").resolves(new Buffer(JSON.stringify(manifest)));
    sandbox.stub(context.userInteraction, "showMessage").resolves(ok("Preview and update"));
    sandbox.stub(AppStudioClient, "importApp").resolves({ teamsAppId: "mockTeamsAppId" });

    const deployAction = await component.deploy(context as ResourceContextV3, inputs);
    if (deployAction.isErr()) {
      console.log(`Error response: ${JSON.stringify(deployAction.error)}`);
    }
    chai.assert.isTrue(deployAction.isOk());
  });

  it("publish - filenotfound", async function () {
    const publishAction = await component.publish(context as ResourceContextV3, inputs);
    chai.assert.isTrue(publishAction.isErr());
    if (publishAction.isErr()) {
      chai.assert.equal(publishAction.error.name, AppStudioError.FileNotFoundError.name);
    }
  });

  it("publish - user cancel", async function () {
    const manifest = new TeamsAppManifest();
    manifest.id = "";
    manifest.icons.color = "resources/color.png";
    manifest.icons.outline = "resources/outline.png";

    sandbox.stub(manifestUtils, "readAppManifest").resolves(ok(manifest));
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "writeFile").resolves();
    sandbox.stub(fs, "chmod").resolves();
    sandbox.stub(fs, "readFile").callsFake(async () => {
      const zip = new AdmZip();
      zip.addFile(Constants.MANIFEST_FILE, Buffer.from(JSON.stringify(new TeamsAppManifest())));
      zip.addFile("color.png", new Buffer(""));
      zip.addFile("outlie.png", new Buffer(""));

      const archivedFile = zip.toBuffer();
      return archivedFile;
    });
    const state = {
      lastModifiedDateTime: new Date(),
      teamsAppId: "",
      displayName: appName,
      publishingState: PublishingState.submitted,
    };
    sandbox.stub(AppStudioClient, "getAppByTeamsAppId").resolves(state);
    sandbox.stub(context.userInteraction, "showMessage").resolves(ok("Cancel"));

    const publishAction = await component.publish(
      context as ResourceContextV3,
      inputsWithoutUserProvidedZip
    );
    chai.assert.isTrue(publishAction.isErr());
    if (publishAction.isErr()) {
      chai.assert.equal(publishAction.error.name, AppStudioError.TeamsAppPublishFailedError.name);
    }
  });
  it("getManifest(tab) - happy path", async function () {
    const manifestString = `{
      "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.14/MicrosoftTeams.schema.json",
      "manifestVersion": "1.14",
      "version": "1.0.0",
      "id": "{{state.app-manifest.teamsAppId}}",
      "packageName": "com.microsoft.teams.extension",
      "developer": {
          "name": "Teams App, Inc.",
          "websiteUrl": "https://www.example.com",
          "privacyUrl": "https://www.example.com/termofuse",
          "termsOfUseUrl": "https://www.example.com/privacy"
      },
      "icons": {
          "color": "{{config.manifest.icons.color}}",
          "outline": "{{config.manifest.icons.outline}}"
      },
      "name": {
          "short": "{{config.manifest.appName.short}}",
          "full": "{{config.manifest.appName.full}}"
      },
      "description": {
          "short": "{{config.manifest.description.short}}",
          "full": "{{config.manifest.description.full}}"
      },
      "accentColor": "#FFFFFF",
      "bots": [],
      "composeExtensions": [],
      "staticTabs": [
          {
              "entityId": "index0",
              "name": "Personal Tab",
              "contentUrl": "{{{state.teams-tab.endpoint}}}{{{state.teams-tab.indexPath}}}/tab",
              "websiteUrl": "{{{state.teams-tab.endpoint}}}{{{state.teams-tab.indexPath}}}/tab",
              "scopes": [
                  "personal"
              ]
          }
      ],
      "permissions": [
          "identity",
          "messageTeamMembers"
      ],
      "validDomains": [
          "{{state.teams-tab.domain}}"
      ],
      "webApplicationInfo": {
          "id": "{{state.aad-app.clientId}}",
          "resource": "{{{state.aad-app.applicationIdUris}}}"
      }
    }`;
    sandbox.stub(fs, "readFile").resolves(manifestString as any);
    sandbox.stub(fs, "pathExists").resolves(true);
    const envInfo = newEnvInfoV3();
    envInfo.envName = "local";
    context.tokenProvider = tools.tokenProvider;
    envInfo.state = {
      solution: {
        provisionSucceeded: true,
        teamsAppTenantId: "zzzzzz-zzzzzz-zzzzz",
      },
      "app-manifest": {
        tenantId: "xxxxxxxxx-xxxxxxx-xxxxxxx",
        teamsAppId: "yyyyyyy-yyyyyyy-yyyyyyy",
      },
      "teams-tab": {
        indexPath: "/index.html#",
        endpoint: "https://localhost:53000",
        domain: "localhost",
      },
      "aad-app": {
        clientId: "aaaaaaaaaaa-aaaaaaaaaaa-aaaaaaaa",
        applicationIdUris: "https://aas-bcc",
      },
    };
    const getManifestRes = await manifestUtils.getManifest("", envInfo, false);
    chai.assert(getManifestRes.isOk());
    if (getManifestRes.isOk()) {
      const finalManifest = getManifestRes.value;
      chai.assert(finalManifest.validDomains?.includes("localhost:53000"));
    }
  });

  it("getManifest(tab+bot) - error", async function () {
    const manifestString = `{
      "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.14/MicrosoftTeams.schema.json",
      "manifestVersion": "1.14",
      "version": "1.0.0",
      "id": "{{state.app-manifest.teamsAppId}}",
      "packageName": "com.microsoft.teams.extension",
      "developer": {
          "name": "Teams App, Inc.",
          "websiteUrl": "https://www.example.com",
          "privacyUrl": "https://www.example.com/termofuse",
          "termsOfUseUrl": "https://www.example.com/privacy"
      },
      "icons": {
          "color": "{{config.manifest.icons.color}}",
          "outline": "{{config.manifest.icons.outline}}"
      },
      "name": {
          "short": "{{config.manifest.appName.short}}",
          "full": "{{config.manifest.appName.full}}"
      },
      "description": {
          "short": "{{config.manifest.description.short}}",
          "full": "{{config.manifest.description.full}}"
      },
      "accentColor": "#FFFFFF",
      "bots": [],
      "composeExtensions": [],
      "staticTabs": [
          {
              "entityId": "index0",
              "name": "Personal Tab",
              "contentUrl": "{{{state.teams-tab.endpoint}}}{{{state.teams-tab.indexPath}}}/tab",
              "websiteUrl": "{{{state.teams-tab.endpoint}}}{{{state.teams-tab.indexPath}}}/tab",
              "scopes": [
                  "personal"
              ]
          }
      ],
      "permissions": [
          "identity",
          "messageTeamMembers"
      ],
      "validDomains": [
          "{{state.teams-tab.domain}}"
      ],
      "webApplicationInfo": {
          "id": "{{state.aad-app.clientId}}",
          "resource": "{{{state.aad-app.applicationIdUris}}}"
      }
    }`;
    sandbox.stub(fs, "readFile").resolves(manifestString as any);
    sandbox.stub(fs, "pathExists").resolves(true);
    const envInfo = newEnvInfoV3();
    envInfo.envName = "local";
    context.tokenProvider = tools.tokenProvider;
    envInfo.state = {
      solution: {
        provisionSucceeded: true,
        teamsAppTenantId: "zzzzzz-zzzzzz-zzzzz",
      },
      "app-manifest": {
        tenantId: "xxxxxxxxx-xxxxxxx-xxxxxxx",
        teamsAppId: "yyyyyyy-yyyyyyy-yyyyyyy",
      },
      "teams-tab": {
        indexPath: "/index.html#",
        endpoint: "https://localhost:53000",
        domain: "localhost",
      },
      "aad-app": {
        clientId: "aaaaaaaaaaa-aaaaaaaaaaa-aaaaaaaa",
        applicationIdUris: "https://aas-bcc",
      },
      "teams-bot": {
        botId: "bbbbcccccc",
      },
    };
    const getManifestRes = await manifestUtils.getManifest("", envInfo, false);
    chai.assert(getManifestRes.isErr());
  });

  it("getManifest(tab+bot) - happy path", async function () {
    const manifestString = `{
      "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.14/MicrosoftTeams.schema.json",
      "manifestVersion": "1.14",
      "version": "1.0.0",
      "id": "{{state.app-manifest.teamsAppId}}",
      "packageName": "com.microsoft.teams.extension",
      "developer": {
          "name": "Teams App, Inc.",
          "websiteUrl": "https://www.example.com",
          "privacyUrl": "https://www.example.com/termofuse",
          "termsOfUseUrl": "https://www.example.com/privacy"
      },
      "icons": {
          "color": "{{config.manifest.icons.color}}",
          "outline": "{{config.manifest.icons.outline}}"
      },
      "name": {
          "short": "{{config.manifest.appName.short}}",
          "full": "{{config.manifest.appName.full}}"
      },
      "description": {
          "short": "{{config.manifest.description.short}}",
          "full": "{{config.manifest.description.full}}"
      },
      "accentColor": "#FFFFFF",
      "bots": [],
      "composeExtensions": [],
      "staticTabs": [
          {
              "entityId": "index0",
              "name": "Personal Tab",
              "contentUrl": "{{{state.teams-tab.endpoint}}}{{{state.teams-tab.indexPath}}}/tab",
              "websiteUrl": "{{{state.teams-tab.endpoint}}}{{{state.teams-tab.indexPath}}}/tab",
              "scopes": [
                  "personal"
              ]
          }
      ],
      "permissions": [
          "identity",
          "messageTeamMembers"
      ],
      "validDomains": [
      ],
      "webApplicationInfo": {
          "id": "{{state.aad-app.clientId}}",
          "resource": "{{{state.aad-app.applicationIdUris}}}"
      }
    }`;
    sandbox.stub(fs, "readFile").resolves(manifestString as any);
    sandbox.stub(fs, "pathExists").resolves(true);
    const envInfo = newEnvInfoV3();
    envInfo.envName = "local";
    context.tokenProvider = tools.tokenProvider;
    envInfo.state = {
      solution: {
        provisionSucceeded: true,
        teamsAppTenantId: "zzzzzz-zzzzzz-zzzzz",
      },
      "app-manifest": {
        tenantId: "xxxxxxxxx-xxxxxxx-xxxxxxx",
        teamsAppId: "yyyyyyy-yyyyyyy-yyyyyyy",
      },
      "teams-tab": {
        indexPath: "/index.html#",
        endpoint: "https://localhost:53000",
        domain: "localhost",
      },
      "aad-app": {
        clientId: "aaaaaaaaaaa-aaaaaaaaaaa-aaaaaaaa",
        applicationIdUris: "https://aas-bcc",
      },
      "teams-bot": {
        botId: "bbbbcccccc",
        validDomain: "abc.com",
      },
    };
    const getManifestRes = await manifestUtils.getManifest("", envInfo, false);
    chai.assert(getManifestRes.isOk());
    if (getManifestRes.isOk()) {
      const finalManifest = getManifestRes.value;
      chai.assert(finalManifest.validDomains?.includes("abc.com"));
    }
  });

  describe("collaboration v3", () => {
    let mockedEnvRestore: RestoreFn;
    before(() => {
      mockedEnvRestore = mockedEnv({
        [FeatureFlagName.V3]: "true",
      });
    });
    afterEach(() => {
      sandbox.restore();
    });
    after(() => {
      sandbox.restore();
      mockedEnvRestore();
    });

    it("listCollaborator v3 - succeed", async function () {
      sandbox
        .stub(AppStudioClient, "getUserList")
        .callsFake(async (teamsAppId: string, appStudioToken: string) => {
          return [
            {
              tenantId: "tenantId",
              aadId: teamsAppId,
              displayName: "displayName",
              userPrincipalName: "userPrincipalName",
              isAdministrator: true,
            },
          ];
        });

      const envInfo = newEnvInfoV3();
      envInfo.envName = "local";
      envInfo.state = {
        solution: {},
      };

      const result = await component.listCollaborator(
        context,
        inputs,
        envInfo,
        tools.tokenProvider.m365TokenProvider,
        "teamsAppId"
      );
      chai.assert.isTrue(result.isOk());
      if (result.isOk()) {
        chai.assert.equal(result.value[0].userObjectId, "teamsAppId");
      }
    });

    it("grantPermission v3 - succeed", async function () {
      sandbox.stub(AppStudioClient, "grantPermission").resolves();
      const envInfo = newEnvInfoV3();
      envInfo.envName = "local";
      envInfo.state = {
        solution: {},
      };

      const userList = {
        tenantId: "tenantId",
        aadId: "aadId",
        displayName: "displayName",
        userPrincipalName: "userPrincipalName",
        isAdministrator: true,
      };

      const result = await component.grantPermission(
        context,
        inputs,
        envInfo,
        tools.tokenProvider.m365TokenProvider,
        userList,
        "teamsAppId"
      );
      chai.assert.isTrue(result.isOk());
    });

    it("checkPermission v3 - succeed", async function () {
      sandbox.stub(AppStudioClient, "checkPermission").resolves(Constants.PERMISSIONS.admin);
      const envInfo = newEnvInfoV3();
      envInfo.envName = "local";
      envInfo.state = {
        solution: {},
      };

      const userList = {
        tenantId: "tenantId",
        aadId: "aadId",
        displayName: "displayName",
        userPrincipalName: "userPrincipalName",
        isAdministrator: true,
      };

      const result = await component.checkPermission(
        context,
        inputs,
        envInfo,
        tools.tokenProvider.m365TokenProvider,
        userList,
        "teamsAppId"
      );
      chai.assert.isTrue(result.isOk());
    });
  });
});

describe("App-manifest Component - v3", () => {
  const sandbox = sinon.createSandbox();
  const component = new AppManifest();
  const tools = new MockTools();
  const appName = randomAppName();
  const inputs: InputsWithProjectPath = {
    projectPath: getAzureProjectRoot(),
    platform: Platform.VSCode,
    "app-name": appName,
    appPackagePath: "fakePath",
  };
  const appDef: AppDefinition = {
    appName: "fake",
    teamsAppId: uuid.v4(),
    userList: [],
  };
  let context: ContextV3;
  setTools(tools);

  beforeEach(() => {
    context = createContextV3();
    context.envInfo = newEnvInfoV3();
    sandbox.stub(tools.tokenProvider.m365TokenProvider, "getAccessToken").resolves(ok("fakeToken"));
    sandbox.stub(tools.tokenProvider.m365TokenProvider, "getJsonObject").resolves(
      ok({
        unique_name: "fakename",
      })
    );

    const res: SingleSelectResult = {
      type: "success",
      result: autoPublishOption(),
    };
    sandbox.stub(context.userInteraction, "selectOption").resolves(ok(res));

    context.logProvider = new MockLogProvider();

    sandbox.stub(commonTools, "isV3Enabled").returns(true);
    sandbox
      .stub(Container, "get")
      .withArgs(sandbox.match("teamsApp/zipAppPackage"))
      .returns(new CreateAppPackageDriver());
    sandbox.stub(envUtil, "readEnv").resolves();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("deploy - filenotfound - v3", async function () {
    const inputs2 = _.cloneDeep(inputs);
    inputs2.projectPath = path.join(os.homedir(), "TeamsApps", appName);
    const deployAction = await component.deploy(context as ResourceContextV3, inputs2);
    chai.assert.isTrue(deployAction.isErr());
    if (deployAction.isErr()) {
      chai.assert.equal(deployAction.error.name, AppStudioError.FileNotFoundError.name);
    }
  });

  it("deploy - preview only", async function () {
    const manifest = new TeamsAppManifest();
    manifest.id = "";
    manifest.icons.color = "resources/color.png";
    manifest.icons.outline = "resources/outline.png";
    sandbox.stub(manifestUtils, "readAppManifest").resolves(ok(manifest));
    sandbox.stub(manifestUtils, "getManifest").resolves(ok(manifest));
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readJSON").resolves(manifest);
    sandbox.stub(fs, "readFile").resolves(new Buffer(JSON.stringify(manifest)));
    sandbox.stub(context.userInteraction, "showMessage").resolves(ok("Preview only"));
    sandbox.stub(AppStudioClient, "importApp").resolves(appDef);

    const deployAction = await component.deploy(context as ResourceContextV3, inputs);
    chai.assert.isTrue(deployAction.isErr());
  });
});
