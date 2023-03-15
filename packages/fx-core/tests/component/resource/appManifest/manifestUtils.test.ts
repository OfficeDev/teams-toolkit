// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  IBot,
  IConfigurableTab,
  IStaticTab,
  ok,
  Platform,
  TeamsAppManifest,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import * as chai from "chai";
import "mocha";
import "reflect-metadata";
import sinon from "sinon";
import { Container } from "typedi";
import * as uuid from "uuid";
import { ComponentNames } from "../../../../src/component/constants";
import { AppManifest } from "../../../../src/component/resource/appManifest/appManifest";
import {
  BOTS_TPL_FOR_NOTIFICATION_V3,
  COMPOSE_EXTENSIONS_TPL_V3,
  CONFIGURABLE_TABS_TPL_V3,
  STATIC_TABS_TPL_V3,
  TEAMS_APP_MANIFEST_TEMPLATE,
} from "../../../../src/component/resource/appManifest/constants";
import { DefaultManifestProvider } from "../../../../src/component/resource/appManifest/manifestProvider";
import { manifestUtils } from "../../../../src/component/resource/appManifest/utils/ManifestUtils";
import { createContextV3 } from "../../../../src/component/utils";
import { setTools } from "../../../../src/core/globalVars";
import { CONFIGURABLE_TABS_TPL_EXISTING_APP } from "../../../../src/component/resource/appManifest/constants";
import { AppStudioError } from "../../../../src/component/resource/appManifest/errors";
import { QuestionNames } from "../../../../src/component/feature/bot/constants";
import { AppServiceOptionItem } from "../../../../src/component/feature/bot/question";
import { AzureSolutionQuestionNames, BotScenario } from "../../../../src/component/constants";
import { MockTools } from "../../../core/utils";
import { getAzureProjectRoot } from "../../../plugins/resource/appstudio/helper";
import fs from "fs-extra";
import { newEnvInfoV3 } from "../../../../src/core/environment";
import "../../../../src/component/resource/appManifest/appManifest";
import { FileNotFoundError, UnresolvedPlaceholderError } from "../../../../src/error/common";
import mockedEnv, { RestoreFn } from "mocked-env";
describe("Load and Save manifest template V3", () => {
  setTools(new MockTools());
  let mockedEnvRestore: RestoreFn;
  it("Load and Save manifest template file", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    const projectPath = getAzureProjectRoot();
    const loadedManifestTemplate = await manifestUtils.readAppManifest(projectPath);
    chai.assert.isTrue(loadedManifestTemplate.isOk());
    if (loadedManifestTemplate.isOk()) {
      const saveManifestResult = await manifestUtils.writeAppManifest(
        loadedManifestTemplate.value,
        projectPath
      );
      chai.assert.isTrue(saveManifestResult.isOk());
    }
    mockedEnvRestore();
  });
});
describe("Manifest provider", () => {
  setTools(new MockTools());
  const provider = new DefaultManifestProvider();
  const context = createContextV3();
  const inputs = {
    platform: Platform.VSCode,
    projectPath: ".",
  };
  const sandbox = sinon.createSandbox();
  let manifest: TeamsAppManifest;
  let mockedEnvRestore: RestoreFn;
  beforeEach(async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    manifest = JSON.parse(TEAMS_APP_MANIFEST_TEMPLATE) as TeamsAppManifest;
    sandbox.stub(manifestUtils, "readAppManifest").resolves(ok(manifest));
    sandbox.stub(manifestUtils, "writeAppManifest").resolves(ok(undefined));
  });
  afterEach(async () => {
    sandbox.restore();
    mockedEnvRestore();
  });
  it("addCapabilities", async () => {
    const capabilities = [{ name: "staticTab" as const }];
    const res = await provider.addCapabilities(context, inputs, capabilities);
    chai.assert.isTrue(res.isOk());
  });
  it("updateCapability", async () => {
    const tab: IStaticTab = {
      entityId: "index",
      scopes: ["personal", "team"],
    };
    manifest.staticTabs?.push(STATIC_TABS_TPL_V3[0]);
    const res = await provider.updateCapability(context, inputs, {
      name: "staticTab",
      snippet: tab,
    });
    chai.assert.isTrue(res.isOk());
  });
  it("deleteCapability", async () => {
    const tab: IStaticTab = {
      entityId: "index",
      scopes: ["personal", "team"],
    };
    manifest.staticTabs?.push(STATIC_TABS_TPL_V3[0]);
    const res = await provider.deleteCapability(context, inputs, {
      name: "staticTab",
      snippet: tab,
    });
    chai.assert.isTrue(res.isOk());
  });
  it("capabilityExceedLimit", async () => {
    const res = await provider.capabilityExceedLimit(context, inputs, "staticTab");
    chai.assert.isTrue(res.isOk());
  });
});
describe("Add capability V3", () => {
  const sandbox = sinon.createSandbox();
  let inputs: v2.InputsWithProjectPath;
  let manifest: TeamsAppManifest;
  const component = Container.get<AppManifest>(ComponentNames.AppManifest);
  let mockedEnvRestore: RestoreFn;
  beforeEach(async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    manifest = JSON.parse(TEAMS_APP_MANIFEST_TEMPLATE) as TeamsAppManifest;
    sandbox.stub(manifestUtils, "readAppManifest").resolves(ok(manifest));
    sandbox.stub(manifestUtils, "writeAppManifest").resolves(ok(undefined));
  });

  afterEach(async () => {
    sandbox.restore();
    mockedEnvRestore();
  });

  it("Check capability exceed limit: should return false", async () => {
    const result = await component.capabilityExceedLimit(inputs, "staticTab");
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      chai.assert.isFalse(result.value);
    }
  });

  it("Check capability exceed limit: should return true", async () => {
    manifest.configurableTabs?.push({ configurationUrl: "http://test.com", scopes: ["groupchat"] });
    const result = await component.capabilityExceedLimit(inputs, "configurableTab");
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      chai.assert.isTrue(result.value);
    }
  });

  it("Add static tab capability", async () => {
    const capabilities = [{ name: "staticTab" as const }];
    const addCapabilityResult = await component.addCapability(inputs, capabilities);
    chai.assert.isTrue(addCapabilityResult.isOk());

    // The index should not be modified after add capability
    chai.assert.equal(STATIC_TABS_TPL_V3[0].entityId, "index");
    chai.assert.equal(manifest.staticTabs!.length, 1);
    chai.assert.equal(manifest.staticTabs![0].entityId, "index0");
  });

  it("Add static tab capability with snippet", async () => {
    const capabilities: v3.ManifestCapability[] = [
      { name: "staticTab" as const, snippet: STATIC_TABS_TPL_V3[0] },
    ];
    const addCapabilityResult = await component.addCapability(inputs, capabilities);
    chai.assert.isTrue(addCapabilityResult.isOk());
    chai.assert.equal(manifest.staticTabs!.length, 1);
    chai.assert.equal(manifest.staticTabs![0].entityId, "index");
  });

  it("Add static tab capability with existing app", async () => {
    const capabilities: v3.ManifestCapability[] = [
      { name: "staticTab" as const, existingApp: true },
    ];
    const addCapabilityResult = await component.addCapability(inputs, capabilities);
    chai.assert.isTrue(addCapabilityResult.isOk());

    // The index should not be modified after add capability
    chai.assert.equal(STATIC_TABS_TPL_V3[0].entityId, "index");
    chai.assert.equal(manifest.staticTabs!.length, 1);
    chai.assert.equal(manifest.staticTabs![0].entityId, "index0");
  });

  it("Add configurable tab capability", async () => {
    const capabilities: v3.ManifestCapability[] = [{ name: "configurableTab" as const }];
    const addCapabilityResult = await component.addCapability(inputs, capabilities);
    chai.assert.isTrue(addCapabilityResult.isOk());
    chai.assert.equal(manifest.configurableTabs!.length, 1);
  });

  it("Add configurable tab capability with snippet", async () => {
    const capabilities: v3.ManifestCapability[] = [
      { name: "configurableTab" as const, snippet: CONFIGURABLE_TABS_TPL_V3[0] },
    ];
    const addCapabilityResult = await component.addCapability(inputs, capabilities);
    chai.assert.isTrue(addCapabilityResult.isOk());
    chai.assert.equal(manifest.configurableTabs!.length, 1);
  });

  it("Add configurable tab capability with existing app", async () => {
    const capabilities: v3.ManifestCapability[] = [
      { name: "configurableTab" as const, existingApp: true },
    ];
    const addCapabilityResult = await component.addCapability(inputs, capabilities);
    chai.assert.isTrue(addCapabilityResult.isOk());
    chai.assert.equal(manifest.configurableTabs!.length, 1);
    chai.assert.deepEqual(manifest.configurableTabs![0], CONFIGURABLE_TABS_TPL_EXISTING_APP[0]);
  });

  it("Add notification bot capability failed, exceed limit", async () => {
    const capabilities = [{ name: "Bot" as const }];
    inputs[AzureSolutionQuestionNames.Scenarios] = [BotScenario.NotificationBot];
    inputs[QuestionNames.BOT_HOST_TYPE_TRIGGER] = [AppServiceOptionItem.id];
    const addCapabilityResult = await component.addCapability(inputs, capabilities);
    chai.assert.isTrue(addCapabilityResult.isOk());
    chai.assert.equal(manifest.bots?.length, 1);
    chai.assert.isUndefined(manifest.bots?.[0].commandLists);

    const addCapabilityResult2 = await component.addCapability(inputs, capabilities);
    chai.assert.isTrue(addCapabilityResult2.isErr());
  });

  it("Add notification bot capability", async () => {
    const capabilities = [{ name: "Bot" as const }];
    inputs[AzureSolutionQuestionNames.Scenarios] = [BotScenario.NotificationBot];
    inputs[QuestionNames.BOT_HOST_TYPE_TRIGGER] = [AppServiceOptionItem.id];
    const addCapabilityResult = await component.addCapability(inputs, capabilities);
    chai.assert.isTrue(addCapabilityResult.isOk());
    chai.assert.equal(manifest.bots?.length, 1);
    chai.assert.isUndefined(manifest.bots?.[0].commandLists);
  });

  it("Add notification bot capability with snippet", async () => {
    const capabilities: v3.ManifestCapability[] = [
      { name: "Bot" as const, snippet: BOTS_TPL_FOR_NOTIFICATION_V3[0] },
    ];
    inputs[AzureSolutionQuestionNames.Scenarios] = [BotScenario.NotificationBot];
    inputs[QuestionNames.BOT_HOST_TYPE_TRIGGER] = [AppServiceOptionItem.id];
    const addCapabilityResult = await component.addCapability(inputs, capabilities);
    chai.assert.isTrue(addCapabilityResult.isOk());
    chai.assert.equal(manifest.bots?.length, 1);
    chai.assert.isUndefined(manifest.bots?.[0].commandLists);
  });

  it("Add command and response bot capability", async () => {
    sandbox.stub(process, "env").value({
      BOT_NOTIFICATION_ENABLED: "true",
      TEAMSFX_V3: "false",
    });
    const capabilities = [{ name: "Bot" as const }];
    inputs[AzureSolutionQuestionNames.Scenarios] = [BotScenario.CommandAndResponseBot];
    const addCapabilityResult = await component.addCapability(inputs, capabilities);
    chai.assert.isTrue(addCapabilityResult.isOk());
    chai.assert.equal(manifest.bots?.length, 1);
    chai.assert.equal(manifest.bots?.[0].commandLists?.[0].commands?.[0].title, "helloWorld");
  });

  it("Add workflow bot capability", async () => {
    sandbox.stub(process, "env").value({
      BOT_NOTIFICATION_ENABLED: "true",
      TEAMSFX_V3: "false",
    });
    const capabilities = [{ name: "Bot" as const }];
    inputs[AzureSolutionQuestionNames.Scenarios] = [BotScenario.WorkflowBot];
    const addCapabilityResult = await component.addCapability(inputs, capabilities);
    chai.assert.isTrue(addCapabilityResult.isOk());
    chai.assert.equal(manifest.bots?.length, 1);
    chai.assert.equal(manifest.bots?.[0].commandLists?.[0].commands?.[0].title, "helloWorld");
  });

  it("Add messaging extension success", async () => {
    const result = await component.addCapability(inputs, [{ name: "MessageExtension" }]);
    chai.assert.isTrue(result.isOk());
  });
  it("Add messaging extension with snippet success", async () => {
    const result = await component.addCapability(inputs, [
      { name: "MessageExtension", snippet: COMPOSE_EXTENSIONS_TPL_V3[0] },
    ]);
    chai.assert.isTrue(result.isOk());
  });

  it("getCapabilities", async () => {
    const res = await manifestUtils.getCapabilities(inputs.projectPath);
    chai.assert.isTrue(res.isOk());
  });

  it("preCheck", async () => {
    const component = Container.get(ComponentNames.AppManifest) as AppManifest;
    sandbox.stub(fs, "pathExists").resolves(true);
    const res = await component.preCheck(inputs.projectPath);
    chai.assert.isTrue(res.length > 0);
  });
});

