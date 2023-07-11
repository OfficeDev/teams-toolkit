// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios, { AxiosResponse } from "axios";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import "mocha";
import mockFs from "mock-fs";
import Sinon, * as sinon from "sinon";

import { ok } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as path from "path";
import * as telemetry from "../../src/common/telemetry";
import {
  ConvertTokenToJson,
  getFixedCommonProjectSettings,
  getSPFxToken,
  getSideloadingStatus,
  isVideoFilterProject,
  listDevTunnels,
  setRegion,
  deepCopy,
} from "../../src/common/tools";
import { AuthSvcClient } from "../../src/component/driver/teamsApp/clients/authSvcClient";
import { MockTools } from "../core/utils";
import { isV3Enabled } from "../../src/common/featureFlags";

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

  describe("getFixedCommonProjectSettings", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("happy path V3", async () => {
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
      const manifest = {
        meetingExtensionDefinition: {
          videoFiltersConfigurationUrl: "https://a.b.c/",
        },
      };
      mockFs({
        [path.join(mockProjectRoot, "appPackage", "manifest.json")]: JSON.stringify(manifest),
      });

      // Act
      const result = await isVideoFilterProject(mockProjectRoot);

      // Assert
      chai.expect(result.isOk()).to.be.true;
      chai.expect(result._unsafeUnwrap()).to.be.true;
    });

    it("Should not recognize tab project as video filter", async () => {
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
        [path.join(mockProjectRoot, "appPackage", "manifest.json")]: JSON.stringify(manifest),
      });

      // Act
      const result = await isVideoFilterProject(mockProjectRoot);

      // Assert
      chai.expect(result.isOk()).to.be.true;
      chai.expect(result._unsafeUnwrap()).to.be.false;
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
  });

  describe("listDevTunnels", () => {
    const sandbox = sinon.createSandbox();
    afterEach(() => {
      sandbox.restore();
    });

    it("should return an error when the API call fails", async () => {
      const token = "test-token";

      const result = await listDevTunnels(token);
      chai.assert.isTrue(result.isErr());
    });
  });

  describe("deepCopy", async () => {
    it("should deep copy", async () => {
      const obj = {
        a: "a",
        b: {
          c: "c",
        },
      };
      const copy = deepCopy(obj);
      chai.expect(copy).deep.equal(obj);
      chai.expect(copy).not.equal(obj);
    });
    it("should not deep copy obj", async () => {
      const obj = {};
      const copy = deepCopy(obj);
      chai.expect(copy).equal(obj);
    });
  });
});
