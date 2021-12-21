// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { UserError } from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import { cloneDeep } from "lodash";
import * as path from "path";

import { localEnvManager } from "../../../src/common/local/localEnvManager";

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
      tabEndpoint: "https://localhost:3000",
    },
  };
  const projectPath = path.resolve(__dirname, "data");
  const configFolder = path.resolve(projectPath, ".fx/configs");

  beforeEach(() => {
    fs.ensureDirSync(path.resolve(__dirname, "data"));
  });

  describe("getLaunchInput()", () => {
    it("happy path", async () => {
      await fs.ensureDir(configFolder);
      await fs.emptyDir(configFolder);
      await fs.writeFile(
        path.resolve(configFolder, "localSettings.json"),
        JSON.stringify(localSettings0)
      );

      const launchInput = await localEnvManager.getLaunchInput(projectPath);

      chai.assert.isDefined(launchInput);
      chai.assert.deepEqual(launchInput, { appId: "33333333-3333-3333-3333-333333333333" });
    });

    it("missing field", async () => {
      await fs.ensureDir(configFolder);
      await fs.emptyDir(configFolder);
      await fs.writeFile(path.resolve(configFolder, "localSettings.json"), "{}");

      const launchInput = await localEnvManager.getLaunchInput(projectPath);

      chai.assert.isDefined(launchInput);
      chai.assert.deepEqual(launchInput, { appId: undefined });
    });

    it("missing file", async () => {
      await fs.ensureDir(configFolder);
      await fs.emptyDir(configFolder);

      const launchInput = await localEnvManager.getLaunchInput(projectPath);

      chai.assert.isDefined(launchInput);
      chai.assert.deepEqual(launchInput, { appId: undefined });
    });
  });

  describe("getProgrammingLanguage()", () => {
    it("happy path", async () => {
      await fs.ensureDir(configFolder);
      await fs.emptyDir(configFolder);
      await fs.writeFile(
        path.resolve(configFolder, "projectSettings.json"),
        JSON.stringify(projectSettings0)
      );

      const language = await localEnvManager.getProgrammingLanguage(projectPath);

      chai.assert.equal(language, "javascript");
    });

    it("missing field", async () => {
      await fs.ensureDir(configFolder);
      await fs.emptyDir(configFolder);
      await fs.writeFile(path.resolve(configFolder, "projectSettings.json"), "{}");

      const language = await localEnvManager.getProgrammingLanguage(projectPath);

      chai.assert.isUndefined(language);
    });
  });

  describe("getSkipNgrokConfig()", () => {
    it("happy path", async () => {
      await fs.ensureDir(configFolder);
      await fs.emptyDir(configFolder);
      const localSettingsBot: any = cloneDeep(localSettings0);
      localSettingsBot["bot"] = {
        skipNgrok: true,
      };
      await fs.writeFile(
        path.resolve(configFolder, "localSettings.json"),
        JSON.stringify(localSettingsBot)
      );

      const skipNgrok = await localEnvManager.getSkipNgrokConfig(projectPath);

      chai.assert.isTrue(skipNgrok);
    });

    it("missing field", async () => {
      await fs.ensureDir(configFolder);
      await fs.emptyDir(configFolder);
      await fs.writeFile(
        path.resolve(configFolder, "localSettings.json"),
        JSON.stringify(localSettings0)
      );

      const skipNgrok = await localEnvManager.getSkipNgrokConfig(projectPath);

      chai.assert.isFalse(skipNgrok);
    });

    it("missing file", async () => {
      await fs.ensureDir(configFolder);
      await fs.emptyDir(configFolder);

      const skipNgrok = await localEnvManager.getSkipNgrokConfig(projectPath);

      chai.assert.isFalse(skipNgrok);
    });
  });

  describe("getProjectSettings()", () => {
    it("happy path", async () => {
      await fs.ensureDir(configFolder);
      await fs.writeFile(
        path.resolve(configFolder, "projectSettings.json"),
        JSON.stringify(projectSettings0)
      );

      const projectSettings = await (localEnvManager as any).getProjectSettings(projectPath);

      chai.assert.isDefined(projectSettings);
      chai.assert.equal(projectSettings.appName, "unit-test0");
      chai.assert.equal(projectSettings.projectId, "11111111-1111-1111-1111-111111111111");
      chai.assert.equal(projectSettings.version, "2.0.0");
      chai.assert.equal(projectSettings.programmingLanguage, "javascript");
    });

    it("missing field", async () => {
      await fs.ensureDir(configFolder);
      await fs.writeFile(path.resolve(configFolder, "projectSettings.json"), "{}");

      const projectSettings = await (localEnvManager as any).getProjectSettings(projectPath);

      chai.assert.isDefined(projectSettings);
      chai.assert.isUndefined(projectSettings.appName);
      chai.assert.isUndefined(projectSettings.projectId);
    });

    it("missing file", async () => {
      await fs.ensureDir(configFolder);
      await fs.emptyDir(configFolder);

      let error: UserError | undefined = undefined;
      try {
        await (localEnvManager as any).getProjectSettings(projectPath);
      } catch (e: any) {
        error = e as UserError;
      }

      chai.assert.isDefined(error);
      chai.assert.equal(error!.name, "FileNotFoundError");
    });
  });

  describe("getLocalSettings()", () => {
    it("happy path", async () => {
      await fs.ensureDir(configFolder);
      await fs.writeFile(
        path.resolve(configFolder, "projectSettings.json"),
        JSON.stringify(projectSettings0)
      );
      await fs.writeFile(
        path.resolve(configFolder, "localSettings.json"),
        JSON.stringify(localSettings0)
      );

      const localSettings = await (localEnvManager as any).getLocalSettings(projectPath);

      chai.assert.isDefined(localSettings);
      chai.assert.isDefined(localSettings!.teamsApp);
      chai.assert.equal(localSettings!.teamsApp.tenantId, "22222222-2222-2222-2222-222222222222");
      chai.assert.equal(localSettings!.teamsApp.teamsAppId, "33333333-3333-3333-3333-333333333333");
      chai.assert.isDefined(localSettings!.auth);
      chai.assert.equal(localSettings!.auth.clientId, "44444444-4444-4444-4444-444444444444");
      chai.assert.equal(localSettings!.auth.clientSecret, "password-placeholder");
      chai.assert.isDefined(localSettings!.frontend);
      chai.assert.equal(localSettings!.frontend.tabDomain, "localhost");
      chai.assert.equal(localSettings!.frontend.tabEndpoint, "https://localhost:3000");
    });

    it("missing field", async () => {
      await fs.ensureDir(configFolder);
      await fs.writeFile(
        path.resolve(configFolder, "projectSettings.json"),
        JSON.stringify(projectSettings0)
      );
      await fs.writeFile(path.resolve(configFolder, "localSettings.json"), "{}");

      const localSettings = await (localEnvManager as any).getLocalSettings(projectPath);

      chai.assert.isDefined(localSettings);
      chai.assert.isUndefined(localSettings!.teamsApp);
    });

    it("missing file", async () => {
      await fs.ensureDir(configFolder);
      await fs.emptyDir(configFolder);
      await fs.writeFile(
        path.resolve(configFolder, "projectSettings.json"),
        JSON.stringify(projectSettings0)
      );

      const localSettings = await (localEnvManager as any).getLocalSettings(projectPath);

      chai.assert.isUndefined(localSettings);
    });
  });

  describe("getRawLocalSettings()", () => {
    it("happy path", async () => {
      await fs.ensureDir(configFolder);
      await fs.emptyDir(configFolder);
      await fs.writeFile(
        path.resolve(configFolder, "localSettings.json"),
        JSON.stringify(localSettings0)
      );

      const localSettings = await (localEnvManager as any).getRawLocalSettings(projectPath);

      chai.assert.isDefined(localSettings);
      chai.assert.isDefined(localSettings!.teamsApp);
      chai.assert.equal(localSettings!.teamsApp.tenantId, "22222222-2222-2222-2222-222222222222");
      chai.assert.equal(localSettings!.teamsApp.teamsAppId, "33333333-3333-3333-3333-333333333333");
      chai.assert.isDefined(localSettings!.auth);
      chai.assert.equal(localSettings!.auth.clientId, "44444444-4444-4444-4444-444444444444");
      chai.assert.isTrue((localSettings!.auth.clientSecret as string).startsWith("crypto_"));
      chai.assert.isDefined(localSettings!.frontend);
      chai.assert.equal(localSettings!.frontend.tabDomain, "localhost");
      chai.assert.equal(localSettings!.frontend.tabEndpoint, "https://localhost:3000");
    });
  });
});
