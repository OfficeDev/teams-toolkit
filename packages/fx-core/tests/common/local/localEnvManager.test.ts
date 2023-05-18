// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import mockFs from "mock-fs";

import { UserError, ok } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as tools from "../../../src/common/tools";
import { LocalEnvManager } from "../../../src/common/local/localEnvManager";
import sinon from "sinon";
import {
  LocalEnvProvider,
  LocalEnvs,
  LocalEnvKeys,
} from "../../../src/component/debugHandler/localEnvProvider";
import {
  LocalCertificate,
  LocalCertificateManager,
} from "../../../src/common/local/localCertificateManager";
import { environmentManager } from "../../../src/core/environment";
import { convertProjectSettingsV2ToV3 } from "../../../src/component/migrate";
import { FeatureFlagName } from "../../../src/common/constants";
chai.use(chaiAsPromised);

describe("LocalEnvManager", () => {
  const projectSettings0 = {
    appName: "unit-test0",
    projectId: "11111111-1111-1111-1111-111111111111",
    version: "2.0.0",
    programmingLanguage: "javascript",
  };
  const localSettings0 = {
    teamsApp: {
      tenantId: "22222222-2222-2222-2222-222222222222",
      teamsAppId: "33333333-3333-3333-3333-333333333333",
    },
    auth: {
      clientId: "44444444-4444-4444-4444-444444444444",
      // encrypted text: "password-placeholder"
      clientSecret:
        "crypto_025d3c0a85c31e192ff0d8b8d0c9f44e3d5044fa95e642ce6c46d8ee5c4e2ad6b90c3ab385589e7c0d52862898efea47433586f4a14c9f899a7769b3ec73eff372161bbe4b98eb8ba928d58a4ad942bfc880585fe0de737c2f3e5d1a0509e844a4adaf55fa8dd0ecd1e6b3f52dc9812cf6bebb0e",
    },
    frontend: {
      tabDomain: "localhost",
      tabEndpoint: "https://localhost:53000",
    },
  };
  const projectPath = path.resolve(__dirname, "data");
  const configFolder = path.resolve(projectPath, ".fx/configs");
  const localEnvManager = new LocalEnvManager();

  beforeEach(() => {
    fs.ensureDirSync(path.resolve(__dirname, "data"));
  });

  describe("getProjectSettings()", () => {
    const sandbox = sinon.createSandbox();
    let files: Record<string, any> = {};
    let mockedEnvRestore: RestoreFn;
    beforeEach(() => {
      mockedEnvRestore = mockedEnv({}, { clear: true });
      files = {};
      sandbox.restore();
      sandbox.stub(fs, "pathExists").callsFake(async (file: string) => {
        return Promise.resolve(files[path.resolve(file)] !== undefined);
      });
      sandbox.stub(fs, "writeFile").callsFake(async (file: fs.PathLike | number, data: any) => {
        files[path.resolve(file as string)] = data;
        return Promise.resolve();
      });
      sandbox.stub(fs, "readJson").callsFake(async (file: string) => {
        return Promise.resolve(JSON.parse(files[path.resolve(file)]));
      });
      sandbox.stub(tools, "waitSeconds").resolves();
    });

    afterEach(() => {
      mockedEnvRestore();
      sandbox.restore();
    });

    it("happy path", async () => {
      mockedEnvRestore = mockedEnv({ [FeatureFlagName.V3]: "false" });
      await fs.writeFile(
        path.resolve(configFolder, "projectSettings.json"),
        JSON.stringify(projectSettings0)
      );

      const projectSettings = await localEnvManager.getProjectSettings(projectPath);

      chai.assert.isDefined(projectSettings);
      chai.assert.equal(projectSettings.appName, "unit-test0");
      chai.assert.equal(projectSettings.projectId, "11111111-1111-1111-1111-111111111111");
      chai.assert.equal(projectSettings.version, "2.0.0");
      chai.assert.equal(projectSettings.programmingLanguage, "javascript");
    });

    it("missing field", async () => {
      mockedEnvRestore = mockedEnv({ [FeatureFlagName.V3]: "false" });
      await fs.writeFile(path.resolve(configFolder, "projectSettings.json"), "{}");

      const projectSettings = await localEnvManager.getProjectSettings(projectPath);

      chai.assert.isDefined(projectSettings);
      chai.assert.isUndefined(projectSettings.appName);
      chai.assert.isDefined(projectSettings.projectId);
    });

    it("missing file", async () => {
      let error: UserError | undefined = undefined;
      try {
        await localEnvManager.getProjectSettings(projectPath);
      } catch (e: any) {
        error = e as UserError;
      }

      chai.assert.isDefined(error);
      chai.assert.equal(error!.name, "FileNotFoundError");
    });
  });

  describe("getLocalSettings()", () => {
    const sandbox = sinon.createSandbox();
    let files: Record<string, any> = {};
    let mockedEnvRestore: RestoreFn;
    beforeEach(() => {
      mockedEnvRestore = mockedEnv({}, { clear: true });
      files = {};
      sandbox.restore();
      sandbox.stub(fs, "pathExists").callsFake(async (file: string) => {
        return Promise.resolve(files[path.resolve(file)] !== undefined);
      });
      sandbox.stub(fs, "writeFile").callsFake(async (file: fs.PathLike | number, data: any) => {
        files[path.resolve(file as string)] = data;
        return Promise.resolve();
      });
      sandbox.stub(fs, "readJson").callsFake(async (file: string) => {
        return Promise.resolve(JSON.parse(files[path.resolve(file)]));
      });
      sandbox.stub(tools, "waitSeconds").resolves();
    });

    afterEach(() => {
      sandbox.restore();
      mockedEnvRestore();
    });

    it("happy path", async () => {
      mockedEnvRestore = mockedEnv({ [FeatureFlagName.V3]: "false" });
      await fs.writeFile(
        path.resolve(configFolder, "projectSettings.json"),
        JSON.stringify(projectSettings0)
      );
      await fs.writeFile(
        path.resolve(configFolder, "localSettings.json"),
        JSON.stringify(localSettings0)
      );

      const projectSettings = await localEnvManager.getProjectSettings(projectPath);
      const localSettings = await localEnvManager.getLocalSettings(projectPath, {
        projectId: projectSettings.projectId,
      });

      chai.assert.isDefined(localSettings);
      chai.assert.isDefined(localSettings!.teamsApp);
      chai.assert.equal(localSettings!.teamsApp.tenantId, "22222222-2222-2222-2222-222222222222");
      chai.assert.equal(localSettings!.teamsApp.teamsAppId, "33333333-3333-3333-3333-333333333333");
      chai.assert.isDefined(localSettings!.auth);
      chai.assert.equal(localSettings!.auth.clientId, "44444444-4444-4444-4444-444444444444");
      chai.assert.equal(localSettings!.auth.clientSecret, "password-placeholder");
      chai.assert.isDefined(localSettings!.frontend);
      chai.assert.equal(localSettings!.frontend.tabDomain, "localhost");
      chai.assert.equal(localSettings!.frontend.tabEndpoint, "https://localhost:53000");
    });

    it("missing field", async () => {
      mockedEnvRestore = mockedEnv({ [FeatureFlagName.V3]: "false" });
      await fs.writeFile(
        path.resolve(configFolder, "projectSettings.json"),
        JSON.stringify(projectSettings0)
      );
      await fs.writeFile(path.resolve(configFolder, "localSettings.json"), "{}");

      const projectSettings = await localEnvManager.getProjectSettings(projectPath);
      const localSettings = await localEnvManager.getLocalSettings(projectPath, {
        projectId: projectSettings.projectId,
      });

      chai.assert.isDefined(localSettings);
      chai.assert.isUndefined(localSettings!.teamsApp);
    });

    it("missing file", async () => {
      mockedEnvRestore = mockedEnv({ [FeatureFlagName.V3]: "false" });
      await fs.writeFile(
        path.resolve(configFolder, "projectSettings.json"),
        JSON.stringify(projectSettings0)
      );

      const projectSettings = await localEnvManager.getProjectSettings(projectPath);
      const localSettings = await localEnvManager.getLocalSettings(projectPath, {
        projectId: projectSettings.projectId,
      });

      chai.assert.isUndefined(localSettings);
    });
  });

  describe("getPortsFromProject()", () => {
    const sandbox = sinon.createSandbox();
    afterEach(() => {
      sandbox.restore();
    });
    it("tab + bot", async () => {
      const projectSettings = {
        appName: "",
        projectId: "",
        programmingLanguage: "javascript",
        solutionSettings: {
          name: "fx-solution-azure",
          hostType: "Azure",
          capabilities: ["Tab", "Bot"],
          activeResourcePlugins: ["fx-resource-frontend-hosting", "fx-resource-bot"],
        },
      };

      const ports = await localEnvManager.getPortsFromProject(
        projectPath,
        convertProjectSettingsV2ToV3(projectSettings, ".")
      );
      chai.assert.sameMembers(
        ports,
        [53000, 3978, 9239],
        `Expected [53000, 3978, 9239], actual ${ports}`
      );
    });
  });

  describe("getLocalEnvInfo()", () => {
    const sandbox = sinon.createSandbox();
    beforeEach(() => {
      sandbox.restore();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("getLocalEnvInfo() happy path", async () => {
      sandbox.stub(environmentManager, "loadEnvInfo").resolves(
        ok({
          envName: "local",
          config: {},
          state: { solution: { key: "value" } },
        })
      );
      const res = await localEnvManager.getLocalEnvInfo(projectPath, { projectId: "123" });
      chai.assert.isDefined(res);
      chai.assert.deepEqual(res, {
        envName: "local",
        config: {},
        state: { solution: { key: "value" } },
      });
    });
  });

  describe("resolveLocalCertificate", () => {
    beforeEach(() => {
      sinon.restore();
      mockFs.restore();
    });

    afterEach(() => {
      sinon.restore();
      mockFs.restore();
    });

    it("set env", async () => {
      const localCert: LocalCertificate = {
        certPath: "certPath",
        keyPath: "keyPath",
      };
      sinon
        .stub(LocalCertificateManager.prototype, "setupCertificate")
        .returns(Promise.resolve(localCert));
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
      const projectPath = "xxx";
      const localEnvProvider = new LocalEnvProvider(projectPath);
      const localEnvManager = new LocalEnvManager();
      const result = await localEnvManager.resolveLocalCertificate(
        projectPath,
        true,
        localEnvProvider
      );
      chai.assert.equal(result.certPath, localCert.certPath);
      chai.assert.equal(result.keyPath, localCert.keyPath);
      const expectedFrontendEnvs: LocalEnvs = {
        template: {
          [LocalEnvKeys.frontend.template.SslCrtFile]: localCert.certPath,
          [LocalEnvKeys.frontend.template.SslKeyFile]: localCert.keyPath,
        },
        teamsfx: {},
        customized: {},
      };
      chai.assert.deepEqual(frontendEnvs, expectedFrontendEnvs);
      sinon.restore();
    });
    it("set env for video filter", async () => {
      const projectPath = "xxx";
      mockFs({
        [path.join(projectPath, "app", ".env.teamsfx.local")]: "",
      });
      sinon.stub(tools, "isVideoFilterProject").callsFake(async (projectPath: string) => {
        return ok(true);
      });
      const localCert: LocalCertificate = {
        certPath: "certPath",
        keyPath: "keyPath",
      };
      sinon
        .stub(LocalCertificateManager.prototype, "setupCertificate")
        .returns(Promise.resolve(localCert));
      const localEnvProvider = new LocalEnvProvider(projectPath);
      const localEnvManager = new LocalEnvManager();
      const result = await localEnvManager.resolveLocalCertificate(
        projectPath,
        true,
        localEnvProvider
      );
      chai.assert.equal(result.certPath, localCert.certPath);
      chai.assert.equal(result.keyPath, localCert.keyPath);
      const expectedVideoFilterEnvs: LocalEnvs = {
        template: {
          [LocalEnvKeys.videoFilterApp.template.SslCrtFile]: localCert.certPath,
          [LocalEnvKeys.videoFilterApp.template.SslKeyFile]: localCert.keyPath,
        },
        teamsfx: {},
        customized: {},
      };

      const actualVideoFilterEnvs = await localEnvProvider.loadVideoFilterLocalEnvs();
      chai.assert.deepEqual(actualVideoFilterEnvs, expectedVideoFilterEnvs);
    });
  });
});