describe("Update capability V3", () => {
  const sandbox = sinon.createSandbox();
  let inputs: v2.InputsWithProjectPath;
  let manifest: TeamsAppManifest;
  const component = Container.get(ComponentNames.AppManifest) as AppManifest;
  beforeEach(async () => {
    inputs = {
      platform: Platform.VSCode,
      projectPath: getAzureProjectRoot(),
    };
    manifest = JSON.parse(TEAMS_APP_MANIFEST_TEMPLATE) as TeamsAppManifest;
    manifest.staticTabs?.push(STATIC_TABS_TPL_V3[0]);
    manifest.configurableTabs?.push(CONFIGURABLE_TABS_TPL_V3[0]);
    sandbox.stub(manifestUtils, "readAppManifest").resolves(ok(manifest));
    sandbox.stub(manifestUtils, "writeAppManifest").resolves(ok(undefined));
  });

  afterEach(async () => {
    sandbox.restore();
  });

  it("Update static tab should succeed", async () => {
    const tab: IStaticTab = {
      entityId: "index",
      scopes: ["personal", "team"],
    };
    const result = await component.updateCapability(inputs, {
      name: "staticTab",
      snippet: tab,
    });
    chai.assert.isTrue(result.isOk());
    chai.assert.deepEqual(manifest.staticTabs![0].scopes, tab.scopes);
  });

  it("Update static tab should failed with StaticTabNotExistError", async () => {
    const tab: IStaticTab = {
      entityId: "index2",
      scopes: ["personal", "team"],
    };
    const result = await component.updateCapability(inputs, {
      name: "staticTab",
      snippet: tab,
    });
    chai.assert.isTrue(result.isErr());
    if (result.isErr()) {
      chai.assert.equal(result.error.name, AppStudioError.StaticTabNotExistError.name);
    }
  });

  it("Update configurable tab should succeed", async () => {
    const tab: IConfigurableTab = {
      configurationUrl: "endpoint",
      scopes: ["team", "groupchat"],
    };
    const result = await component.updateCapability(inputs, {
      name: "configurableTab",
      snippet: tab,
    });
    chai.assert.isTrue(result.isOk());
  });

  it("Update bot should failed", async () => {
    const bot: IBot = {
      botId: uuid.v4(),
      scopes: ["team", "groupchat"],
    };
    const result = await component.updateCapability(inputs, {
      name: "Bot",
      snippet: bot,
    });
    chai.assert.isTrue(result.isErr());
    if (result.isErr()) {
      chai.assert.equal(result.error.name, AppStudioError.CapabilityNotExistError.name);
    }
  });

  it("Update messaging extension success", async () => {
    manifest.composeExtensions?.push(COMPOSE_EXTENSIONS_TPL_V3[0]);
    const result = await component.updateCapability(inputs, {
      name: "MessageExtension",
      snippet: COMPOSE_EXTENSIONS_TPL_V3[0],
    });
    chai.assert.isTrue(result.isOk());
  });
});

