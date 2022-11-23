// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import sinon from "sinon";
import { MockLogProvider, MockM365TokenProvider } from "../../../core/utils";
import {
  err,
  InputsWithProjectPath,
  ok,
  Platform,
  ResourceContextV3,
  UserError,
} from "@microsoft/teamsfx-api";
import {
  checkIfAppInDifferentAcountSameTenant,
  getAppPackage,
  updateManifestV3ForPublish,
} from "../../../../src/component/resource/appManifest/appStudio";
import { AppStudioClient } from "../../../../src/component/resource/appManifest/appStudioClient";
import AdmZip from "adm-zip";
import { RetryHandler } from "../../../../src/component/resource/appManifest/utils/utils";
import { createContextV3 } from "../../../../src/component/utils";
import mockedEnv, { RestoreFn } from "mocked-env";
import { CoreQuestionNames } from "../../../../src/core/question";
import Container from "typedi";
import { CreateTeamsAppDriver } from "../../../../src/component/driver/teamsApp/create";
import { ConfigureTeamsAppDriver } from "../../../../src/component/driver/teamsApp/configure";
import { envUtil } from "../../../../src/component/utils/envUtil";

describe("appStudio", () => {
  const sandbox = sinon.createSandbox();
  describe("checkIfAppInDifferentAcountSameTenant", () => {
    const logger = new MockLogProvider();
    const teamsAppId = "teams";
    const m365TokenProvider = new MockM365TokenProvider();

    afterEach(() => {
      sandbox.restore();
    });

    it("get app successfully: returns false", async () => {
      m365TokenProvider.getAccessToken = sandbox.stub().returns(ok("token"));
      sandbox.stub(AppStudioClient, "getApp").resolves();

      const res = await checkIfAppInDifferentAcountSameTenant(
        teamsAppId,
        m365TokenProvider,
        logger
      );
      chai.assert.isTrue(res.isOk());

      if (res.isOk()) {
        chai.assert.isFalse(res.value);
      }
    });

    it("get token error: returns error", async () => {
      m365TokenProvider.getAccessToken = sandbox
        .stub()
        .returns(err(new UserError("token", "token", "", "")));

      const res = await checkIfAppInDifferentAcountSameTenant(
        teamsAppId,
        m365TokenProvider,
        logger
      );
      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.equal(res.error.name, "token");
      }
    });

    it("app in tenant but different account: returns true", async () => {
      m365TokenProvider.getAccessToken = sandbox.stub().returns(ok("token"));
      sandbox.stub(AppStudioClient, "getApp").throws({ message: "404" });
      sandbox.stub(AppStudioClient, "checkExistsInTenant").returns(Promise.resolve(true));
      const res = await checkIfAppInDifferentAcountSameTenant(
        teamsAppId,
        m365TokenProvider,
        logger
      );
      chai.assert.isTrue(res.isOk());

      if (res.isOk()) {
        chai.assert.isTrue(res.value);
      }
    });

    it("get app error (not 404): returns false", async () => {
      m365TokenProvider.getAccessToken = sandbox.stub().returns(ok("token"));
      sandbox.stub(AppStudioClient, "getApp").throws({ message: "401" });
      const res = await checkIfAppInDifferentAcountSameTenant(
        teamsAppId,
        m365TokenProvider,
        logger
      );
      chai.assert.isTrue(res.isOk());

      if (res.isOk()) {
        chai.assert.isFalse(res.value);
      }
    });
  });

  describe("getAppPackage", () => {
    const logger = new MockLogProvider();
    const teamsAppId = "teams";
    const m365TokenProvider = new MockM365TokenProvider();

    afterEach(() => {
      sandbox.restore();
    });

    it("get package successfully", async () => {
      m365TokenProvider.getAccessToken = sandbox.stub().returns(ok("token"));
      const zip = new AdmZip();
      zip.addFile("manifest.json", new Buffer(""));
      zip.addFile("color.png", new Buffer(""));
      zip.addFile("outline.png", new Buffer(""));
      zip.addFile("zh-cn.json", new Buffer(""));
      const archivedFile = zip.toBuffer();
      sandbox.stub(RetryHandler, "Retry").resolves({
        data: archivedFile,
      });

      const res = await getAppPackage(teamsAppId, m365TokenProvider, logger);
      chai.assert.isTrue(res.isOk());

      if (res.isOk()) {
        chai.assert.isTrue(res.value.manifest !== undefined);
        chai.assert.isTrue(res.value.icons !== undefined);
        chai.assert.isTrue(res.value.icons?.color !== undefined);
        chai.assert.isTrue(res.value.icons?.outline !== undefined);
        chai.assert.isTrue(res.value.languages !== undefined);
      }
    });

    it("get package successfully with unsupported file", async () => {
      m365TokenProvider.getAccessToken = sandbox.stub().returns(ok("token"));
      const zip = new AdmZip();
      zip.addFile("manifest.json", new Buffer(""));
      zip.addFile("color.png", new Buffer(""));
      zip.addFile("outline.png", new Buffer(""));
      zip.addFile("idk.json", new Buffer(""));
      const archivedFile = zip.toBuffer();
      sandbox.stub(RetryHandler, "Retry").resolves({
        data: archivedFile,
      });
      const loggerSpy = sandbox.stub(logger, "warning").resolves();

      const res = await getAppPackage(teamsAppId, m365TokenProvider, logger);
      chai.assert.isTrue(res.isOk());

      if (res.isOk()) {
        chai.assert.isTrue(loggerSpy.called);
        chai.assert.isUndefined(res.value.languages);
      }
    });

    it("get token error: returns error", async () => {
      m365TokenProvider.getAccessToken = sandbox
        .stub()
        .returns(err(new UserError("token", "token", "", "")));

      const res = await getAppPackage(teamsAppId, m365TokenProvider, logger);
      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.equal(res.error.name, "token");
      }
    });

    it("get package failed due to api", async () => {
      m365TokenProvider.getAccessToken = sandbox.stub().returns(ok("token"));

      sandbox.stub(RetryHandler, "Retry").throws();

      const res = await getAppPackage(teamsAppId, m365TokenProvider, logger);
      chai.assert.isTrue(res.isErr());
    });

    it("get package empty response", async () => {
      m365TokenProvider.getAccessToken = sandbox.stub().returns(ok("token"));

      sandbox.stub(RetryHandler, "Retry").resolves({});

      const res = await getAppPackage(teamsAppId, m365TokenProvider, logger);
      chai.assert.isTrue(res.isErr());
    });
  });

  describe("updateManifestV3ForPublish", () => {
    let mockedEnvRestore: RestoreFn | undefined;
    afterEach(() => {
      sandbox.restore();
      if (mockedEnvRestore) {
        mockedEnvRestore();
      }
    });
    it("success", async () => {
      const ctx = createContextV3();
      const inputs: InputsWithProjectPath = {
        [CoreQuestionNames.ManifestPath]: "manifest.json",
        platform: Platform.VSCode,
        projectPath: "projectPath",
      };
      mockedEnvRestore = mockedEnv({
        TEAMSFX_ENV: "local",
        TEAMS_APP_ID: "id",
      });
      const createAppDriver = new CreateTeamsAppDriver();
      const updateDriver = new ConfigureTeamsAppDriver();
      sandbox.stub(Container, "get").callsFake((name) => {
        if (name === "teamsApp/createAppPackage") {
          return createAppDriver;
        } else if (name == "teamsApp/update") {
          return updateDriver;
        } else {
          throw new Error("not implemented");
        }
      });
      sandbox.stub(createAppDriver, "run").resolves(ok(new Map([])));
      sandbox.stub(updateDriver, "run").resolves(ok(new Map([])));
      sandbox.stub(envUtil, "readEnv").resolves();

      const res = await updateManifestV3ForPublish(ctx as ResourceContextV3, inputs);
      chai.assert.isTrue(res.isOk());
    });

    it("createAppPackage error", async () => {
      const ctx = createContextV3();
      const inputs: InputsWithProjectPath = {
        [CoreQuestionNames.ManifestPath]: "manifest.json",
        platform: Platform.VSCode,
        projectPath: "projectPath",
      };
      mockedEnvRestore = mockedEnv({
        TEAMSFX_ENV: "local",
        TEAMS_APP_ID: "id",
      });
      const createAppDriver = new CreateTeamsAppDriver();
      const updateDriver = new ConfigureTeamsAppDriver();
      sandbox.stub(Container, "get").callsFake((name) => {
        if (name === "teamsApp/createAppPackage") {
          return createAppDriver;
        } else if (name == "teamsApp/update") {
          return updateDriver;
        } else {
          throw new Error("not implemented");
        }
      });
      sandbox.stub(createAppDriver, "run").resolves(err(new UserError("error", "error", "", "")));

      const res = await updateManifestV3ForPublish(ctx as ResourceContextV3, inputs);

      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.equal(res.error.name, "error");
      }
    });

    it("update app error", async () => {
      const ctx = createContextV3();
      const inputs: InputsWithProjectPath = {
        [CoreQuestionNames.ManifestPath]: "manifest.json",
        platform: Platform.VSCode,
        projectPath: "projectPath",
      };
      mockedEnvRestore = mockedEnv({
        TEAMSFX_ENV: "local",
        TEAMS_APP_ID: "id",
      });
      const createAppDriver = new CreateTeamsAppDriver();
      const updateDriver = new ConfigureTeamsAppDriver();
      sandbox.stub(Container, "get").callsFake((name) => {
        if (name === "teamsApp/createAppPackage") {
          return createAppDriver;
        } else if (name == "teamsApp/update") {
          return updateDriver;
        } else {
          throw new Error("not implemented");
        }
      });
      sandbox.stub(createAppDriver, "run").resolves(ok(new Map([])));
      sandbox.stub(updateDriver, "run").resolves(err(new UserError("error", "error", "", "")));
      sandbox.stub(envUtil, "readEnv").resolves();

      const res = await updateManifestV3ForPublish(ctx as ResourceContextV3, inputs);
      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.equal(res.error.name, "error");
      }
    });
  });
});
