// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import sinon from "sinon";
import fs, { PathLike } from "fs-extra";
import path from "path";
import * as uuid from "uuid";
import {
  v2,
  Platform,
  IStaticTab,
  IConfigurableTab,
  IBot,
  TeamsAppManifest,
  ok,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Container } from "typedi";
import { LocalCrypto } from "../../../../../src/core/crypto";
import {
  getAzureProjectRoot,
  getAzureProjectRootWithStaticTabs,
  MockUserInteraction,
} from "../helper";
import { MockedLogProvider, MockedTelemetryReporter } from "../../../solution/util";
import { AppStudioError } from "../../../../../src/plugins/resource/appstudio/errors";
import {
  STATIC_TABS_TPL_FOR_MULTI_ENV,
  TEAMS_APP_MANIFEST_TEMPLATE_V3,
} from "../../../../../src/plugins/resource/appstudio/constants";
import {
  AzureSolutionQuestionNames,
  BotScenario,
} from "../../../../../src/plugins/solution/fx-solution/question";
import { QuestionNames } from "../../../../../src/plugins/resource/bot/constants";
import { AppServiceOptionItem } from "../../../../../src/plugins/resource/bot/question";
import {
  readAppManifest,
  writeAppManifest,
} from "../../../../../src/component/resource/appManifest/utils";
import { ComponentNames } from "../../../../../src/component/constants";
import {
  AppManifest,
  deleteCapability,
  updateCapability,
} from "../../../../../src/component/resource/appManifest/appManifest";
import * as ManifestUtil from "../../../../../src/component/resource/appManifest/utils";
import { setTools } from "../../../../../src/core/globalVars";
import { MockTools } from "../../../../core/utils";

describe("Load and Save manifest template", () => {
  const sandbox = sinon.createSandbox();
  let plugin: AppManifest;
  let ctx: v2.Context;
  let inputs: v2.InputsWithProjectPath;
  setTools(new MockTools());
  beforeEach(async () => {
    plugin = Container.get<AppManifest>(ComponentNames.AppManifest);
    inputs = {
      platform: Platform.VSCode,
      projectPath: getAzureProjectRoot(),
    };
  });

  afterEach(async () => {
    sandbox.restore();
  });

  it("Load and Save manifest template file", async () => {
    const loadedManifestTemplate = await readAppManifest(inputs.projectPath);
    chai.assert.isTrue(loadedManifestTemplate.isOk());
    if (loadedManifestTemplate.isOk()) {
      const saveManifestResult = await writeAppManifest(
        loadedManifestTemplate.value,
        inputs.projectPath
      );
      chai.assert.isTrue(saveManifestResult.isOk());
    }
  });
});

describe("Add capability", () => {
  const sandbox = sinon.createSandbox();
  let plugin: AppManifest;
  let ctx: v2.Context;
  let inputs: v2.InputsWithProjectPath;
  let inputsWithStaticTabs: v2.InputsWithProjectPath;
  let manifest: TeamsAppManifest;

  beforeEach(async () => {
    plugin = Container.get<AppManifest>(ComponentNames.AppManifest);
    ctx = {
      cryptoProvider: new LocalCrypto(""),
      userInteraction: new MockUserInteraction(),
      logProvider: new MockedLogProvider(),
      telemetryReporter: new MockedTelemetryReporter(),
      projectSetting: {
        appName: "test",
        projectId: "",
        solutionSettings: {
          name: "",
          activeResourcePlugins: [plugin.name],
        },
      },
    };
    inputs = {
      platform: Platform.VSCode,
      projectPath: getAzureProjectRoot(),
    };
    inputsWithStaticTabs = {
      platform: Platform.VSCode,
      projectPath: getAzureProjectRootWithStaticTabs(),
    };
    manifest = JSON.parse(TEAMS_APP_MANIFEST_TEMPLATE_V3) as TeamsAppManifest;
    sandbox.stub(ManifestUtil, "readAppManifest").resolves(ok(manifest));
    sandbox.stub(ManifestUtil, "writeAppManifest").resolves(ok(undefined));
  });

  afterEach(async () => {
    sandbox.restore();
  });

  it("Check capability exceed limit: should return false", async () => {
    const result = await plugin.capabilityExceedLimit(inputs, "staticTab");
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      chai.assert.isFalse(result.value);
    }
  });

  it("Check capability exceed limit: should return true", async () => {
    manifest.configurableTabs?.push({ configurationUrl: "http://test.com", scopes: ["groupchat"] });
    const result = await plugin.capabilityExceedLimit(inputs, "configurableTab");
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      chai.assert.isTrue(result.value);
    }
  });

  it("Add static tab capability", async () => {
    const capabilities = [{ name: "staticTab" as const }];
    const addCapabilityResult = await plugin.addCapability(inputsWithStaticTabs, capabilities);
    chai.assert.isTrue(addCapabilityResult.isOk());

    // The index should not be modified after add capability
    chai.assert.equal(STATIC_TABS_TPL_FOR_MULTI_ENV[0].entityId, "index");
    chai.assert.equal(manifest.staticTabs!.length, 1);
    chai.assert.equal(manifest.staticTabs![0].entityId, "index0");
  });

  it("Add notification bot capability", async () => {
    const capabilities = [{ name: "Bot" as const }];
    inputs[AzureSolutionQuestionNames.Scenarios] = [BotScenario.NotificationBot];
    inputs[QuestionNames.BOT_HOST_TYPE_TRIGGER] = [AppServiceOptionItem.id];
    const addCapabilityResult = await plugin.addCapability(inputs, capabilities);
    chai.assert.isTrue(addCapabilityResult.isOk());
    chai.assert.equal(manifest.bots?.length, 1);
    chai.assert.isUndefined(manifest.bots?.[0].commandLists);
  });

  it("Add command and response bot capability", async () => {
    sandbox.stub(process, "env").value({
      BOT_NOTIFICATION_ENABLED: "true",
    });
    const capabilities = [{ name: "Bot" as const }];
    inputs[AzureSolutionQuestionNames.Scenarios] = [BotScenario.CommandAndResponseBot];
    const addCapabilityResult = await plugin.addCapability(inputs, capabilities);
    chai.assert.isTrue(addCapabilityResult.isOk());
    chai.assert.equal(manifest.bots?.length, 1);
    chai.assert.equal(manifest.bots?.[0].commandLists?.[0].commands?.[0].title, "helloWorld");
  });
});