describe("Delete capability", () => {
  const sandbox = sinon.createSandbox();
  let inputs: v2.InputsWithProjectPath;
  let manifest: TeamsAppManifest;
  const component = Container.get(ComponentNames.AppManifest) as AppManifest;
  beforeEach(async () => {
    inputs = {
      platform: Platform.VSCode,
      projectPath: getAzureProjectRoot(),
    };
    manifest = JSON.parse(TEAMS_APP_MANIFEST_TEMPLATE) as TeamsAppManifest;
    manifest.staticTabs?.push(STATIC_TABS_TPL_V3[0]);
    manifest.configurableTabs?.push(CONFIGURABLE_TABS_TPL_V3[0]);
    sandbox.stub(manifestUtils, "readAppManifest").resolves(ok(manifest));
    sandbox.stub(manifestUtils, "writeAppManifest").resolves(ok(undefined));
  });
  afterEach(async () => {
    sandbox.restore();
  });
  it("Delete static tab should succeed", async () => {
    const tab: IStaticTab = {
      entityId: "index",
      scopes: ["personal", "team"],
    };
    const result = await component.deleteCapability(inputs, {
      name: "staticTab",
      snippet: tab,
    });
    chai.assert.isTrue(result.isOk());
  });

  it("Delete static tab should failed with StaticTabNotExistError", async () => {
    const tab: IStaticTab = {
      entityId: "index2",
      scopes: ["personal", "team"],
    };
    const result = await component.deleteCapability(inputs, {
      name: "staticTab",
      snippet: tab,
    });
    chai.assert.isTrue(result.isErr());
    if (result.isErr()) {
      chai.assert.equal(result.error.name, AppStudioError.StaticTabNotExistError.name);
    }
  });

  it("Delete configurable tab should succeed", async () => {
    const result = await component.deleteCapability(inputs, {
      name: "configurableTab",
    });
    chai.assert.isTrue(result.isOk());
  });

  it("Delete configurable tab should failed", async () => {
    manifest.configurableTabs = [];
    const result = await component.deleteCapability(inputs, {
      name: "configurableTab",
    });
    chai.assert.isTrue(result.isErr());
    if (result.isErr()) {
      chai.assert.equal(result.error.name, AppStudioError.CapabilityNotExistError.name);
    }
  });

  it("Delete bot should failed", async () => {
    const result = await component.deleteCapability(inputs, {
      name: "Bot",
    });
    chai.assert.isTrue(result.isErr());
    if (result.isErr()) {
      chai.assert.equal(result.error.name, AppStudioError.CapabilityNotExistError.name);
    }
  });

  it("Delete message extension should failed", async () => {
    const result = await component.deleteCapability(inputs, {
      name: "MessageExtension",
    });
    chai.assert.isTrue(result.isErr());
    if (result.isErr()) {
      chai.assert.equal(result.error.name, AppStudioError.CapabilityNotExistError.name);
    }
  });
});

