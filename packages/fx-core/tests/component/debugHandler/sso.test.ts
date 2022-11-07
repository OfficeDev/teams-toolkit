// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import fs from "fs-extra";
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
  Void,
} from "@microsoft/teamsfx-api";

import { getAllowedAppIds } from "../../../src/common/tools";
import { ComponentNames } from "../../../src/component/constants";
import {
  errorSource,
  DebugArgumentEmptyError,
  InvalidExistingAADArgsError,
} from "../../../src/component/debugHandler/error";
import {
  LocalEnvKeys,
  LocalEnvProvider,
  LocalEnvs,
} from "../../../src/component/debugHandler/localEnvProvider";
import { SSODebugArgs, SSODebugHandler } from "../../../src/component/debugHandler/sso";
import { environmentManager } from "../../../src/core/environment";
import * as projectSettingsLoader from "../../../src/core/middleware/projectSettingsLoader";
import { MockM365TokenProvider, runDebugActions } from "./utils";
import { AadAppManifestManager } from "../../../src/component/resource/aadApp/aadAppManifestManager";
import { AadAppClient } from "../../../src/component/resource/aadApp/aadAppClient";
import { TokenProvider } from "../../../src/component/resource/aadApp/utils/tokenProvider";
import { MockLogProvider, MockTelemetryReporter, MockUserInteraction } from "../../core/utils";
import * as utils from "../../../src/component/debugHandler/utils";

