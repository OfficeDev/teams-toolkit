// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Xiaofu Huang <xiaofhua@microsoft.com>
 */
import "mocha";
import * as sinon from "sinon";
import chai from "chai";
import * as fs from "fs-extra";
import { cpUtils, DebugLogger } from "../../../src/common/deps-checker/util/cpUtils";
import { SpawnOptions } from "child_process";
import * as path from "path";
import * as uuid from "uuid";
import { ConfigFolderName } from "@microsoft/teamsfx-api";
import proxyquire from "proxyquire";
import { isLinux, isWindows } from "../../../src/common/deps-checker/util/system";

describe("Func Tools Checker Test", () => {
  const sandbox = sinon.createSandbox();
  const baseDir = path.resolve(__dirname, "test-data", "funcToolChecker");

  let testPath: string | undefined = undefined;

  afterEach(async () => {
    sandbox.restore();
    if (testPath) {
      await fs.remove(testPath);
    }
  });

  // it("symlink func installed", async () => {
  //   const testModule = await prepareTestEnv(
  //     testPath ?? "",
  //     "14.17.5",
  //     "4.0.5555",
  //     undefined,
  //     undefined,
  //     undefined
  //   );
  //   const funcToolChecker = new testModule.FuncToolChecker();
  //   const projectPath = path.resolve(testPath ?? "", "project");
  //   const res = await funcToolChecker.resolve({
  //     version: "4",
  //     projectPath: projectPath,
  //     symlinkDir: "./devTools/func",
  //   });
  //   console.log(JSON.stringify(res));
  //   chai.assert.isTrue(res.isInstalled);
  // });

  const platforms: ("Windows_NT" | "Darwin")[] = ["Windows_NT", "Darwin"];
  const npmVersions: ("6" | "7")[] = ["6", "7"];
  npmVersions.forEach((npmVersion) => {
    platforms.forEach((platform) => {
      const installNewFuncTestDataArr = [
        {
          message: "none func installed",
          historyPortableFuncVersion: undefined,
          portableFuncVersions: [],
          globalFuncVersion: undefined,
          expectedVersion: "4",
        },
        {
          message: "lower global func installed",
          historyPortableFuncVersion: undefined,
          portableFuncVersions: [],
          globalFuncVersion: "4.0.0",
          expectedVersion: "^4.0.2",
        },
        {
          message: "lower history func installed",
          historyPortableFuncVersion: "4.0.0",
          portableFuncVersions: [],
          globalFuncVersion: undefined,
          expectedVersion: "^4.0.2",
        },
        {
          message: "lower portable func installed",
          historyPortableFuncVersion: undefined,
          portableFuncVersions: ["4.0.0"],
          globalFuncVersion: undefined,
          expectedVersion: "^4.0.2",
        },
        {
          message: "lower global, portable and history func installed",
          historyPortableFuncVersion: "4.0.0",
          portableFuncVersions: ["4.0.0", "4.0.1"],
          globalFuncVersion: "3.0.0",
          expectedVersion: "^4.0.2",
        },
      ];
      installNewFuncTestDataArr.forEach((installNewFuncTestData) => {
        it(`install new portable func, ${installNewFuncTestData.message} - ${platform} npm${npmVersion}`, async () => {
          const mock = await prepareTestEnv(
            "4.0.5",
            installNewFuncTestData.historyPortableFuncVersion,
            installNewFuncTestData.portableFuncVersions,
            installNewFuncTestData.globalFuncVersion,
            "14.0.0",
            npmVersion,
            platform
          );
          const funcToolChecker = new mock.module.FuncToolChecker();
          const res = await funcToolChecker.resolve({
            version: installNewFuncTestData.expectedVersion,
            projectPath: mock.projectDir,
            symlinkDir: "./devTools/func",
          });
          chai.assert.deepEqual(res, {
            name: "Azure Functions Core Tools",
            type: "func-core-tools",
            isInstalled: true,
            command: "func",
            details: {
              isLinuxSupported: false,
              installVersion: "4.0.5",
              supportedVersions: [],
              binFolders: [path.resolve(mock.projectDir, "./devTools/func")],
            },
            error: undefined,
          });
          const stat = await fs.lstat(res.details.binFolders[0]);
          chai.assert.isTrue(stat.isSymbolicLink(), "isSymbolicLink");
          const funcVersion = await mockGetVersion(res.details.binFolders[0]);
          chai.assert.equal(funcVersion, "4.0.5");
          if (platform === "Windows_NT") {
            const isPs1Exist = await fs.pathExists(
              path.join(res.details.binFolders[0], "func.ps1")
            );
            chai.assert.isFalse(isPs1Exist, "isPs1Exist");
            const isFuncExist = await fs.pathExists(
              path.join(res.details.binFolders[0], "func.cmd")
            );
            chai.assert.isTrue(isFuncExist, "isFuncExist");
          } else {
            const isPs1Exist = await fs.pathExists(
              path.join(res.details.binFolders[0], "func.ps1")
            );
            chai.assert.isTrue(isPs1Exist, "isPs1Exist");
            const isFuncExist = await fs.pathExists(path.join(res.details.binFolders[0], "func"));
            chai.assert.isTrue(isFuncExist, "isFuncExist");
          }
        });
      });

      const useGlobalFuncTestDataArr = [
        {
          message: "none func installed",
          historyPortableFuncVersion: undefined,
          portableFuncVersions: [],
          globalFuncVersion: undefined,
          expectedVersion: "4",
        },
        {
          message: "lower global func installed",
          historyPortableFuncVersion: undefined,
          portableFuncVersions: [],
          globalFuncVersion: "4.0.0",
          expectedVersion: "^4.0.2",
        },
        {
          message: "lower history func installed",
          historyPortableFuncVersion: "4.0.0",
          portableFuncVersions: [],
          globalFuncVersion: undefined,
          expectedVersion: "^4.0.2",
        },
        {
          message: "lower portable func installed",
          historyPortableFuncVersion: undefined,
          portableFuncVersions: ["4.0.0"],
          globalFuncVersion: undefined,
          expectedVersion: "^4.0.2",
        },
        {
          message: "lower global, portable and history func installed",
          historyPortableFuncVersion: "4.0.0",
          portableFuncVersions: ["4.0.0", "4.0.1"],
          globalFuncVersion: "3.0.0",
          expectedVersion: "^4.0.2",
        },
      ];
      it(`use existing global func - ${platform}  npm${npmVersion}`, async () => {
        const mock = await prepareTestEnv(
          undefined,
          undefined,
          [],
          "4.0.2",
          "14.0.0",
          npmVersion,
          platform
        );
        const funcToolChecker = new mock.module.FuncToolChecker();
        const res = await funcToolChecker.resolve({
          version: "~4.0.1",
          projectPath: mock.projectDir,
          symlinkDir: "./devTools/func",
        });
        chai.assert.deepEqual(res, {
          name: "Azure Functions Core Tools",
          type: "func-core-tools",
          isInstalled: true,
          command: "func",
          details: {
            isLinuxSupported: false,
            installVersion: "4.0.2",
            supportedVersions: [],
            binFolders: undefined,
          },
          error: undefined,
        });
        const isSymbolicLink = await fs.pathExists(
          path.resolve(mock.projectDir, "./devTools/func")
        );
        chai.assert.isFalse(isSymbolicLink, "isSymbolicLink");
      });
    });
  });

  const prepareTestEnv = async (
    installFuncVersion: string | undefined,
    historyPortableFuncVersion: string | undefined,
    portableFuncVersions: string[],
    globalFuncVersion: string | undefined,
    nodeVersion: string | undefined,
    npmMajorVersion: "6" | "7" | undefined,
    osType: "Windows_NT" | "Darwin" | "Linux"
  ): Promise<{ module: any; projectDir: string; homeDir: string }> => {
    // Init test folder
    testPath = path.resolve(baseDir, uuid.v4().substring(0, 6));
    await fs.ensureDir(testPath);
    const homeDir = path.resolve(testPath, "homeDir");
    await fs.ensureDir(homeDir);
    const projectDir = path.resolve(testPath, "projectDir");
    await fs.ensureDir(projectDir);

    // Init history func
    if (npmMajorVersion) {
      if (historyPortableFuncVersion) {
        await mockInstallFunc(
          historyPortableFuncVersion,
          path.resolve(homeDir, `.${ConfigFolderName}`, "bin", "func"),
          npmMajorVersion,
          true,
          true
        );
      }

      for (const portableFuncVersion of portableFuncVersions) {
        await mockInstallFunc(
          portableFuncVersion,
          path.resolve(homeDir, `.${ConfigFolderName}`, "bin", "azfunc", portableFuncVersion),
          npmMajorVersion,
          true,
          false
        );
      }
    }

    const module = proxyquire("../../../src/common/deps-checker/internal/funcToolChecker", {
      os: {
        homedir: sandbox.stub().callsFake(() => {
          return homeDir;
        }),
      },
      "../util/system": {
        isWindows: () => osType === "Windows_NT",
        isLinux: () => osType === "Linux",
      },
    });

    sandbox
      .stub(cpUtils, "executeCommand")
      .callsFake(
        async (
          workingDirectory: string | undefined,
          logger: DebugLogger | undefined,
          options: SpawnOptions | undefined,
          command: string,
          ...args: string[]
        ) => {
          if (command === "node" && args.length == 1 && args[0] === "--version") {
            // Mock query node version
            if (!nodeVersion) {
              throw new Error("Mock node not installed.");
            }
            return `v${nodeVersion}`;
          } else if (/".+func"/.test(command) && args.length == 1 && args[0] === "--version") {
            // Mock query symlink func version
            return mockGetVersion(path.dirname(command.substring(1, command.length - 2)));
          } else if (
            command === "node" &&
            args.length == 2 &&
            args[0].endsWith('main.js"') &&
            args[1] === "--version"
          ) {
            // Mock query portable func version
            return mockGetVersion(
              path.resolve(args[0].substring(1, args[0].length - 2), "../../../../")
            );
          } else if (command === "func" && args.length == 1 && args[0] === "--version") {
            // Mock query global func version
            if (!globalFuncVersion) {
              throw new Error("Mock global func not installed.");
            }
            return globalFuncVersion;
          } else if (command === "npm" && args.length == 1 && args[0] === "--version") {
            // Mock query npm version
            if (!npmMajorVersion) {
              throw new Error("Mock npm not installed.");
            }
            return `${npmMajorVersion}.0.0`;
          } else if (args.length > 4 && args[0] === "install") {
            // Mock install func
            if (!installFuncVersion || !npmMajorVersion) {
              throw new Error("Mock install failed");
            }
            await mockInstallFunc(installFuncVersion, args[3], npmMajorVersion, false, false);
            return "";
          } else {
            throw new Error("Not mocked error");
          }
        }
      );
    return { module: module, projectDir: projectDir, homeDir: homeDir };
  };
});

