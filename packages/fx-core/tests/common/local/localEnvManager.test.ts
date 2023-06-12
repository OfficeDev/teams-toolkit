// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { UserError, ok } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as tools from "../../../src/common/tools";
import { LocalEnvManager } from "../../../src/common/local/localEnvManager";
import sinon from "sinon";
import { environmentManager } from "../../../src/core/environment";
import { convertProjectSettingsV2ToV3 } from "../../../src/component/migrate";
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
});