describe("Update capability", () => {
  const sandbox = sinon.createSandbox();
  let ctx: v2.Context;
  let inputs: v2.InputsWithProjectPath;
  let inputsWithStaticTabs: v2.InputsWithProjectPath;

  beforeEach(async () => {
    ctx = {
      cryptoProvider: new LocalCrypto(""),
      userInteraction: new MockUserInteraction(),
      logProvider: new MockedLogProvider(),
      telemetryReporter: new MockedTelemetryReporter(),
      projectSetting: {
        appName: "test",
        projectId: "",
        solutionSettings: {
          name: "",
          activeResourcePlugins: [],
        },
      },
    };
    inputs = {
      platform: Platform.VSCode,
      projectPath: getAzureProjectRoot(),
    };
    inputsWithStaticTabs = {
      platform: Platform.VSCode,
      projectPath: getAzureProjectRootWithStaticTabs(),
    };

    sandbox.stub(fs, "writeFile").callsFake(async (filePath: number | PathLike, data: any) => {});
  });

  afterEach(async () => {
    sandbox.restore();
  });

  it("Update static tab should succeed", async () => {
    const tab: IStaticTab = {
      entityId: "index",
      scopes: ["personal", "team"],
    };
    const result = await updateCapability(inputsWithStaticTabs.projectPath, {
      name: "staticTab",
      snippet: tab,
    });
    chai.assert.isTrue(result.isOk());
  });

  it("Update static tab should failed with StaticTabNotExistError", async () => {
    const tab: IStaticTab = {
      entityId: "index2",
      scopes: ["personal", "team"],
    };
    const result = await updateCapability(inputs.projectPath, {
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
    const result = await updateCapability(inputs.projectPath, {
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
    const result = await updateCapability(inputsWithStaticTabs.projectPath, {
      name: "Bot",
      snippet: bot,
    });
    chai.assert.isTrue(result.isErr());
    if (result.isErr()) {
      chai.assert.equal(result.error.name, AppStudioError.CapabilityNotExistError.name);
    }
  });
});

describe("Delete capability", () => {
  const sandbox = sinon.createSandbox();
  let ctx: v2.Context;
  let inputs: v2.InputsWithProjectPath;
  let inputsWithStaticTabs: v2.InputsWithProjectPath;

  beforeEach(async () => {
    ctx = {
      cryptoProvider: new LocalCrypto(""),
      userInteraction: new MockUserInteraction(),
      logProvider: new MockedLogProvider(),
      telemetryReporter: new MockedTelemetryReporter(),
      projectSetting: {
        appName: "test",
        projectId: "",
        solutionSettings: {
          name: "",
          activeResourcePlugins: [],
        },
      },
    };
    inputs = {
      platform: Platform.VSCode,
      projectPath: getAzureProjectRoot(),
    };
    inputsWithStaticTabs = {
      platform: Platform.VSCode,
      projectPath: getAzureProjectRootWithStaticTabs(),
    };

    sandbox.stub(fs, "writeFile").callsFake(async (filePath: number | PathLike, data: any) => {});
  });

  afterEach(async () => {
    sandbox.restore();
  });

  it("Delete static tab should succeed", async () => {
    const tab: IStaticTab = {
      entityId: "index",
      scopes: ["personal", "team"],
    };
    const result = await deleteCapability(inputsWithStaticTabs.projectPath, {
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
    const result = await deleteCapability(inputsWithStaticTabs.projectPath, {
      name: "staticTab",
      snippet: tab,
    });
    chai.assert.isTrue(result.isErr());
    if (result.isErr()) {
      chai.assert.equal(result.error.name, AppStudioError.StaticTabNotExistError.name);
    }
  });

  it("Delete configurable tab should succeed", async () => {
    const result = await deleteCapability(inputs.projectPath, {
      name: "configurableTab",
    });
    chai.assert.isTrue(result.isOk());
  });

  it("Delete bot should failed", async () => {
    const result = await deleteCapability(inputsWithStaticTabs.projectPath, {
      name: "Bot",
    });
    chai.assert.isTrue(result.isErr());
    if (result.isErr()) {
      chai.assert.equal(result.error.name, AppStudioError.CapabilityNotExistError.name);
    }
  });

  it("Delete message extension should failed", async () => {
    const result = await deleteCapability(inputsWithStaticTabs.projectPath, {
      name: "MessageExtension",
    });
    chai.assert.isTrue(result.isErr());
    if (result.isErr()) {
      chai.assert.equal(result.error.name, AppStudioError.CapabilityNotExistError.name);
    }
  });
});
