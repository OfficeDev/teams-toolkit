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
import { errorSource, InvalidSSODebugArgsError } from "../../../src/component/debugHandler/error";
import {
  LocalEnvKeys,
  LocalEnvProvider,
  LocalEnvs,
} from "../../../src/component/debugHandler/localEnvProvider";
import { SSODebugArgs, SSODebugHandler } from "../../../src/component/debugHandler/sso";
import { environmentManager } from "../../../src/core/environment";
import * as projectSettingsLoader from "../../../src/core/middleware/projectSettingsLoader";
import { AadAppClient } from "../../../src/plugins/resource/aad/aadAppClient";
import { AadAppManifestManager } from "../../../src/plugins/resource/aad/aadAppManifestManager";
import { TokenProvider } from "../../../src/plugins/resource/aad/utils/tokenProvider";
import { MockM365TokenProvider } from "./utils";

describe("SSODebugHandler", () => {
  const projectPath = path.resolve(__dirname, "data");
  const tenantId = "11111111-1111-1111-1111-111111111111";
  const m365TokenProvider = new MockM365TokenProvider(tenantId);

  describe("setUp", () => {
    afterEach(() => {
      sinon.restore();
    });

    it("invalid args", async () => {
      const args: SSODebugArgs = {
        clientId: "11111111-1111-1111-1111-111111111111",
        clientSecret: "xxx",
      };
      const handler = new SSODebugHandler(projectPath, args, m365TokenProvider);
      const result = await handler.setUp();
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof UserError);
        chai.assert.deepEqual(result.error.name, InvalidSSODebugArgsError().name);
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
      const handler = new SSODebugHandler(projectPath, args, m365TokenProvider);
      const result = await handler.setUp();
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
      const handler = new SSODebugHandler(projectPath, args, m365TokenProvider);
      const result = await handler.setUp();
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
      const handler = new SSODebugHandler(projectPath, args, m365TokenProvider);
      const result = await handler.setUp();
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
      });
      const args: SSODebugArgs = {};
      const handler = new SSODebugHandler(projectPath, args, m365TokenProvider);
      const result = await handler.setUp();
      chai.assert(result.isOk());
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].objectId, objectId);
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].clientId, clientId);
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].clientSecret, clientSecret);
      chai.assert(envInfoV3.state[ComponentNames.AadApp].oauth2PermissionScopeId !== undefined);
      chai.assert.equal(
        envInfoV3.state[ComponentNames.AadApp].applicationIdUris,
        `api://localhost/${clientId}`
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
      });
      const args: SSODebugArgs = {};
      const handler = new SSODebugHandler(projectPath, args, m365TokenProvider);
      const result = await handler.setUp();
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
      });
      let botEnvs: LocalEnvs = {
        template: {},
        teamsfx: {},
        customized: {},
      };
      sinon.stub(LocalEnvProvider.prototype, "loadBotLocalEnvs").returns(Promise.resolve(botEnvs));
      sinon.stub(LocalEnvProvider.prototype, "saveBotLocalEnvs").callsFake(async (envs) => {
        botEnvs = envs;
      });
      const args: SSODebugArgs = {};
      const handler = new SSODebugHandler(projectPath, args, m365TokenProvider);
      const result = await handler.setUp();
      chai.assert(result.isOk());
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].objectId, objectId);
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].clientId, clientId);
      chai.assert.equal(envInfoV3.state[ComponentNames.AadApp].clientSecret, clientSecret);
      chai.assert(envInfoV3.state[ComponentNames.AadApp].oauth2PermissionScopeId !== undefined);
      chai.assert.equal(
        envInfoV3.state[ComponentNames.AadApp].applicationIdUris,
        `api://localhost/botid-${botId}`
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
          [LocalEnvKeys.bot.teamsfx.ApplicationIdUri]: `api://localhost/botid-${botId}`,
          [LocalEnvKeys.bot.teamsfx.LoginEndpoint]: `${botEndpoint}/auth-start.html`,
        },
        customized: {},
      };
      chai.assert.deepEqual(frontendEnvs, expectedFrontendEnvs);
      chai.assert.deepEqual(botEnvs, expectedBotEnvs);
      sinon.restore();
    });
  });
});
