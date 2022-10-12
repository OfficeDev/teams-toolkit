// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import sinon from "sinon";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as fs from "fs-extra";
import { cloneDeep } from "lodash";
import * as path from "path";

import {
  convertToLocalEnvs,
  getProjectComponents,
} from "../../../src/common/local/localSettingsHelper";
import { ProjectSettings, ProjectSettingsV3 } from "@microsoft/teamsfx-api";
import { LocalEnvManager } from "../../../src/common/local/localEnvManager";
import { convertProjectSettingsV2ToV3 } from "../../../src/component/migrate";
chai.use(chaiAsPromised);

describe("localSettingsHelper", () => {
  describe("convertToLocalEnvs()", () => {
    const projectSettings0 = {
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
        activeResourcePlugins: ["fx-resource-frontend-hosting", "fx-resource-aad-app-for-teams"],
      },
      components: [
        { name: "teams-tab", sso: true },
        { name: "aad-app", provision: true },
      ],
    };
    const localSettings0 = {
      teamsApp: {
        tenantId: "22222222-2222-2222-2222-222222222222",
        teamsAppId: "33333333-3333-3333-3333-333333333333",
      },
      auth: {
        clientId: "44444444-4444-4444-4444-444444444444",
        clientSecret: "password-placeholder",
      },
      frontend: {
        tabDomain: "localhost",
        tabEndpoint: "https://localhost:53000",
      },
    };
    const projectPath = path.resolve(__dirname, "data");

    it("happy path", async () => {
      await fs.ensureDir(projectPath);
      await fs.emptyDir(projectPath);

      const localEnvs = await convertToLocalEnvs(projectPath, projectSettings0, localSettings0);

      chai.assert.isDefined(localEnvs);
      chai.assert.equal(Object.keys(localEnvs).length, 7);
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
      const projectSettings = cloneDeep(projectSettings0);
      projectSettings.components = [{ name: "teams-tab", sso: true }];
      const localEnvs = await convertToLocalEnvs(projectPath, projectSettings, localSettings0);

      chai.assert.isDefined(localEnvs);
      chai.assert.equal(Object.keys(localEnvs).length, 5);
      chai.assert.isUndefined(localEnvs["FRONTEND_REACT_APP_START_LOGIN_PAGE_URL"]);
      chai.assert.isUndefined(localEnvs["FRONTEND_REACT_APP_CLIENT_ID"]);
    });

    it("happy path with Simple Auth", async () => {
      await fs.ensureDir(projectPath);
      await fs.emptyDir(projectPath);

      const projectSettingsAll = cloneDeep(projectSettings0);
      projectSettingsAll.solutionSettings.activeResourcePlugins.push("fx-resource-simple-auth");
      projectSettingsAll.components.push({ name: "simple-auth", provision: true });
      const localEnvs = await convertToLocalEnvs(
        projectPath,
        convertProjectSettingsV2ToV3(projectSettingsAll, "."),
        localSettings0
      );

      chai.assert.isDefined(localEnvs);
      chai.assert.equal(Object.keys(localEnvs).length, 17);
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

  describe("getProjectComponents()", () => {
    const projectPath = "fake path";
    let projectSettings: ProjectSettingsV3;

    beforeEach(() => {
      sinon.stub(process, "env").value({ TEAMSFX_API_V3: "true" });
      sinon
        .stub(LocalEnvManager.prototype, "getProjectSettings")
        .callsFake(async (): Promise<ProjectSettings> => {
          return projectSettings;
        });
    });

    afterEach(() => {
      sinon.restore();
    });

    it("getProjectComponents", async () => {
      // Arrange
      // error message, result, projectSettings.json
      const cases: [string, { [key: string]: unknown }, ProjectSettingsV3][] = [
        [
          "Notification bot project",
          {
            components: ["bot"],
            botHostType: "azure-functions",
            botCapabilities: ["notification"],
          },
          {
            appName: "mock name",
            projectId: "mock id",
            components: [
              {
                name: "teams-bot",
                hosting: "azure-function",
                deploy: true,
                capabilities: ["notification"],
                build: true,
                folder: "bot",
              },
              {
                name: "bot-service",
                provision: true,
              },
              {
                name: "azure-function",
                scenario: "Bot",
                connections: ["identity", "teams-bot"],
              },
              {
                name: "identity",
                provision: true,
              },
            ],
            pluginSettings: {
              "fx-resource-bot": {
                "host-type": "azure-function",
                capabilities: ["notification"],
              },
            },
          },
        ],
        [
          "Command bot project",
          {
            components: ["bot"],
            botHostType: "app-service",
            botCapabilities: ["command-response"],
          },
          {
            appName: "mock name",
            projectId: "mock id",
            components: [
              {
                name: "teams-bot",
                hosting: "azure-web-app",
                provision: false,
                deploy: true,
                capabilities: ["command-response"],
                build: true,
                folder: "bot",
              },
              {
                name: "bot-service",
                provision: true,
              },
              {
                name: "azure-web-app",
                scenario: "Bot",
                connections: ["identity", "teams-bot"],
              },
              {
                name: "identity",
                provision: true,
              },
            ],
            pluginSettings: {
              "fx-resource-bot": {
                "host-type": "azure-function",
                capabilities: ["notification"],
              },
            },
          },
        ],
        [
          "SSO tab project",
          { components: ["aad", "frontend"] },
          {
            appName: "mock name",
            projectId: "mock id",
            components: [
              {
                name: "teams-tab",
                hosting: "azure-storage",
                deploy: true,
                provision: true,
                build: true,
                folder: "tabs",
                sso: true,
              },
              {
                name: "azure-storage",
                scenario: "Tab",
                provision: true,
              },
              {
                name: "identity",
                provision: true,
              },
              {
                name: "aad-app",
                provision: true,
                deploy: true,
              },
            ],
          },
        ],
        [
          "Tab + Backend project",
          { components: ["aad", "backend", "frontend"] },
          {
            appName: "",
            projectId: "",
            components: [
              {
                name: "teams-tab",
                hosting: "azure-storage",
                deploy: true,
                provision: true,
                build: true,
                folder: "tabs",
                sso: true,
              },
              {
                name: "azure-storage",
                scenario: "Tab",
                provision: true,
              },
              {
                name: "identity",
                provision: true,
              },
              {
                name: "aad-app",
                provision: true,
                deploy: true,
              },
              {
                name: "teams-api",
                provision: true,
                deploy: true,
              },
            ],
          },
        ],
        [
          "SPFx project",
          { components: ["spfx"] },
          {
            appName: "mock name",
            projectId: "mock id",
            components: [
              {
                name: "teams-tab",
                hosting: "spfx",
                deploy: true,
                folder: "SPFx",
                build: true,
              },
              {
                name: "spfx",
                provision: true,
              },
            ],
          },
        ],
        [
          "Empty project settings",
          { components: [] },
          {
            appName: "mock name",
            projectId: "mock id",
            components: [],
          },
        ],
      ];

      for (const [message, expected, input] of cases) {
        // Act
        projectSettings = input;
        const projectComponentsStr = await getProjectComponents(projectPath);

        // Assert
        if (expected === undefined) {
          chai.assert.isUndefined(projectComponentsStr);
        } else {
          chai.assert.isDefined(projectComponentsStr);
          const projectComponents: { [key: string]: any } = JSON.parse(projectComponentsStr!);
          projectComponents?.components?.sort?.();
          chai.assert.deepEqual(projectComponents, expected, message);
        }
      }
    });
  });

  describe("getProjectComponents() errors", () => {
    const projectPath = "fake path";

    beforeEach(() => {
      sinon.stub(process, "env").value({ TEAMSFX_API_V3: "true" });
      sinon
        .stub(LocalEnvManager.prototype, "getProjectSettings")
        .callsFake(async (): Promise<ProjectSettings> => {
          throw new Error("test error");
        });
    });

    afterEach(() => {
      sinon.restore();
    });

    it("getProjectComponents", async () => {
      // Arrange

      // Act
      const projectComponentsStr = await getProjectComponents(projectPath);

      // Assert
      chai.assert.isUndefined(projectComponentsStr);
    });
  });
});