describe("SSODebugHandler", () => {
  const projectPath = path.resolve(__dirname, "data");
  const tenantId = "11111111-1111-1111-1111-111111111111";
  const m365TokenProvider = new MockM365TokenProvider(tenantId);
  const logger = new MockLogProvider();
  const telemetry = new MockTelemetryReporter();
  const ui = new MockUserInteraction();

  describe("setUp", () => {
    beforeEach(() => {
      sinon.stub(fs, "writeFile").callsFake(async () => {});
    });

    afterEach(() => {
      sinon.restore();
    });

    it("invalid args: empty clientId", async () => {
      const args: SSODebugArgs = {
        clientId: "",
        clientSecret: "xxx",
        objectId: "11111111-1111-1111-1111-111111111111",
      };
      const handler = new SSODebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof UserError);
        chai.assert.deepEqual(result.error.name, DebugArgumentEmptyError("clientId").name);
      }
    });

    it("invalid args: empty clientSecret", async () => {
      const args: SSODebugArgs = {
        clientId: "11111111-1111-1111-1111-111111111111",
        clientSecret: "",
        objectId: "11111111-1111-1111-1111-111111111111",
      };
      const handler = new SSODebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof UserError);
        chai.assert.deepEqual(result.error.name, DebugArgumentEmptyError("clientSecret").name);
      }
    });

    it("invalid args: empty objectId", async () => {
      const args: SSODebugArgs = {
        clientId: "11111111-1111-1111-1111-111111111111",
        clientSecret: "xxx",
        objectId: "",
      };
      const handler = new SSODebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof UserError);
        chai.assert.deepEqual(result.error.name, DebugArgumentEmptyError("objectId").name);
      }
    });

    it("invalid args: empty accessAsUserScopeId", async () => {
      const args: SSODebugArgs = {
        clientId: "11111111-1111-1111-1111-111111111111",
        clientSecret: "xxx",
        objectId: "11111111-1111-1111-1111-111111111111",
        accessAsUserScopeId: "",
      };
      const handler = new SSODebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof UserError);
        chai.assert.deepEqual(
          result.error.name,
          DebugArgumentEmptyError("accessAsUserScopeId").name
        );
      }
    });

    it("invalid args: missing objectId for existing AAD", async () => {
      const args: SSODebugArgs = {
        clientId: "11111111-1111-1111-1111-111111111111",
        clientSecret: "xxx",
      };
      const handler = new SSODebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof UserError);
        chai.assert.deepEqual(result.error.message, InvalidExistingAADArgsError().message);
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
      const args: SSODebugArgs = {
        objectId: "11111111-1111-1111-1111-111111111111",
        clientId: "22222222-2222-2222-2222-222222222222",
        clientSecret: "xxx",
      };
      const handler = new SSODebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
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
      const args: SSODebugArgs = {
        objectId: "11111111-1111-1111-1111-111111111111",
        clientId: "22222222-2222-2222-2222-222222222222",
        clientSecret: "xxx",
      };
      const handler = new SSODebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof SystemError);
        chai.assert.deepEqual(result.error.name, error.name);
      }
      sinon.restore();
    });

    it("exception", async () => {
      const projectSetting: ProjectSettings = {
        appName: "unit-test",
        projectId: "11111111-1111-1111-1111-111111111111",
      };
      sinon
        .stub(projectSettingsLoader, "loadProjectSettingsByProjectPath")
        .returns(Promise.resolve(ok(projectSetting)));
      const envInfoV3: v3.EnvInfoV3 = {
        envName: environmentManager.getLocalEnvName(),
        config: {},
        state: {
          solution: {},
        },
      };
      sinon.stub(environmentManager, "loadEnvInfo").returns(Promise.resolve(ok(envInfoV3)));
      const errorMessage = "exception";
      sinon.stub(TokenProvider, "init").throws(new Error(errorMessage));
      const args: SSODebugArgs = {};
      const handler = new SSODebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert.equal(result.error.source, errorSource);
        chai.assert.equal(result.error.message, errorMessage);
      }
      sinon.restore();
    });

    it("frontend", async () => {
      const projectSettingV3: ProjectSettingsV3 = {
        appName: "unit-test",
        projectId: "11111111-1111-1111-1111-111111111111",
        solutionSettings: {
          name: "fx-solution-azure",
          version: "1.0.0",
          hostType: "Azure",
          azureResources: [] as string[],
          capabilities: ["Tab", "TabSSO"],
          activeResourcePlugins: [
            "fx-resource-frontend-hosting",
            "fx-resource-appstudio",
            "fx-resource-aad-app-for-teams",
          ],
        },
        components: [
          { name: "teams-tab", sso: true },
          { name: "aad-app", provision: true },
        ],
      };
      sinon
        .stub(projectSettingsLoader, "loadProjectSettingsByProjectPath")
        .returns(Promise.resolve(ok(projectSettingV3)));
      const endpoint = "https://localhost:53000";
      const envInfoV3: v3.EnvInfoV3 = {
        envName: environmentManager.getLocalEnvName(),
        config: {},
        state: {
          solution: {},
          [ComponentNames.TeamsTab]: {
            endpoint,
          },
        },
      };
      sinon.stub(environmentManager, "loadEnvInfo").returns(Promise.resolve(ok(envInfoV3)));
      const manifest = {};
      sinon
        .stub(AadAppManifestManager, "loadAadManifest")
        .returns(Promise.resolve(manifest as any));
      const objectId = "11111111-1111-1111-1111-111111111111";
      const clientId = "22222222-2222-2222-2222-222222222222";
      sinon
        .stub(AadAppClient, "createAadAppUsingManifest")
        .callsFake(async (stage, manifest, config) => {
          config.objectId = objectId;
          config.clientId = clientId;
        });
      const clientSecret = "xxx";
      sinon.stub(AadAppClient, "createAadAppSecret").callsFake(async (stage, config) => {
        config.password = clientSecret;
      });
      sinon.stub(AadAppClient, "updateAadAppUsingManifest").callsFake(async () => {});
      sinon.stub(environmentManager, "writeEnvState").callsFake(async () => {
        return ok("");
      });
      sinon.stub(AadAppManifestManager, "writeManifestFileToBuildFolder").callsFake(async () => {});
      let frontendEnvs: LocalEnvs = {
        template: {},
        teamsfx: {},
        customized: {},
      };
      sinon
        .stub(LocalEnvProvider.prototype, "loadFrontendLocalEnvs")
        .returns(Promise.resolve(frontendEnvs));
      sinon.stub(LocalEnvProvider.prototype, "saveFrontendLocalEnvs").callsFake(async (envs) => {
        frontendEnvs = envs;
        return "";
      });
      const args: SSODebugArgs = {};
      const handler = new SSODebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isOk());
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].objectId, objectId);
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].clientId, clientId);
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].clientSecret, clientSecret);
      chai.assert(envInfoV3.state[ComponentNames.AadApp].oauth2PermissionScopeId !== undefined);
      chai.assert.equal(
        envInfoV3.state[ComponentNames.AadApp].applicationIdUris,
        `api://localhost:53000/${clientId}`
      );
      chai.assert.equal(
        envInfoV3.state[ComponentNames.AadApp].frontendEndpoint,
        "https://localhost"
      );
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].tenantId, tenantId);
      chai.assert.equal(
        envInfoV3.state[ComponentNames.AadApp].oauthHost,
        "https://login.microsoftonline.com"
      );
      chai.assert.equal(
        envInfoV3.state[ComponentNames.AadApp].oauthAuthority,
        `https://login.microsoftonline.com/${tenantId}`
      );
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].botId, undefined);
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].botEndpoint, undefined);
      const expectedEnvs: LocalEnvs = {
        template: {},
        teamsfx: {
          [LocalEnvKeys.frontend.teamsfx.ClientId]: clientId,
          [LocalEnvKeys.frontend.teamsfx.LoginUrl]: `${endpoint}/auth-start.html`,
        },
        customized: {},
      };
      chai.assert.deepEqual(frontendEnvs, expectedEnvs);
      sinon.restore();
    });

    it("bot", async () => {
      const projectSettingV3: ProjectSettingsV3 = {
        appName: "unit-test",
        projectId: "11111111-1111-1111-1111-111111111111",
        solutionSettings: {
          name: "fx-solution-azure",
          version: "1.0.0",
          hostType: "Azure",
          azureResources: [] as string[],
          capabilities: ["Bot", "BotSSO"],
          activeResourcePlugins: [
            "fx-resource-bot",
            "fx-resource-appstudio",
            "fx-resource-aad-app-for-teams",
          ],
        },
        components: [
          { name: "teams-bot", sso: true },
          { name: "aad-app", provision: true },
        ],
      };
      sinon
        .stub(projectSettingsLoader, "loadProjectSettingsByProjectPath")
        .returns(Promise.resolve(ok(projectSettingV3)));
      const botId = "11111111-1111-1111-1111-111111111111";
      const botEndpoint = "https://xxx.ngrok.io";
      const envInfoV3: v3.EnvInfoV3 = {
        envName: environmentManager.getLocalEnvName(),
        config: {},
        state: {
          solution: {},
          [ComponentNames.TeamsBot]: {
            botId,
            siteEndpoint: botEndpoint,
          },
        },
      };
      sinon.stub(environmentManager, "loadEnvInfo").returns(Promise.resolve(ok(envInfoV3)));
      const manifest = {};
      sinon
        .stub(AadAppManifestManager, "loadAadManifest")
        .returns(Promise.resolve(manifest as any));
      const objectId = "11111111-1111-1111-1111-111111111111";
      const clientId = "22222222-2222-2222-2222-222222222222";
      sinon
        .stub(AadAppClient, "createAadAppUsingManifest")
        .callsFake(async (stage, manifest, config) => {
          config.objectId = objectId;
          config.clientId = clientId;
        });
      const clientSecret = "xxx";
      sinon.stub(AadAppClient, "createAadAppSecret").callsFake(async (stage, config) => {
        config.password = clientSecret;
      });
      sinon.stub(AadAppClient, "updateAadAppUsingManifest").callsFake(async () => {});
      sinon.stub(environmentManager, "writeEnvState").callsFake(async () => {
        return ok("");
      });
      sinon.stub(AadAppManifestManager, "writeManifestFileToBuildFolder").callsFake(async () => {});
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
      const args: SSODebugArgs = {};
      const handler = new SSODebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isOk());
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].objectId, objectId);
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].clientId, clientId);
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].clientSecret, clientSecret);
      chai.assert(envInfoV3.state[ComponentNames.AadApp].oauth2PermissionScopeId !== undefined);
      chai.assert.equal(
        envInfoV3.state[ComponentNames.AadApp].applicationIdUris,
        `api://botid-${botId}`
      );
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].frontendEndpoint, undefined);
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].tenantId, tenantId);
      chai.assert.equal(
        envInfoV3.state[ComponentNames.AadApp].oauthHost,
        "https://login.microsoftonline.com"
      );
      chai.assert.equal(
        envInfoV3.state[ComponentNames.AadApp].oauthAuthority,
        `https://login.microsoftonline.com/${tenantId}`
      );
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].botId, botId);
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].botEndpoint, botEndpoint);
      const expectedEnvs: LocalEnvs = {
        template: {},
        teamsfx: {
          [LocalEnvKeys.bot.teamsfx.ClientId]: clientId,
          [LocalEnvKeys.bot.teamsfx.ClientSecret]: clientSecret,
          [LocalEnvKeys.bot.teamsfx.AuthorityHost]: "https://login.microsoftonline.com",
          [LocalEnvKeys.bot.teamsfx.TenantId]: tenantId,
          [LocalEnvKeys.bot.teamsfx.ApplicationIdUri]: `api://botid-${botId}`,
          [LocalEnvKeys.bot.teamsfx.LoginEndpoint]: `${botEndpoint}/auth-start.html`,
        },
        customized: {},
      };
      chai.assert.deepEqual(botEnvs, expectedEnvs);
      sinon.restore();
    });

    it("tab + bot", async () => {
      const projectSettingV3: ProjectSettingsV3 = {
        appName: "unit-test",
        projectId: "11111111-1111-1111-1111-111111111111",
        solutionSettings: {
          name: "fx-solution-azure",
          version: "1.0.0",
          hostType: "Azure",
          azureResources: [] as string[],
          capabilities: ["Tab", "TabSSO", "Bot", "BotSSO"],
          activeResourcePlugins: [
            "fx-resource-frontend-hosting",
            "fx-resource-bot",
            "fx-resource-appstudio",
            "fx-resource-aad-app-for-teams",
          ],
        },
        components: [
          { name: "teams-tab", sso: true },
          { name: "teams-bot", sso: true },
          { name: "aad-app", provision: true },
        ],
      };
      sinon
        .stub(projectSettingsLoader, "loadProjectSettingsByProjectPath")
        .returns(Promise.resolve(ok(projectSettingV3)));
      const botId = "11111111-1111-1111-1111-111111111111";
      const botEndpoint = "https://xxx.ngrok.io";
      const tabEndpoint = "https://localhost:53000";
      const envInfoV3: v3.EnvInfoV3 = {
        envName: environmentManager.getLocalEnvName(),
        config: {},
        state: {
          solution: {},
          [ComponentNames.TeamsTab]: {
            endpoint: tabEndpoint,
          },
          [ComponentNames.TeamsBot]: {
            botId,
            siteEndpoint: botEndpoint,
          },
        },
      };
      sinon.stub(environmentManager, "loadEnvInfo").returns(Promise.resolve(ok(envInfoV3)));
      const manifest = {};
      sinon
        .stub(AadAppManifestManager, "loadAadManifest")
        .returns(Promise.resolve(manifest as any));
      const objectId = "11111111-1111-1111-1111-111111111111";
      const clientId = "22222222-2222-2222-2222-222222222222";
      sinon
        .stub(AadAppClient, "createAadAppUsingManifest")
        .callsFake(async (stage, manifest, config) => {
          config.objectId = objectId;
          config.clientId = clientId;
        });
      const clientSecret = "xxx";
      sinon.stub(AadAppClient, "createAadAppSecret").callsFake(async (stage, config) => {
        config.password = clientSecret;
      });
      sinon.stub(AadAppClient, "updateAadAppUsingManifest").callsFake(async () => {});
      sinon.stub(environmentManager, "writeEnvState").callsFake(async () => {
        return ok("");
      });
      sinon.stub(AadAppManifestManager, "writeManifestFileToBuildFolder").callsFake(async () => {});
      let frontendEnvs: LocalEnvs = {
        template: {},
        teamsfx: {},
        customized: {},
      };
      sinon
        .stub(LocalEnvProvider.prototype, "loadFrontendLocalEnvs")
        .returns(Promise.resolve(frontendEnvs));
      sinon.stub(LocalEnvProvider.prototype, "saveFrontendLocalEnvs").callsFake(async (envs) => {
        frontendEnvs = envs;
        return "";
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
      const args: SSODebugArgs = {};
      const handler = new SSODebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isOk());
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].objectId, objectId);
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].clientId, clientId);
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].clientSecret, clientSecret);
      chai.assert(envInfoV3.state[ComponentNames.AadApp].oauth2PermissionScopeId !== undefined);
      chai.assert.equal(
        envInfoV3.state[ComponentNames.AadApp].applicationIdUris,
        `api://localhost:53000/botid-${botId}`
      );
      chai.assert.equal(
        envInfoV3.state[ComponentNames.AadApp].frontendEndpoint,
        "https://localhost"
      );
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].tenantId, tenantId);
      chai.assert.equal(
        envInfoV3.state[ComponentNames.AadApp].oauthHost,
        "https://login.microsoftonline.com"
      );
      chai.assert.equal(
        envInfoV3.state[ComponentNames.AadApp].oauthAuthority,
        `https://login.microsoftonline.com/${tenantId}`
      );
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].botId, botId);
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].botEndpoint, botEndpoint);
      const expectedFrontendEnvs: LocalEnvs = {
        template: {},
        teamsfx: {
          [LocalEnvKeys.frontend.teamsfx.ClientId]: clientId,
          [LocalEnvKeys.frontend.teamsfx.LoginUrl]: `${tabEndpoint}/auth-start.html`,
        },
        customized: {},
      };
      const expectedBotEnvs: LocalEnvs = {
        template: {},
        teamsfx: {
          [LocalEnvKeys.bot.teamsfx.ClientId]: clientId,
          [LocalEnvKeys.bot.teamsfx.ClientSecret]: clientSecret,
          [LocalEnvKeys.bot.teamsfx.AuthorityHost]: "https://login.microsoftonline.com",
          [LocalEnvKeys.bot.teamsfx.TenantId]: tenantId,
          [LocalEnvKeys.bot.teamsfx.ApplicationIdUri]: `api://localhost:53000/botid-${botId}`,
          [LocalEnvKeys.bot.teamsfx.LoginEndpoint]: `${botEndpoint}/auth-start.html`,
        },
        customized: {},
      };
      chai.assert.deepEqual(frontendEnvs, expectedFrontendEnvs);
      chai.assert.deepEqual(botEnvs, expectedBotEnvs);
      sinon.restore();
    });

    it("tab + bot + backend", async () => {
      const projectSettingV3: ProjectSettingsV3 = {
        appName: "unit-test",
        projectId: "11111111-1111-1111-1111-111111111111",
        solutionSettings: {
          name: "fx-solution-azure",
          version: "1.0.0",
          hostType: "Azure",
          azureResources: ["function"],
          capabilities: ["Tab", "TabSSO", "Bot", "BotSSO"],
          activeResourcePlugins: [
            "fx-resource-frontend-hosting",
            "fx-resource-bot",
            "fx-resource-appstudio",
            "fx-resource-aad-app-for-teams",
            "fx-resource-function",
          ],
        },
        defaultFunctionName: "getUserProfile",
        components: [
          { name: "teams-tab", sso: true },
          { name: "teams-bot", sso: true },
          { name: "aad-app", provision: true },
          { name: "teams-api" },
        ],
      };
      sinon
        .stub(projectSettingsLoader, "loadProjectSettingsByProjectPath")
        .returns(Promise.resolve(ok(projectSettingV3)));
      const botId = "11111111-1111-1111-1111-111111111111";
      const botEndpoint = "https://xxx.ngrok.io";
      const tabEndpoint = "https://localhost:53000";
      const envInfoV3: v3.EnvInfoV3 = {
        envName: environmentManager.getLocalEnvName(),
        config: {},
        state: {
          solution: {},
          [ComponentNames.TeamsTab]: {
            endpoint: tabEndpoint,
          },
          [ComponentNames.TeamsBot]: {
            botId,
            siteEndpoint: botEndpoint,
          },
        },
      };
      sinon.stub(environmentManager, "loadEnvInfo").returns(Promise.resolve(ok(envInfoV3)));
      const manifest = {};
      sinon
        .stub(AadAppManifestManager, "loadAadManifest")
        .returns(Promise.resolve(manifest as any));
      const objectId = "11111111-1111-1111-1111-111111111111";
      const clientId = "22222222-2222-2222-2222-222222222222";
      sinon
        .stub(AadAppClient, "createAadAppUsingManifest")
        .callsFake(async (stage, manifest, config) => {
          config.objectId = objectId;
          config.clientId = clientId;
        });
      const clientSecret = "xxx";
      sinon.stub(AadAppClient, "createAadAppSecret").callsFake(async (stage, config) => {
        config.password = clientSecret;
      });
      sinon.stub(AadAppClient, "updateAadAppUsingManifest").callsFake(async () => {});
      sinon.stub(environmentManager, "writeEnvState").callsFake(async () => {
        return ok("");
      });
      sinon.stub(AadAppManifestManager, "writeManifestFileToBuildFolder").callsFake(async () => {});
      let frontendEnvs: LocalEnvs = {
        template: {},
        teamsfx: {},
        customized: {},
      };
      sinon
        .stub(LocalEnvProvider.prototype, "loadFrontendLocalEnvs")
        .returns(Promise.resolve(frontendEnvs));
      sinon.stub(LocalEnvProvider.prototype, "saveFrontendLocalEnvs").callsFake(async (envs) => {
        frontendEnvs = envs;
        return "";
      });
      let backendEnvs: LocalEnvs = {
        template: {},
        teamsfx: {},
        customized: {},
      };
      sinon
        .stub(LocalEnvProvider.prototype, "loadBackendLocalEnvs")
        .returns(Promise.resolve(backendEnvs));
      sinon.stub(LocalEnvProvider.prototype, "saveBackendLocalEnvs").callsFake(async (envs) => {
        backendEnvs = envs;
        return "";
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
      const args: SSODebugArgs = {};
      const handler = new SSODebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isOk());
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].objectId, objectId);
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].clientId, clientId);
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].clientSecret, clientSecret);
      chai.assert(envInfoV3.state[ComponentNames.AadApp].oauth2PermissionScopeId !== undefined);
      chai.assert.equal(
        envInfoV3.state[ComponentNames.AadApp].applicationIdUris,
        `api://localhost:53000/botid-${botId}`
      );
      chai.assert.equal(
        envInfoV3.state[ComponentNames.AadApp].frontendEndpoint,
        "https://localhost"
      );
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].tenantId, tenantId);
      chai.assert.equal(
        envInfoV3.state[ComponentNames.AadApp].oauthHost,
        "https://login.microsoftonline.com"
      );
      chai.assert.equal(
        envInfoV3.state[ComponentNames.AadApp].oauthAuthority,
        `https://login.microsoftonline.com/${tenantId}`
      );
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].botId, botId);
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].botEndpoint, botEndpoint);
      const expectedFrontendEnvs: LocalEnvs = {
        template: {},
        teamsfx: {
          [LocalEnvKeys.frontend.teamsfx.ClientId]: clientId,
          [LocalEnvKeys.frontend.teamsfx.LoginUrl]: `${tabEndpoint}/auth-start.html`,
          [LocalEnvKeys.frontend.teamsfx.FuncName]: projectSettingV3.defaultFunctionName!,
          [LocalEnvKeys.frontend.teamsfx.FuncEndpoint]: "http://localhost:7071",
        },
        customized: {},
      };
      const expectedBackendEnvs: LocalEnvs = {
        template: {},
        teamsfx: {
          [LocalEnvKeys.backend.teamsfx.ClientId]: clientId,
          [LocalEnvKeys.backend.teamsfx.ClientSecret]: clientSecret,
          [LocalEnvKeys.backend.teamsfx.TenantId]: tenantId,
          [LocalEnvKeys.backend.teamsfx.AuthorityHost]: "https://login.microsoftonline.com",
          [LocalEnvKeys.backend.teamsfx.AllowedAppIds]: getAllowedAppIds().join(";"),
        },
        customized: {},
      };
      const expectedBotEnvs: LocalEnvs = {
        template: {},
        teamsfx: {
          [LocalEnvKeys.bot.teamsfx.ClientId]: clientId,
          [LocalEnvKeys.bot.teamsfx.ClientSecret]: clientSecret,
          [LocalEnvKeys.bot.teamsfx.AuthorityHost]: "https://login.microsoftonline.com",
          [LocalEnvKeys.bot.teamsfx.TenantId]: tenantId,
          [LocalEnvKeys.bot.teamsfx.ApplicationIdUri]: `api://localhost:53000/botid-${botId}`,
          [LocalEnvKeys.bot.teamsfx.LoginEndpoint]: `${botEndpoint}/auth-start.html`,
          [LocalEnvKeys.bot.teamsfx.ApiEndpoint]: "http://localhost:7071",
        },
        customized: {},
      };
      chai.assert.deepEqual(frontendEnvs, expectedFrontendEnvs);
      chai.assert.deepEqual(backendEnvs, expectedBackendEnvs);
      chai.assert.deepEqual(botEnvs, expectedBotEnvs);
      sinon.restore();
    });

    it("frontend check m365 tenant happy path", async () => {
      const projectSettingV3: ProjectSettingsV3 = {
        appName: "unit-test",
        projectId: "11111111-1111-1111-1111-111111111111",
        solutionSettings: {
          name: "fx-solution-azure",
          version: "1.0.0",
          hostType: "Azure",
          azureResources: [] as string[],
          capabilities: ["Tab", "TabSSO"],
          activeResourcePlugins: [
            "fx-resource-frontend-hosting",
            "fx-resource-appstudio",
            "fx-resource-aad-app-for-teams",
          ],
        },
        components: [
          { name: "teams-tab", sso: true },
          { name: "aad-app", provision: true },
        ],
      };
      sinon
        .stub(projectSettingsLoader, "loadProjectSettingsByProjectPath")
        .returns(Promise.resolve(ok(projectSettingV3)));
      const endpoint = "https://localhost:53000";
      const envInfoV3: v3.EnvInfoV3 = {
        envName: environmentManager.getLocalEnvName(),
        config: {},
        state: {
          solution: {},
          [ComponentNames.TeamsTab]: {
            endpoint,
          },
          [ComponentNames.AadApp]: {},
          [ComponentNames.AppManifest]: {
            tenantId: "22222222-2222-2222-2222-222222222222",
          },
        },
      };
      sinon.stub(environmentManager, "loadEnvInfo").returns(Promise.resolve(ok(envInfoV3)));
      let checkM365TenantCalled = false;
      sinon.stub(utils, "checkM365Tenant").callsFake(async () => {
        checkM365TenantCalled = true;
        return ok(Void);
      });
      const manifest = {};
      sinon
        .stub(AadAppManifestManager, "loadAadManifest")
        .returns(Promise.resolve(manifest as any));
      const objectId = "11111111-1111-1111-1111-111111111111";
      const clientId = "22222222-2222-2222-2222-222222222222";
      sinon
        .stub(AadAppClient, "createAadAppUsingManifest")
        .callsFake(async (stage, manifest, config) => {
          config.objectId = objectId;
          config.clientId = clientId;
        });
      const clientSecret = "xxx";
      sinon.stub(AadAppClient, "createAadAppSecret").callsFake(async (stage, config) => {
        config.password = clientSecret;
      });
      sinon.stub(AadAppClient, "updateAadAppUsingManifest").callsFake(async () => {});
      sinon.stub(environmentManager, "writeEnvState").callsFake(async () => {
        return ok("");
      });
      sinon.stub(AadAppManifestManager, "writeManifestFileToBuildFolder").callsFake(async () => {});
      let frontendEnvs: LocalEnvs = {
        template: {},
        teamsfx: {},
        customized: {},
      };
      sinon
        .stub(LocalEnvProvider.prototype, "loadFrontendLocalEnvs")
        .returns(Promise.resolve(frontendEnvs));
      sinon.stub(LocalEnvProvider.prototype, "saveFrontendLocalEnvs").callsFake(async (envs) => {
        frontendEnvs = envs;
        return "";
      });
      const args: SSODebugArgs = {};
      const handler = new SSODebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isOk());
      chai.assert(checkM365TenantCalled);
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].objectId, objectId);
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].clientId, clientId);
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].clientSecret, clientSecret);
      chai.assert(envInfoV3.state[ComponentNames.AadApp].oauth2PermissionScopeId !== undefined);
      chai.assert.equal(
        envInfoV3.state[ComponentNames.AadApp].applicationIdUris,
        `api://localhost:53000/${clientId}`
      );
      chai.assert.equal(
        envInfoV3.state[ComponentNames.AadApp].frontendEndpoint,
        "https://localhost"
      );
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].tenantId, tenantId);
      chai.assert.equal(
        envInfoV3.state[ComponentNames.AadApp].oauthHost,
        "https://login.microsoftonline.com"
      );
      chai.assert.equal(
        envInfoV3.state[ComponentNames.AadApp].oauthAuthority,
        `https://login.microsoftonline.com/${tenantId}`
      );
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].botId, undefined);
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].botEndpoint, undefined);
      const expectedEnvs: LocalEnvs = {
        template: {},
        teamsfx: {
          [LocalEnvKeys.frontend.teamsfx.ClientId]: clientId,
          [LocalEnvKeys.frontend.teamsfx.LoginUrl]: `${endpoint}/auth-start.html`,
        },
        customized: {},
      };
      chai.assert.deepEqual(frontendEnvs, expectedEnvs);
      sinon.restore();
    });

    it("check m365 tenant failed", async () => {
      const projectSetting: ProjectSettings = {
        appName: "unit-test",
        projectId: "11111111-1111-1111-1111-111111111111",
      };
      sinon
        .stub(projectSettingsLoader, "loadProjectSettingsByProjectPath")
        .returns(Promise.resolve(ok(projectSetting)));
      const envInfoV3: v3.EnvInfoV3 = {
        envName: environmentManager.getLocalEnvName(),
        config: {},
        state: {
          solution: {},
          [ComponentNames.AadApp]: {},
          [ComponentNames.AppManifest]: {
            tenantId: "22222222-2222-2222-2222-222222222222",
          },
        },
      };
      sinon.stub(environmentManager, "loadEnvInfo").returns(Promise.resolve(ok(envInfoV3)));
      let called = false;
      const error = new SystemError("solution", "checkM365TenantFailed", "checkM365Tenant failed");
      sinon.stub(utils, "checkM365Tenant").callsFake(async () => {
        called = true;
        return err(error);
      });
      const args: SSODebugArgs = {
        objectId: "11111111-1111-1111-1111-111111111111",
        clientId: "22222222-2222-2222-2222-222222222222",
        clientSecret: "xxx",
      };
      const handler = new SSODebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
      chai.assert(called);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof SystemError);
        chai.assert.deepEqual(result.error.name, error.name);
      }
      sinon.restore();
    });
  });
});
