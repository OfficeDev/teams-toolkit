// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { UserError, Result, ok } from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as path from "path";

import { LocalEnvManager } from "../../../src/common/local/localEnvManager";
import { DepsInfo, DepsType } from "../../../src/common/deps-checker/depsChecker";
import sinon from "sinon";
import { DotnetChecker } from "../../../src/common/deps-checker/internal/dotnetChecker";
import { NgrokChecker } from "../../../src/common/deps-checker/internal/ngrokChecker";
import { FuncToolChecker } from "../../../src/common/deps-checker/internal/funcToolChecker";
import { DepsCheckerError } from "../../../src/common/deps-checker/depsError";

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
    it("happy path", async () => {
      await fs.ensureDir(configFolder);
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
      await fs.ensureDir(configFolder);
      await fs.writeFile(path.resolve(configFolder, "projectSettings.json"), "{}");

      const projectSettings = await localEnvManager.getProjectSettings(projectPath);

      chai.assert.isDefined(projectSettings);
      chai.assert.isUndefined(projectSettings.appName);
      chai.assert.isUndefined(projectSettings.projectId);
    });

    it("missing file", async () => {
      await fs.ensureDir(configFolder);
      await fs.emptyDir(configFolder);

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
      await fs.ensureDir(configFolder);
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
      await fs.ensureDir(configFolder);
      await fs.emptyDir(configFolder);
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

  const testData: { message: string; activeResourcePlugins: string[]; depsTypes: DepsType[] }[] = [
    {
      message: "tab",
      activeResourcePlugins: [
        "fx-resource-frontend-hosting",
        "fx-resource-aad-app-for-teams",
        "fx-resource-simple-auth",
      ],
      depsTypes: [DepsType.Dotnet],
    },
    {
      message: "tab + function",
      activeResourcePlugins: [
        "fx-resource-frontend-hosting",
        "fx-resource-aad-app-for-teams",
        "fx-resource-simple-auth",
        "fx-resource-function",
      ],
      depsTypes: [DepsType.Dotnet, DepsType.FuncCoreTools],
    },
    {
      message: "bot",
      activeResourcePlugins: ["fx-resource-bot", "fx-resource-aad-app-for-teams"],
      depsTypes: [DepsType.Ngrok],
    },
    {
      message: "tab + bot",
      activeResourcePlugins: [
        "fx-resource-frontend-hosting",
        "fx-resource-aad-app-for-teams",
        "fx-resource-simple-auth",
        "fx-resource-bot",
      ],
      depsTypes: [DepsType.Dotnet, DepsType.Ngrok],
    },
    {
      message: "spfx",
      activeResourcePlugins: ["fx-resource-spfx"],
      depsTypes: [],
    },
  ];

  describe("checkDependencies()", () => {
    const sandbox = sinon.createSandbox();
    afterEach(() => {
      sandbox.restore();
    });

    testData.forEach((data) => {
      it(data.message, async () => {
        const projectSettings = {
          appName: "",
          projectId: "",
          solutionSettings: {
            name: "",
            activeResourcePlugins: data.activeResourcePlugins,
          },
        };
        const isInstallStubs = stubIsInstall(sandbox);
        await localEnvManager.checkDependencies(projectSettings);
        assertStubIsCalled(data.depsTypes, isInstallStubs);
      });
    });
  });

  describe("checkAndResolveDependencies()", () => {
    const sandbox = sinon.createSandbox();
    afterEach(() => {
      sandbox.restore();
    });

    testData.forEach((data) => {
      it(data.message, async () => {
        const projectSettings = {
          appName: "",
          projectId: "",
          solutionSettings: {
            name: "",
            activeResourcePlugins: data.activeResourcePlugins,
          },
        };
        const resolveStubs = stubResolve(sandbox);
        const getDepsInfoStubs = stubGetDepsInfo(sandbox);
        const commandStubs = stubCommand(sandbox);
        await localEnvManager.checkAndResolveDependencies(projectSettings);
        assertStubIsCalled(data.depsTypes, resolveStubs);
        assertStubIsCalled(data.depsTypes, getDepsInfoStubs);
        assertStubIsCalled(data.depsTypes, commandStubs);
      });
    });
  });
});

const checkerMapping = [
  { checker: DotnetChecker, type: DepsType.Dotnet },
  { checker: NgrokChecker, type: DepsType.Ngrok },
  { checker: FuncToolChecker, type: DepsType.FuncCoreTools },
];

function stubIsInstall(sandbox: sinon.SinonSandbox) {
  return checkerMapping.map(({ checker, type }) => {
    return {
      type: type,
      stub: sandbox.stub(checker.prototype, "isInstalled").callsFake(async () => {
        return true;
      }),
    };
  });
}

function stubResolve(sandbox: sinon.SinonSandbox) {
  return checkerMapping.map(({ checker, type }) => {
    return {
      type: type,
      stub: sandbox
        .stub(checker.prototype, "resolve")
        .callsFake(async (): Promise<Result<boolean, DepsCheckerError>> => {
          return ok(true);
        }),
    };
  });
}

function stubCommand(sandbox: sinon.SinonSandbox) {
  return checkerMapping.map(({ checker, type }) => {
    return {
      type: type,
      stub: sandbox.stub(checker.prototype, "command").callsFake(async (): Promise<string> => {
        return "";
      }),
    };
  });
}

function stubGetDepsInfo(sandbox: sinon.SinonSandbox) {
  return checkerMapping.map(({ checker, type }) => {
    return {
      type: type,
      stub: sandbox
        .stub(checker.prototype, "getDepsInfo")
        .callsFake(async (): Promise<DepsInfo> => {
          return {
            name: "",
            isLinuxSupported: false,
            supportedVersions: [],
            details: new Map<string, string>(),
          };
        }),
    };
  });
}

function assertStubIsCalled(
  expectedDepsTypes: DepsType[],
  stubs: {
    type: DepsType;
    stub: sinon.SinonStub<[], Promise<any>>;
  }[]
) {
  stubs.forEach((stub) => {
    if (expectedDepsTypes.includes(stub.type)) {
      chai.assert.isTrue(stub.stub.calledOnce, `Assert ${stub.type} stub called once.`);
    } else {
      chai.assert.isTrue(stub.stub.notCalled, `Assert ${stub.type} stub not called.`);
    }
  });
}
