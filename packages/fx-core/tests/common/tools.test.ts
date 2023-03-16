// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import axios, { AxiosResponse } from "axios";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import Sinon, * as sinon from "sinon";
import mockFs from "mock-fs";

import {
  getSideloadingStatus,
  canAddApiConnection,
  canAddSso,
  getFixedCommonProjectSettings,
  canAddCICDWorkflows,
  getAppSPFxVersion,
  isVideoFilterProject,
  setRegion,
  ConvertTokenToJson,
  getSPFxToken,
  isV3Enabled,
  isApiConnectEnabled,
} from "../../src/common/tools";
import * as telemetry from "../../src/common/telemetry";
import {
  AzureSolutionSettings,
  InputsWithProjectPath,
  ok,
  Platform,
  ProjectSettings,
  Settings,
  v2,
} from "@microsoft/teamsfx-api";
import { TabSsoItem } from "../../src/component/constants";
import * as featureFlags from "../../src/common/featureFlags";
import * as path from "path";
import fs from "fs-extra";
import { environmentManager } from "../../src/core/environment";
import { ExistingTemplatesStat } from "../../src/component/feature/cicd/existingTemplatesStat";
import mockedEnv, { RestoreFn } from "mocked-env";
import { AuthSvcClient } from "../../src/component/resource/appManifest/authSvcClient";
import { TOOLS } from "../../src/core/globalVars";
import { MockTools } from "../core/utils";

chai.use(chaiAsPromised);