describe("getManifest V3", () => {
  const sandbox = sinon.createSandbox();
  let inputs: v2.InputsWithProjectPath;
  let manifest: TeamsAppManifest;
  const manifestTemplate = `{
      "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.14/MicrosoftTeams.schema.json",
      "manifestVersion": "1.14",
      "version": "1.0.0",
      "id": "{{state.fx-resource-appstudio.teamsAppId}}",
      "packageName": "com.microsoft.teams.extension",
      "developer": {
          "name": "Teams App, Inc.",
          "websiteUrl": "{{{state.fx-resource-frontend-hosting.endpoint}}}",
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
      "permissions": [
          "identity",
          "messageTeamMembers"
      ],
      "validDomains": [
          "{{state.fx-resource-frontend-hosting.domain}}"
      ],
      "webApplicationInfo": {
          "id": "{{state.fx-resource-aad-app-for-teams.clientId}}",
          "resource": "{{{state.fx-resource-aad-app-for-teams.applicationIdUris}}}"
      }
  }`;
  beforeEach(async () => {
    inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    manifest = JSON.parse(manifestTemplate) as TeamsAppManifest;
    sandbox.stub(manifestUtils, "readAppManifest").resolves(ok(manifest));
    sandbox.stub(manifestUtils, "writeAppManifest").resolves(ok(undefined));
  });

  afterEach(async () => {
    sandbox.restore();
  });
  it("getManifest", async () => {
    const envInfo = newEnvInfoV3();
    envInfo.envName = "local";
    const res1 = await manifestUtils.getManifest("", envInfo, false);
    envInfo.envName = "dev";
    const res2 = await manifestUtils.getManifest("", envInfo, false);
    chai.assert.isTrue(res1.isErr());
    chai.assert.isTrue(res2.isErr());
  });

  it("getManifest ignoring missing config", async () => {
    const envInfo = newEnvInfoV3();
    envInfo.state = {
      solution: {},
      "teams-bot": {
        botId: uuid.v4(),
      },
    };
    envInfo.envName = "local";
    const res1 = await manifestUtils.getManifest("", envInfo, true);
    chai.assert.isTrue(res1.isOk());
  });

  it("getManifestV3 unresolved placeholder Error", async () => {
    const envInfo = newEnvInfoV3();
    envInfo.envName = "dev";
    manifest.name.short = "${{MY_APP_NAME}}";
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(manifest));
    const res = await manifestUtils.getManifestV3("", envInfo, false);
    chai.assert.isTrue(res.isErr() && res.error instanceof UnresolvedPlaceholderError);
  });
});
