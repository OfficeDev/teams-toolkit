// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import { expect } from "chai";
import * as sinon from "sinon";
import * as path from "path";
import * as url from "url";
import * as os from "os";
import mockfs from "mock-fs";
import cp from "child_process";
import { cpUtils } from "../../../src/common/deps-checker/util/cpUtils";
import { TestToolChecker } from "../../../src/common/deps-checker/internal/testToolChecker";
import * as fileHelper from "../../../src/common/deps-checker/util/fileHelper";
import { DepsCheckerError } from "../../../src/common/deps-checker/depsError";

function isAncesterDir(parent: string, dir: string) {
  const relative = path.relative(parent, dir);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function pathSplit(p: string) {
  return p.split(/[\/\\]+/);
}

describe("Test Tool Checker Test", () => {
  const sandbox = sinon.createSandbox();
  const projectPath = "projectPath";
  const homePortablesDir = path.join(os.homedir(), ".fx", "bin", "testTool");

  afterEach(async () => {
    sandbox.restore();
    mockfs.restore();
  });

  describe("Clean install", () => {
    it("Not installed", async () => {
      const checker = new TestToolChecker();
      const symlinkDir = "symlinkDir";
      const versionRange = "~1.2.3";
      let npmInstalled = false;
      sandbox.stub(fileHelper, "rename").resolves();
      sandbox.stub(fileHelper, "createSymlink").resolves();
      sandbox
        .stub(cpUtils, "executeCommand")
        .callsFake(async (_cwd, _logger, _options, command, ...args) => {
          if (args.includes("--version")) {
            if (npmInstalled) {
              return "1.2.3";
            } else {
              throw new Error("not installed");
            }
          } else if (args.includes("install")) {
            npmInstalled = true;
          }
          return "";
        });

      // Act
      const status = await checker.resolve({ projectPath, symlinkDir, versionRange });

      // Assert
      expect(status.isInstalled).to.be.true;
      expect(status.details.binFolders).not.empty;
      expect(status.error).to.be.undefined;
      expect(npmInstalled).to.be.true;
    });
  });

  describe("Already installed", () => {
    it("Already installed and symlink created", async () => {
      const checker = new TestToolChecker();
      const symlinkDir = "symlinkDir";
      const versionRange = "~1.2.3";
      let npmInstalled = false;
      sandbox
        .stub(cpUtils, "executeCommand")
        .callsFake(async (_cwd, _logger, _options, command, ...args) => {
          if (args.includes("--version")) {
            return "1.2.3";
          } else if (args.includes("install")) {
            npmInstalled = true;
          }
          return "";
        });

      // Act
      const status = await checker.resolve({ projectPath, symlinkDir, versionRange });

      // Assert
      expect(status.isInstalled).to.be.true;
      expect(status.details.binFolders).not.empty;
      expect(status.error).to.be.undefined;
      expect(npmInstalled).to.be.false;
    });

    it("Already installed in home", async () => {
      const checker = new TestToolChecker();
      const symlinkDir = "symlinkDir";
      const versionRange = "~1.2.3";
      let npmInstalled = false;
      const homePortableDir = path.join(os.homedir(), ".fx", "bin", "testTool", "1.2.3");
      const homePortableExec = path.join(homePortableDir, "node_modules", ".bin", "teamsapptester");
      mockfs({
        [homePortableExec]: "",
      });

      let linkTarget = "";
      sandbox.stub(fileHelper, "createSymlink").callsFake(async (target, _linkFilePath) => {
        linkTarget = target;
      });
      sandbox
        .stub(cpUtils, "executeCommand")
        .callsFake(async (_cwd, _logger, _options, command, ...args) => {
          command = command.replace(/^"|'/, "").replace(/"|'$/, ""); // trim quotes
          if (args.includes("--version")) {
            if (command.includes(projectPath)) {
              throw new Error("not installed");
            } else if (isAncesterDir(homePortableDir, command)) {
              return "1.2.3";
            }
          } else if (args.includes("install")) {
            npmInstalled = true;
          }
          return "";
        });

      // Act
      const status = await checker.resolve({ projectPath, symlinkDir, versionRange });

      // Assert
      expect(status.isInstalled).to.be.true;
      expect(status.details.binFolders).not.empty;
      expect(status.error).to.be.undefined;
      expect(npmInstalled).to.be.false;
      expect(path.resolve(linkTarget)).to.equal(path.resolve(homePortableDir));
    });

    it("Already installed in home multiple versions, should use more recent version", async () => {
      const checker = new TestToolChecker();
      const symlinkDir = "symlinkDir";
      const versionRange = "~1.2.3";
      const homePortableDir123 = path.join(homePortablesDir, "1.2.3");
      const homePortableExec123 = path.join(
        homePortableDir123,
        "node_modules",
        ".bin",
        "teamsapptester"
      );
      const homePortableDir124 = path.join(homePortablesDir, "1.2.4");
      const homePortableExec124 = path.join(
        homePortableDir124,
        "node_modules",
        ".bin",
        "teamsapptester"
      );
      mockfs({
        [homePortableExec123]: "",
        [homePortableExec124]: "",
      });

      let linkTarget = "";
      sandbox.stub(fileHelper, "createSymlink").callsFake(async (target, _linkFilePath) => {
        linkTarget = target;
      });
      sandbox
        .stub(cpUtils, "executeCommand")
        .callsFake(async (_cwd, _logger, _options, command, ...args) => {
          command = command.replace(/^"|'/, "").replace(/"|'$/, ""); // trim quotes
          if (args.includes("--version")) {
            if (command.includes(projectPath)) {
              throw new Error("not installed");
            } else if (isAncesterDir(homePortablesDir, command)) {
              const relPath = path.relative(homePortablesDir, command);
              const dirNames = pathSplit(relPath);
              const version = dirNames[0];
              return version;
            }
          } else if (args.includes("install")) {
            throw new Error("Should not install");
          }
          return "";
        });

      // Act
      const status = await checker.resolve({ projectPath, symlinkDir, versionRange });

      // Assert
      expect(status.isInstalled).to.be.true;
      expect(status.details.binFolders).not.empty;
      expect(status.error).to.be.undefined;
      expect(path.resolve(linkTarget)).to.equal(path.resolve(homePortableDir124));
    });

    it("Already installed globally", async () => {
      const checker = new TestToolChecker();
      const versionRange = "~1.2.3";
      const symlinkDir = "symlinkDir";

      const createSymlinkStub = sandbox.stub(fileHelper, "createSymlink");
      sandbox
        .stub(cpUtils, "executeCommand")
        .callsFake(async (_cwd, _logger, _options, command, ...args) => {
          command = command.replace(/^"|'/, "").replace(/"|'$/, ""); // trim quotes
          if (args.includes("--version")) {
            if (command.includes(projectPath)) {
              throw new Error("not installed");
            } else if (isAncesterDir(homePortablesDir, command)) {
              const relPath = path.relative(homePortablesDir, command);
              const dirNames = pathSplit(relPath);
              const version = dirNames[0];
              return version;
            } else if (command.startsWith("teamsapptester")) {
              // global check
              return "1.2.3";
            }
          } else if (args.includes("install")) {
            throw new Error("Should not install");
          }
          return "";
        });

      // Act
      const status = await checker.resolve({ projectPath, symlinkDir, versionRange });

      // Assert
      expect(status.isInstalled).to.be.true;
      expect(status.details.binFolders).to.be.empty;
      expect(status.error).to.be.undefined;
      expect(createSymlinkStub.notCalled);
    });
  });

  describe("Installed but version not match", () => {
    it("Installed and symlink created but version not match", async () => {
      const checker = new TestToolChecker();
      const symlinkDir = "symlinkDir";
      const versionRange = "~1.2.3";
      let npmInstalled = false;
      sandbox.stub(fileHelper, "rename").resolves();
      sandbox.stub(fileHelper, "createSymlink").resolves();
      sandbox
        .stub(cpUtils, "executeCommand")
        .callsFake(async (_cwd, _logger, _options, command, ...args) => {
          if (args.includes("--version")) {
            if (npmInstalled) {
              return "1.2.3";
            } else {
              return "1.2.2";
            }
          } else if (args.includes("install")) {
            npmInstalled = true;
          }
          return "";
        });

      // Act
      const status = await checker.resolve({ projectPath, symlinkDir, versionRange });

      // Assert
      expect(status.isInstalled).to.be.true;
      expect(status.details.binFolders).not.empty;
      expect(status.error).to.be.undefined;
      expect(npmInstalled).to.be.true;
    });
    it("Already installed in home, but version not match", async () => {
      const checker = new TestToolChecker();
      const symlinkDir = "symlinkDir";
      const versionRange = "~1.2.4";
      let npmInstalled = false;
      const homePortableDir123 = path.join(homePortablesDir, "1.2.3");
      const homePortableExec123 = path.join(
        homePortableDir123,
        "node_modules",
        ".bin",
        "teamsapptester"
      );
      const homePortableDir124 = path.join(homePortablesDir, "1.2.4");
      mockfs({
        [homePortableExec123]: "",
      });

      let linkTarget = "";
      sandbox.stub(fileHelper, "createSymlink").callsFake(async (target, _linkFilePath) => {
        linkTarget = target;
      });
      sandbox.stub(fileHelper, "rename").resolves();
      sandbox
        .stub(cpUtils, "executeCommand")
        .callsFake(async (_cwd, _logger, _options, command, ...args) => {
          command = command.replace(/^"|'/, "").replace(/"|'$/, ""); // trim quotes
          if (args.includes("--version")) {
            if (command.includes(projectPath)) {
              if (npmInstalled) {
                return "1.2.4";
              }
              throw new Error("not installed");
            } else if (isAncesterDir(homePortablesDir, command)) {
              const relPath = path.relative(homePortablesDir, command);
              const dirNames = pathSplit(relPath);
              const version = dirNames[0];
              if (version.startsWith("tmp")) {
                return "1.2.4";
              }
              return version;
            }
          } else if (args.includes("install")) {
            npmInstalled = true;
          }
          return "";
        });

      // Act
      const status = await checker.resolve({ projectPath, symlinkDir, versionRange });

      // Assert
      expect(status.isInstalled).to.be.true;
      expect(status.details.binFolders).not.empty;
      expect(status.error).to.be.undefined;
      expect(path.resolve(linkTarget)).to.equal(path.resolve(homePortableDir124));
    });
  });

  describe("Corner cases", () => {
    it("Failed to install", async () => {
      const checker = new TestToolChecker();
      const symlinkDir = "symlinkDir";
      const versionRange = "~1.2.3";
      sandbox.stub(fileHelper, "rename").resolves();
      sandbox.stub(fileHelper, "createSymlink").resolves();
      sandbox
        .stub(cpUtils, "executeCommand")
        .callsFake(async (_cwd, _logger, _options, command, ...args) => {
          if (args.includes("--version")) {
            throw new Error("not installed");
          } else if (args.includes("install")) {
            throw new Error("install error");
          }
          return "";
        });

      // Act
      const status = await checker.resolve({ projectPath, symlinkDir, versionRange });

      // Assert
      expect(status.isInstalled).to.be.false;
      expect(status.details.binFolders).to.be.empty;
      expect(status.error).instanceOf(DepsCheckerError);
    });

    it("Special characters in tgz path", async () => {
      const checker = new TestToolChecker();
      const symlinkDir = "symlinkDir";
      const versionRange = "~1.2.3";
      const mockProjectPath = "./projectPath";
      mockfs({
        [path.join(mockProjectPath, "microsoft-teams-app-test-tool-cli-1.2.3.tgz")]: "",
      });
      let installArgs: string[] = [];
      sandbox.stub(fileHelper, "rename").resolves();
      sandbox.stub(fileHelper, "createSymlink").resolves();
      sandbox
        .stub(cpUtils, "executeCommand")
        .callsFake(async (_cwd, _logger, _options, command, ...args) => {
          if (args.includes("--version")) {
            throw new Error("not installed");
          } else if (args.includes("install")) {
            installArgs = args;
          }
          return "";
        });

      // Act
      await checker.resolve({ projectPath, symlinkDir, versionRange });

      // Assert
      const fileArg = installArgs.filter((arg) =>
        arg.includes("microsoft-teams-app-test-tool-cli")
      )[0];
      expect(fileArg).not.empty;
      let parsed: url.URL | undefined;
      expect(() => {
        parsed = new url.URL(fileArg);
      }).not.throw();
      expect(parsed).not.undefined;
      expect(parsed?.protocol).equals("file:");
    });

    it("Install timeout", async () => {
      const clock = sinon.useFakeTimers();
      after(() => clock.restore());
      const checker = new TestToolChecker();

      const symlinkDir = "symlinkDir";
      const versionRange = "~1.2.3";
      sandbox.stub(fileHelper, "rename").resolves();
      sandbox.stub(fileHelper, "createSymlink").resolves();
      const oldExecuteCommand = cpUtils.executeCommand;
      sandbox.stub(cp, "spawn").callsFake(() => {
        const events: { [key: string]: any } = {};
        // return a stub for ChildProcess
        return {
          kill: () => {
            events["error"]?.(new Error("timeout"));
            return true;
          },
          on: (event: string, cb: unknown) => {
            events[event] = cb;
          },
        } as any as cp.ChildProcess;
      });
      sandbox
        .stub(cpUtils, "executeCommand")
        .callsFake(async (_cwd, _logger, _options, command, ...args) => {
          if (args.includes("--version")) {
            throw new Error("not installed");
          } else if (args.includes("install")) {
            const promise = oldExecuteCommand(_cwd, _logger, _options, command, ...args);
            // tick the clock before execute command
            clock.tick(5 * 60 * 1000 + 10);
            return await promise;
          }
          return "";
        });

      // Act
      const status = await checker.resolve({ projectPath, symlinkDir, versionRange });

      // Assert
      expect(status.isInstalled).to.be.false;
      expect(status.details.binFolders).to.be.empty;
      expect(status.error).instanceOf(DepsCheckerError);
    });
  });
});