async function mockInstallFunc(
  version: string,
  baseFolder: string,
  npmMajorVersion: "6" | "7",
  isExisting = true,
  isGlobal = false
) {
  await fs.ensureDir(baseFolder);
  if (npmMajorVersion === "6") {
    await fs.ensureFile(path.resolve(baseFolder, "func"));
    await fs.ensureFile(path.resolve(baseFolder, "func.cmd"));
    if (!isExisting) {
      await fs.ensureFile(path.resolve(baseFolder, "func.ps1"));
    }
  } else {
    await fs.ensureFile(path.resolve(baseFolder, "node_modules", ".bin", "func"));
    await fs.ensureFile(path.resolve(baseFolder, "node_modules", ".bin", "func.cmd"));
    await fs.writeJSON(path.resolve(baseFolder, "node_modules", ".bin", "version.json"), {
      version,
    });
    if (!isExisting) {
      await fs.ensureFile(path.resolve(baseFolder, "node_modules", ".bin", "func.ps1"));
    }
  }

  if (isExisting) {
    const funcSentinelPath = isGlobal
      ? path.resolve(baseFolder, "../../func-sentinel")
      : path.resolve(baseFolder, "func-sentinel");
    await fs.ensureFile(funcSentinelPath);
  }
  await fs.writeJSON(path.resolve(baseFolder, "version.json"), { version });
}

async function mockGetVersion(baseFolder: string): Promise<string> {
  try {
    const versionJson = await fs.readJSON(path.resolve(baseFolder, "version.json"));
    if (!versionJson?.version) {
      throw new Error("Failed to get func version");
    }
    return versionJson.version as string;
  } catch {
    throw new Error("Failed to get func version");
  }
}
