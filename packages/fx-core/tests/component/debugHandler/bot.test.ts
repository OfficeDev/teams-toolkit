// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import * as path from "path";
import * as sinon from "sinon";

import {
  err,
  ok,
  ProjectSettings,
  ProjectSettingsV3,
  SystemError,
  UserError,
  v3,
} from "@microsoft/teamsfx-api";

import { ComponentNames } from "../../../src/component/constants";
import {
  DebugArgumentEmptyError,
  InvalidExistingBotArgsError,
} from "../../../src/component/debugHandler/error";
import {
  LocalEnvKeys,
  LocalEnvProvider,
  LocalEnvs,
} from "../../../src/component/debugHandler/localEnvProvider";
import { environmentManager } from "../../../src/core/environment";
import * as projectSettingsLoader from "../../../src/core/middleware/projectSettingsLoader";
import { AADRegistration } from "../../../src/component/resource/botService/aadRegistration";
import { AppStudio } from "../../../src/component/resource/botService/appStudio/appStudio";
import { BotAuthCredential } from "../../../src/component/resource/botService/botAuthCredential";
import { MockM365TokenProvider, runDebugActions } from "./utils";
import { BotDebugArgs, BotDebugHandler } from "../../../src/component/debugHandler";

describe("TabDebugHandler", () => {
  const projectPath = path.resolve(__dirname, "data");
  const tenantId = "11111111-1111-1111-1111-111111111111";
  const m365TokenProvider = new MockM365TokenProvider(tenantId);

  describe("setUp", () => {
    afterEach(() => {
      sinon.restore();
    });

    it("invalid args: empty botId", async () => {
      const args: BotDebugArgs = {
        botId: "",
        botPassword: "xxx",
      };
      const handler = new BotDebugHandler(projectPath, args, m365TokenProvider);
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof UserError);
        chai.assert.equal(result.error.message, DebugArgumentEmptyError("botId").message);
      }
    });

    it("invalid args: empty botPassword", async () => {
      const args: BotDebugArgs = {
        botId: "xxx",
        botPassword: "",
      };
      const handler = new BotDebugHandler(projectPath, args, m365TokenProvider);
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof UserError);
        chai.assert.equal(result.error.message, DebugArgumentEmptyError("botPassword").message);
      }
    });

    it("invalid args: missing botPassword for existing bot", async () => {
      const args: BotDebugArgs = {
        botId: "xxx",
      };
      const handler = new BotDebugHandler(projectPath, args, m365TokenProvider);
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof UserError);
        chai.assert.equal(result.error.message, InvalidExistingBotArgsError().message);
      }
    });

    it("load project settings failed", async () => {
      const error = new SystemError(
        "core",
        "LoadProjectSettingsByProjectPathFailed",
        "loadProjectSettingsByProjectPath failed."
      );
      sinon
        .stub(projectSettingsLoader, "loadProjectSettingsByProjectPath")
        .returns(Promise.resolve(err(error)));
      const args: BotDebugArgs = {
        botMessagingEndpoint: "https://af0e-180-158-57-208.ngrok.io/api/messages",
      };
      const handler = new BotDebugHandler(projectPath, args, m365TokenProvider);
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof SystemError);
        chai.assert.deepEqual(result.error.name, error.name);
      }
      sinon.restore();
    });

    it("load env info failed", async () => {
      const projectSetting: ProjectSettings = {
        appName: "unit-test",
        projectId: "11111111-1111-1111-1111-111111111111",
      };
      sinon
        .stub(projectSettingsLoader, "loadProjectSettingsByProjectPath")
        .returns(Promise.resolve(ok(projectSetting)));
      const error = new SystemError("core", "LoadEnvInfoFailed", "loadEnvInfo failed.");
      sinon.stub(environmentManager, "loadEnvInfo").returns(Promise.resolve(err(error)));
      const args: BotDebugArgs = {
        botMessagingEndpoint: "https://af0e-180-158-57-208.ngrok.io/api/messages",
      };
      const handler = new BotDebugHandler(projectPath, args, m365TokenProvider);
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof SystemError);
        chai.assert.deepEqual(result.error.name, error.name);
      }
      sinon.restore();
    });

    it("happy path", async () => {
      const projectSettingV3: ProjectSettingsV3 = {
        appName: "unit-test",
        projectId: "11111111-1111-1111-1111-111111111111",
        solutionSettings: {
          name: "fx-solution-azure",
          version: "1.0.0",
          hostType: "Azure",
          azureResources: [] as string[],
          capabilities: ["Bot"],
          activeResourcePlugins: ["fx-resource-bot", "fx-resource-appstudio"],
        },
        components: [{ name: "teams-bot", sso: false }],
      };
      sinon
        .stub(projectSettingsLoader, "loadProjectSettingsByProjectPath")
        .returns(Promise.resolve(ok(projectSettingV3)));
      const envInfoV3: v3.EnvInfoV3 = {
        envName: environmentManager.getLocalEnvName(),
        config: {},
        state: {
          solution: {},
        },
      };
      sinon.stub(environmentManager, "loadEnvInfo").returns(Promise.resolve(ok(envInfoV3)));
      const botAuthCredential: BotAuthCredential = {
        objectId: "11111111-1111-1111-1111-111111111111",
        clientId: "22222222-2222-2222-2222-222222222222",
        clientSecret: "xxx",
      };
      let called = false;
      sinon.stub(AADRegistration, "registerAADAppAndGetSecretByGraph").callsFake(async () => {
        called = true;
        return botAuthCredential;
      });
      sinon.stub(AppStudio, "getBotRegistration").callsFake(async () => {
        return undefined;
      });
      sinon.stub(AppStudio, "createBotRegistration").callsFake(async () => {});
      sinon.stub(AppStudio, "updateMessageEndpoint").callsFake(async () => {});
      sinon.stub(environmentManager, "writeEnvState").callsFake(async () => {
        return ok("");
      });
      let botEnvs: LocalEnvs = {
        template: {},
        teamsfx: {},
        customized: {},
      };
      sinon.stub(LocalEnvProvider.prototype, "loadBotLocalEnvs").returns(Promise.resolve(botEnvs));
      sinon.stub(LocalEnvProvider.prototype, "saveBotLocalEnvs").callsFake(async (envs) => {
        botEnvs = envs;
        return "";
      });
      const domain = "af0e-180-158-57-208.ngrok.io";
      const botEndpoint = `https://${domain}`;
      const args: BotDebugArgs = {
        botMessagingEndpoint: `${botEndpoint}/api/messages`,
      };
      const handler = new BotDebugHandler(projectPath, args, m365TokenProvider);
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isOk());
      chai.assert(called);
      chai.assert.equal(
        envInfoV3.state[ComponentNames.TeamsBot].objectId,
        botAuthCredential.objectId
      );
      chai.assert.equal(envInfoV3.state[ComponentNames.TeamsBot].botId, botAuthCredential.clientId);
      chai.assert.equal(
        envInfoV3.state[ComponentNames.TeamsBot].botPassword,
        botAuthCredential.clientSecret
      );
      chai.assert.equal(envInfoV3.state[ComponentNames.TeamsBot].siteEndpoint, botEndpoint);
      chai.assert.equal(envInfoV3.state[ComponentNames.TeamsBot].validDomain, domain);
      const expected: LocalEnvs = {
        template: {
          [LocalEnvKeys.bot.template.BotId]: botAuthCredential.clientId as string,
          [LocalEnvKeys.bot.template.BotPassword]: botAuthCredential.clientSecret as string,
        },
        teamsfx: {},
        customized: {},
      };
      chai.assert.deepEqual(botEnvs, expected);
      sinon.restore();
    });

    it("bot already registered", async () => {
      const projectSettingV3: ProjectSettingsV3 = {
        appName: "unit-test",
        projectId: "11111111-1111-1111-1111-111111111111",
        solutionSettings: {
          name: "fx-solution-azure",
          version: "1.0.0",
          hostType: "Azure",
          azureResources: [] as string[],
          capabilities: ["Bot"],
          activeResourcePlugins: ["fx-resource-bot", "fx-resource-appstudio"],
        },
        components: [{ name: "teams-bot", sso: false }],
      };
      sinon
        .stub(projectSettingsLoader, "loadProjectSettingsByProjectPath")
        .returns(Promise.resolve(ok(projectSettingV3)));
      const objectId = "11111111-1111-1111-1111-111111111111";
      const botId = "22222222-2222-2222-2222-222222222222";
      const botPassword = "xxx";
      const envInfoV3: v3.EnvInfoV3 = {
        envName: environmentManager.getLocalEnvName(),
        config: {},
        state: {
          solution: {},
          [ComponentNames.TeamsBot]: {
            objectId,
            botId,
            botPassword,
          },
        },
      };
      sinon.stub(environmentManager, "loadEnvInfo").returns(Promise.resolve(ok(envInfoV3)));
      let registerAADCalled = false;
      sinon.stub(AADRegistration, "registerAADAppAndGetSecretByGraph").callsFake(async () => {
        registerAADCalled = true;
        return {};
      });
      sinon.stub(AppStudio, "getBotRegistration").callsFake(async (_token, id) => {
        return id === botId ? ({} as any) : undefined;
      });
      let registerBotCalled = false;
      sinon.stub(AppStudio, "createBotRegistration").callsFake(async () => {
        registerBotCalled = true;
      });
      sinon.stub(AppStudio, "updateMessageEndpoint").callsFake(async () => {});
      sinon.stub(environmentManager, "writeEnvState").callsFake(async () => {
        return ok("");
      });
      let botEnvs: LocalEnvs = {
        template: {},
        teamsfx: {},
        customized: {},
      };
      sinon.stub(LocalEnvProvider.prototype, "loadBotLocalEnvs").returns(Promise.resolve(botEnvs));
      sinon.stub(LocalEnvProvider.prototype, "saveBotLocalEnvs").callsFake(async (envs) => {
        botEnvs = envs;
        return "";
      });
      const domain = "af0e-180-158-57-208.ngrok.io";
      const botEndpoint = `https://${domain}`;
      const args: BotDebugArgs = {
        botMessagingEndpoint: `${botEndpoint}/api/messages`,
      };
      const handler = new BotDebugHandler(projectPath, args, m365TokenProvider);
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isOk());
      chai.assert(!registerAADCalled);
      chai.assert(!registerBotCalled);
      chai.assert(envInfoV3.state[ComponentNames.TeamsBot].objectId, objectId);
      chai.assert.equal(envInfoV3.state[ComponentNames.TeamsBot].botId, botId);
      chai.assert.equal(envInfoV3.state[ComponentNames.TeamsBot].botPassword, botPassword);
      chai.assert.equal(envInfoV3.state[ComponentNames.TeamsBot].siteEndpoint, botEndpoint);
      chai.assert.equal(envInfoV3.state[ComponentNames.TeamsBot].validDomain, domain);
      const expected: LocalEnvs = {
        template: {
          [LocalEnvKeys.bot.template.BotId]: botId,
          [LocalEnvKeys.bot.template.BotPassword]: botPassword,
        },
        teamsfx: {},
        customized: {},
      };
      chai.assert.deepEqual(botEnvs, expected);
      sinon.restore();
    });

    it("using existing bot", async () => {
      const projectSettingV3: ProjectSettingsV3 = {
        appName: "unit-test",
        projectId: "11111111-1111-1111-1111-111111111111",
        solutionSettings: {
          name: "fx-solution-azure",
          version: "1.0.0",
          hostType: "Azure",
          azureResources: [] as string[],
          capabilities: ["Bot"],
          activeResourcePlugins: ["fx-resource-bot", "fx-resource-appstudio"],
        },
        components: [{ name: "teams-bot", sso: false }],
      };
      sinon
        .stub(projectSettingsLoader, "loadProjectSettingsByProjectPath")
        .returns(Promise.resolve(ok(projectSettingV3)));
      const envInfoV3: v3.EnvInfoV3 = {
        envName: environmentManager.getLocalEnvName(),
        config: {},
        state: {
          solution: {},
        },
      };
      sinon.stub(environmentManager, "loadEnvInfo").returns(Promise.resolve(ok(envInfoV3)));
      let called = false;
      sinon.stub(AADRegistration, "registerAADAppAndGetSecretByGraph").callsFake(async () => {
        called = true;
        return {};
      });
      sinon.stub(AppStudio, "getBotRegistration").callsFake(async () => {
        return undefined;
      });
      sinon.stub(AppStudio, "createBotRegistration").callsFake(async () => {});
      sinon.stub(AppStudio, "updateMessageEndpoint").callsFake(async () => {});
      sinon.stub(environmentManager, "writeEnvState").callsFake(async () => {
        return ok("");
      });
      let botEnvs: LocalEnvs = {
        template: {},
        teamsfx: {},
        customized: {},
      };
      sinon.stub(LocalEnvProvider.prototype, "loadBotLocalEnvs").returns(Promise.resolve(botEnvs));
      sinon.stub(LocalEnvProvider.prototype, "saveBotLocalEnvs").callsFake(async (envs) => {
        botEnvs = envs;
        return "";
      });
      const domain = "af0e-180-158-57-208.ngrok.io";
      const botEndpoint = `https://${domain}`;
      const args: BotDebugArgs = {
        botId: "11111111-1111-1111-1111-111111111111",
        botPassword: "xxx",
        botMessagingEndpoint: `${botEndpoint}/api/messages`,
      };
      const handler = new BotDebugHandler(projectPath, args, m365TokenProvider);
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isOk());
      chai.assert(!called);
      chai.assert(!envInfoV3.state[ComponentNames.TeamsBot].objectId);
      chai.assert.equal(envInfoV3.state[ComponentNames.TeamsBot].botId, args.botId);
      chai.assert.equal(envInfoV3.state[ComponentNames.TeamsBot].botPassword, args.botPassword);
      chai.assert.equal(envInfoV3.state[ComponentNames.TeamsBot].siteEndpoint, botEndpoint);
      chai.assert.equal(envInfoV3.state[ComponentNames.TeamsBot].validDomain, domain);
      const expected: LocalEnvs = {
        template: {
          [LocalEnvKeys.bot.template.BotId]: args.botId as string,
          [LocalEnvKeys.bot.template.BotPassword]: args.botPassword as string,
        },
        teamsfx: {},
        customized: {},
      };
      chai.assert.deepEqual(botEnvs, expected);
      sinon.restore();
    });
  });
});