describe("tools", () => {
  describe("getSideloadingStatus()", () => {
    let mockGet: () => AxiosResponse;
    let events: number;
    let errors: number;

    beforeEach(() => {
      sinon.restore();

      const mockInstance = axios.create();
      sinon.stub(mockInstance, "get").callsFake(async () => mockGet());
      sinon.stub(axios, "create").returns(mockInstance);

      events = 0;
      sinon.stub(telemetry, "sendTelemetryEvent").callsFake(() => {
        ++events;
      });

      errors = 0;
      sinon.stub(telemetry, "sendTelemetryErrorEvent").callsFake(() => {
        ++errors;
      });
    });

    afterEach(() => {
      sinon.restore();
    });

    it("sideloading enabled", async () => {
      mockGet = () => {
        return {
          status: 200,
          data: {
            value: {
              isSideloadingAllowed: true,
            },
          },
        } as AxiosResponse;
      };

      const result = await getSideloadingStatus("fake-token");

      chai.assert.isDefined(result);
      chai.assert.isTrue(result);
      chai.assert.equal(events, 1);
      chai.assert.equal(errors, 0);
    });

    it("sideloading not enabled", async () => {
      mockGet = () => {
        return {
          status: 200,
          data: {
            value: {
              isSideloadingAllowed: false,
            },
          },
        } as AxiosResponse;
      };

      const result = await getSideloadingStatus("fake-token");

      chai.assert.isDefined(result);
      chai.assert.isFalse(result);
      chai.assert.equal(events, 1);
      chai.assert.equal(errors, 0);
    });

    it("sideloading unknown", async () => {
      mockGet = () => {
        return {
          status: 200,
          data: {
            value: {
              foo: "bar",
            },
          },
        } as AxiosResponse;
      };

      const result = await getSideloadingStatus("fake-token");

      chai.assert.isUndefined(result);
      chai.assert.equal(events, 0);
      chai.assert.equal(errors, 1);
    });

    it("error and retry", async () => {
      mockGet = () => {
        throw new Error("test");
      };
      const clock = sinon.useFakeTimers();

      const resultPromise = getSideloadingStatus("fake-token");
      await clock.tickAsync(100000);
      const result = await resultPromise;
      clock.restore();

      chai.assert.isUndefined(result);
      chai.assert.equal(events, 0);
      chai.assert.equal(errors, 3);
    });
  });

  describe("canAddApiConnection()", () => {
    it("returns true when function is added", async () => {
      const solutionSettings: AzureSolutionSettings = {
        activeResourcePlugins: ["fx-resource-function"],
        hostType: "Azure",
        capabilities: [],
        azureResources: [],
        name: "test",
      };

      const result = canAddApiConnection(solutionSettings);

      chai.assert.isDefined(result);
      chai.assert.isTrue(result);
    });

    it("returns true when bot is added", async () => {
      const solutionSettings: AzureSolutionSettings = {
        activeResourcePlugins: ["fx-resource-bot"],
        hostType: "Azure",
        capabilities: [],
        azureResources: [],
        name: "test",
      };

      const result = canAddApiConnection(solutionSettings);

      chai.assert.isDefined(result);
      chai.assert.isTrue(result);
    });

    it("returns false when bot or function is not added", async () => {
      const solutionSettings: AzureSolutionSettings = {
        activeResourcePlugins: [],
        hostType: "Azure",
        capabilities: [],
        azureResources: [],
        name: "test",
      };

      const result = canAddApiConnection(solutionSettings);

      chai.assert.isDefined(result);
      chai.assert.isFalse(result);
    });
  });

  describe("canAddSso()", () => {
    beforeEach(() => {
      sinon.stub<any, any>(featureFlags, "isFeatureFlagEnabled").returns(true);
    });
    afterEach(() => {
      sinon.restore();
    });

    it("returns true when nothing is added", async () => {
      const projectSettings: ProjectSettings = {
        solutionSettings: {
          activeResourcePlugins: ["fx-resource-function"],
          hostType: "Azure",
          capabilities: [],
          azureResources: [],
          name: "test",
        },
        appName: "test",
        projectId: "projectId",
      };

      const result = canAddSso(projectSettings);

      chai.assert.isDefined(result);
      chai.assert.isTrue(result);
    });

    it("returns false when tab sso is added", async () => {
      const projectSettings: ProjectSettings = {
        solutionSettings: {
          activeResourcePlugins: ["fx-resource-aad-app-for-teams"],
          hostType: "Azure",
          capabilities: [TabSsoItem().id],
          azureResources: [],
          name: "test",
        },
        appName: "test",
        projectId: "projectId",
      };

      const result = canAddSso(projectSettings);

      chai.assert.isDefined(result);
      chai.assert.isFalse(result);
    });
  });

  describe("getFixedCommonProjectSettings", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("happy path", async () => {
      const restore = mockedEnv({
        TEAMSFX_V3: "false",
      });
      const projectSettings: ProjectSettings = {
        appName: "app-name",
        projectId: "project-id",
        version: "0.0.0",
        isFromSample: false,
        isM365: false,
        solutionSettings: {
          name: "fx-solution-azure",
          version: "1.0.0",
          hostType: "Azure",
          azureResources: [],
          capabilities: ["Tab", "Bot"],
          activeResourcePlugins: [
            "fx-resource-frontend-hosting",
            "fx-resource-identity",
            "fx-resource-bot",
            "fx-resource-local-debug",
            "fx-resource-appstudio",
            "fx-resource-cicd",
            "fx-resource-api-connector",
          ],
        },
        programmingLanguage: "typescript",
        pluginSettings: {
          "fx-resource-bot": {
            "host-type": "app-service",
          },
        },
      };

      sandbox.stub<any, any>(fs, "readJsonSync").callsFake((file: string) => {
        return projectSettings;
      });
      sandbox.stub<any, any>(fs, "pathExistsSync").callsFake((file: string) => {
        return true;
      });

      const result = getFixedCommonProjectSettings("root-path");
      chai.assert.isNotEmpty(result);
      chai.assert.equal(result!.projectId, projectSettings.projectId);
      chai.assert.equal(result!.programmingLanguage, projectSettings.programmingLanguage);
      chai.assert.equal(result!.isFromSample, projectSettings.isFromSample);
      chai.assert.equal(result!.isM365, projectSettings.isM365);
      chai.assert.equal(result!.hostType, projectSettings.solutionSettings?.hostType);
      restore();
    });

    it("happy path V3", async () => {
      const restore = mockedEnv({
        TEAMSFX_V3: "true",
      });
      try {
        sandbox.stub<any, any>(fs, "readFileSync").callsFake((file: string) => {
          return `version: 1.0.0
projectId: 00000000-0000-0000-0000-000000000000`;
        });
        sandbox.stub<any, any>(fs, "pathExistsSync").callsFake((file: string) => {
          return true;
        });

        const result = getFixedCommonProjectSettings("root-path");
        chai.assert.isNotEmpty(result);
        chai.assert.equal(result!.projectId, "00000000-0000-0000-0000-000000000000");
      } finally {
        restore();
      }
    });

    it("project settings not exists", async () => {
      sandbox.stub<any, any>(fs, "pathExistsSync").callsFake((file: string) => {
        return false;
      });
      const result = getFixedCommonProjectSettings("root-path");
      chai.assert.isUndefined(result);
    });

    it("throw error", async () => {
      sandbox.stub<any, any>(fs, "pathExistsSync").callsFake((file: string) => {
        throw new Error("new error");
      });
      const result = getFixedCommonProjectSettings("root-path");
      chai.assert.isUndefined(result);
    });

    it("empty root path", async () => {
      const result = getFixedCommonProjectSettings("");
      chai.assert.isUndefined(result);
    });
  });

  describe("canAddCICDWorkflows", () => {
    beforeEach(() => {
      sinon.stub<any, any>(featureFlags, "isFeatureFlagEnabled").returns(true);
    });
    afterEach(() => {
      sinon.restore();
    });

    it("returns true in SPFx project", async () => {
      sinon.stub(environmentManager, "listRemoteEnvConfigs").returns(Promise.resolve(ok(["test"])));
      sinon.stub(ExistingTemplatesStat.prototype, "notExisting").returns(true);

      const projectSettings = {
        appName: "test",
        projectId: "projectId",
        version: "2.1.0",
        isFromSample: false,
        components: [],
        programmingLanguage: "javascript",
        solutionSettings: {
          name: "fx-solution-azure",
          version: "1.0.0",
          hostType: "SPFx",
          azureResources: [],
          capabilities: ["Tab"],
          activeResourcePlugins: [
            "fx-resource-spfx",
            "fx-resource-local-debug",
            "fx-resource-appstudio",
          ],
        },
      };
      const inputs: InputsWithProjectPath = {
        platform: Platform.VSCode,
        projectPath: ".",
      };

      const result = await canAddCICDWorkflows(inputs, {
        projectSetting: projectSettings,
      } as unknown as v2.Context);

      chai.assert.isTrue(result);
    });
  });

  describe("getAppSPFxVersion", async () => {
    afterEach(() => {
      sinon.restore();
    });

    it("Returns version from .yo-rc.json", async () => {
      sinon.stub(fs, "pathExists").resolves(true);
      sinon.stub(fs, "readJson").resolves({
        "@microsoft/generator-sharepoint": {
          version: "1.15.0",
        },
      });

      const version = await getAppSPFxVersion("");

      chai.expect(version).equals("1.15.0");
    });

    it("Returns version from package.json when .yo-rc.json not exist", async () => {
      sinon.stub(fs, "pathExists").callsFake((directory) => {
        if (directory.includes(".yo-rc.json")) {
          return false;
        }
        return true;
      });
      sinon.stub(fs, "readJson").resolves({
        dependencies: {
          "@microsoft/sp-webpart-base": "1.14.0",
        },
      });

      const version = await getAppSPFxVersion("");

      chai.expect(version).equals("1.14.0");
    });
  });

  describe("isVideoFilterProject", async () => {
    let sandbox: Sinon.SinonSandbox;
    const mockProjectRoot = "video-filter";
    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });
    afterEach(() => {
      sandbox.restore();
      mockFs.restore();
    });

    it("Can recognize normal video filter project", async () => {
      // Arrange
      const restore = mockedEnv({
        TEAMSFX_V3: "false",
      });
      const manifest = {
        meetingExtensionDefinition: {
          videoFiltersConfigurationUrl: "https://a.b.c/",
        },
      };
      mockFs({
        [path.join(mockProjectRoot, "templates", "appPackage", "manifest.template.json")]:
          JSON.stringify(manifest),
      });

      // Act
      const result = await isVideoFilterProject(mockProjectRoot);

      // Assert
      chai.expect(result.isOk()).to.be.true;
      chai.expect(result._unsafeUnwrap()).to.be.true;
      restore();
    });

    it("Should not recognize tab project as video filter", async () => {
      const restore = mockedEnv({
        TEAMSFX_V3: "false",
      });
      // Arrange
      const manifest = {
        $schema:
          "https://developer.microsoft.com/en-us/json-schemas/teams/v1.14/MicrosoftTeams.schema.json",
        manifestVersion: "1.14",
        version: "1.0.0",
        id: "{{state.fx-resource-appstudio.teamsAppId}}",
        packageName: "com.microsoft.teams.extension",
        developer: {
          name: "Teams App, Inc.",
          websiteUrl: "https://www.example.com",
          privacyUrl: "https://www.example.com/termofuse",
          termsOfUseUrl: "https://www.example.com/privacy",
        },
        icons: {
          color: "{{config.manifest.icons.color}}",
          outline: "{{config.manifest.icons.outline}}",
        },
        name: {
          short: "{{config.manifest.appName.short}}",
          full: "{{config.manifest.appName.full}}",
        },
        description: {
          short: "{{config.manifest.description.short}}",
          full: "{{config.manifest.description.full}}",
        },
        accentColor: "#FFFFFF",
        bots: [],
        composeExtensions: [],
        configurableTabs: [
          {
            configurationUrl:
              "{{{state.fx-resource-frontend-hosting.endpoint}}}{{{state.fx-resource-frontend-hosting.indexPath}}}/config",
            canUpdateConfiguration: true,
            scopes: ["team", "groupchat"],
          },
        ],
        staticTabs: [
          {
            entityId: "index0",
            name: "Personal Tab",
            contentUrl:
              "{{{state.fx-resource-frontend-hosting.endpoint}}}{{{state.fx-resource-frontend-hosting.indexPath}}}/tab",
            websiteUrl:
              "{{{state.fx-resource-frontend-hosting.endpoint}}}{{{state.fx-resource-frontend-hosting.indexPath}}}/tab",
            scopes: ["personal"],
          },
        ],
        permissions: ["identity", "messageTeamMembers"],
        validDomains: ["{{state.fx-resource-frontend-hosting.domain}}"],
      };
      mockFs({
        [path.join(mockProjectRoot, "templates", "appPackage", "manifest.template.json")]:
          JSON.stringify(manifest),
      });

      // Act
      const result = await isVideoFilterProject(mockProjectRoot);

      // Assert
      chai.expect(result.isOk()).to.be.true;
      chai.expect(result._unsafeUnwrap()).to.be.false;
      restore();
    });
  });

  describe("setRegion", async () => {
    afterEach(() => {
      sinon.restore();
    });

    it("set region", async () => {
      sinon.stub(AuthSvcClient, "getRegion").resolves("apac");
      await setRegion("fakeToken");
    });
  });

  describe("ConvertTokenToJson", async () => {
    afterEach(() => {
      sinon.restore();
    });

    it("ConvertTokenToJson", async () => {
      const res = ConvertTokenToJson("a.eyJ1c2VySWQiOiJ0ZXN0QHRlc3QuY29tIn0=.c");
      chai.expect(res["userId"]).equal("test@test.com");
    });
  });
  describe("getSPFxToken", async () => {
    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      const mockTools = new MockTools();
      sinon.stub(mockTools.tokenProvider.m365TokenProvider, "getAccessToken").resolves(ok("xxx"));
      sinon.stub(axios, "get").resolves({ data: { webUrl: "122" } });
      const res = await getSPFxToken(mockTools.tokenProvider.m365TokenProvider);
    });
  });
  describe("feature flag check", () => {
    let mockedEnvRestore: RestoreFn;
    afterEach(() => {
      mockedEnvRestore();
    });
    it("should return true if no v5 set", () => {
      mockedEnvRestore = mockedEnv({}, { clear: true });
      const res = isV3Enabled();
      chai.expect(res).true;
    });
    it("should return true if v5 set", () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "true" }, { clear: true });
      const res = isV3Enabled();
      chai.expect(res).true;
    });
    it("should return false is v5 set false", () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" }, { clear: true });
      const res = isV3Enabled();
      chai.expect(res).false;
    });
    it("should return false if no TEAMSFX_API_CONNECT_ENABLE set", () => {
      mockedEnvRestore = mockedEnv({}, { clear: true });
      const res = isApiConnectEnabled();
      chai.expect(res).false;
    });
    it("should return true if TEAMSFX_API_CONNECT_ENABLE set", () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_API_CONNECT_ENABLE: "true" }, { clear: true });
      const res = isApiConnectEnabled();
      chai.expect(res).true;
    });
  });
});
