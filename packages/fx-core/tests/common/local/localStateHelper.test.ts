// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as fs from "fs-extra";
import { cloneDeep } from "lodash";
import * as path from "path";

import { convertToLocalEnvs } from "../../../src/common/local/localStateHelper";
import { ProjectSettingsV3, v3 } from "@microsoft/teamsfx-api";
chai.use(chaiAsPromised);

describe("localStateHelper", () => {
  describe("convertToLocalEnvs()", () => {
    const projectSettings0: ProjectSettingsV3 = {
      appName: "unit-test0",
      projectId: "11111111-1111-1111-1111-111111111111",
      version: "2.0.0",
      programmingLanguage: "javascript",
      solutionSettings: {
        name: "fx-solution-azure",
        version: "1.0.0",
        hostType: "Azure",
        azureResources: [] as string[],
        capabilities: ["Tab"],
        activeResourcePlugins: ["fx-resource-aad-app-for-teams"],
      },
      components: [{ name: "aad-app" }, { name: "teams-tab" }],
    };
    const localState0 = {
      solution: {},
      "fx-resource-appstudio": {
        teamsAppId: "33333333-3333-3333-3333-333333333333",
      },
      "fx-resource-aad-app-for-teams": {
        clientId: "44444444-4444-4444-4444-444444444444",
        clientSecret: "password-placeholder",
        tenantId: "22222222-2222-2222-2222-222222222222",
      },
      "fx-resource-frontend-hosting": {
        domain: "localhost",
        endpoint: "https://localhost:53000",
      },
    };
    const envInfo0: v3.EnvInfoV3 = {
      envName: "local",
      state: localState0,
      config: {},
    };
    const projectPath = path.resolve(__dirname, "data");

    it("happy path", async () => {
      await fs.ensureDir(projectPath);
      await fs.emptyDir(projectPath);

      const localEnvs = await convertToLocalEnvs(projectPath, projectSettings0, envInfo0);

      chai.assert.isDefined(localEnvs);
      chai.assert.equal(Object.keys(localEnvs).length, 5);
      chai.assert.equal(
        localEnvs["FRONTEND_REACT_APP_START_LOGIN_PAGE_URL"],
        "https://localhost:53000/auth-start.html"
      );
      chai.assert.equal(
        localEnvs["FRONTEND_REACT_APP_CLIENT_ID"],
        "44444444-4444-4444-4444-444444444444"
      );
    });

    it("happy path without AAD plugin", async () => {
      await fs.ensureDir(projectPath);
      await fs.emptyDir(projectPath);

      const projectSettings = cloneDeep(projectSettings0) as ProjectSettingsV3;
      projectSettings.components = [{ name: "teams-tab" }];
      const localEnvs = await convertToLocalEnvs(projectPath, projectSettings, envInfo0);

      chai.assert.isDefined(localEnvs);
      chai.assert.equal(Object.keys(localEnvs).length, 3);
      chai.assert.isUndefined(localEnvs["FRONTEND_REACT_APP_START_LOGIN_PAGE_URL"]);
      chai.assert.isUndefined(localEnvs["FRONTEND_REACT_APP_CLIENT_ID"]);
    });

    it("happy path with Simple Auth", async () => {
      await fs.ensureDir(projectPath);
      await fs.emptyDir(projectPath);

      const projectSettingsAll = cloneDeep(projectSettings0);
      projectSettingsAll.solutionSettings!.activeResourcePlugins.push("fx-resource-simple-auth");
      projectSettingsAll.components.push({ name: "simple-auth", provision: true });
      const localEnvs = await convertToLocalEnvs(projectPath, projectSettingsAll, envInfo0);

      chai.assert.isDefined(localEnvs);
      chai.assert.equal(Object.keys(localEnvs).length, 15);
      chai.assert.equal(
        localEnvs["FRONTEND_REACT_APP_START_LOGIN_PAGE_URL"],
        "https://localhost:53000/auth-start.html"
      );
      chai.assert.equal(
        localEnvs["FRONTEND_REACT_APP_CLIENT_ID"],
        "44444444-4444-4444-4444-444444444444"
      );
      chai.assert.equal(localEnvs["AUTH_CLIENT_ID"], "44444444-4444-4444-4444-444444444444");
      chai.assert.equal(localEnvs["AUTH_CLIENT_SECRET"], "password-placeholder");
      chai.assert.equal(
        localEnvs["AUTH_AAD_METADATA_ADDRESS"],
        "https://login.microsoftonline.com/22222222-2222-2222-2222-222222222222/v2.0/.well-known/openid-configuration"
      );
      chai.assert.equal(
        localEnvs["AUTH_OAUTH_AUTHORITY"],
        "https://login.microsoftonline.com/22222222-2222-2222-2222-222222222222"
      );
      chai.assert.equal(localEnvs["AUTH_TAB_APP_ENDPOINT"], "https://localhost:53000");
    });

    it(".env.teamsfx.local", async () => {
      const frontendEnvPath = path.resolve(projectPath, "tabs/.env.teamsfx.local");
      fs.ensureFileSync(frontendEnvPath);
      fs.writeFileSync(frontendEnvPath, "FOO=FRONTEND");
      const backendEnvPath = path.resolve(projectPath, "api/.env.teamsfx.local");
      fs.ensureFileSync(backendEnvPath);
      fs.writeFileSync(backendEnvPath, "FOO=BACKEND");
      const botEnvPath = path.resolve(projectPath, "bot/.env.teamsfx.local");
      fs.ensureFileSync(botEnvPath);
      fs.writeFileSync(botEnvPath, "FOO=BOT");
      const projectSettings = cloneDeep(projectSettings0) as ProjectSettingsV3;
      projectSettings.components = [
        { name: "teams-tab", sso: true },
        { name: "aad-app", provision: true },
        { name: "teams-bot" },
        { name: "teams-api" },
      ];
      const localEnvs = await convertToLocalEnvs(projectPath, projectSettings, undefined);
      chai.assert.isDefined(localEnvs);
      chai.assert.equal(localEnvs["FRONTEND_FOO"], "FRONTEND");
      chai.assert.equal(localEnvs["BACKEND_FOO"], "BACKEND");
      chai.assert.equal(localEnvs["BOT_FOO"], "BOT");
      chai.assert.isTrue(Object.keys(localEnvs).length > 3);
    });
  });
});
