// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import chai from "chai";

import { ToolsInstallDriver } from "../../../../src/component/driver/prerequisite/installDriver";
import { MockedLogProvider, MockedUserInteraction } from "../../../plugins/solution/util";
import { DriverContext } from "../../../../src/component/driver/interface/commonArgs";
import { LocalCertificateManager } from "../../../../src/common/local/localCertificateManager";
import { UserError } from "@microsoft/teamsfx-api";
import { CoreSource } from "../../../../src/core/error";
import { InstallToolArgs } from "../../../../src/component/driver/prerequisite/interfaces/InstallToolArgs";
import { FuncToolChecker } from "../../../../src/common/deps-checker/internal/funcToolChecker";
import { DepsType } from "../../../../src/common/deps-checker/depsChecker";
import { DepsCheckerError } from "../../../../src/common/deps-checker/depsError";
import { DotnetChecker } from "../../../../src/common/deps-checker/internal/dotnetChecker";

describe("Tools Install Driver test", () => {
  const sandbox = sinon.createSandbox();
  const toolsInstallDriver = new ToolsInstallDriver();
  const mockedDriverContext = {
    logProvider: new MockedLogProvider(),
    ui: new MockedUserInteraction(),
  } as DriverContext;
  describe("Trust Cert test (run)", () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("Create and trust new local certificate", async () => {
      sandbox.stub(LocalCertificateManager.prototype, "setupCertificate").resolves({
        certPath: "testCertPath",
        keyPath: "testKeyPath",
        isTrusted: true,
        alreadyTrusted: false,
      });
      const res = await toolsInstallDriver.run({ devCert: { trust: true } }, mockedDriverContext);
      chai.assert.isTrue(res.isOk());
      if (res.isOk()) {
        chai.assert.includeDeepMembers(
          [
            ["SSL_CRT_FILE", "testCertPath"],
            ["SSL_KEY_FILE", "testKeyPath"],
          ],
          Array.from(res.value.entries())
        );
      }
    });

    it("Already trust local certificate", async () => {
      sandbox.stub(LocalCertificateManager.prototype, "setupCertificate").resolves({
        certPath: "testCertPath",
        keyPath: "testKeyPath",
        isTrusted: true,
        alreadyTrusted: true,
      });
      const res = await toolsInstallDriver.run({ devCert: { trust: true } }, mockedDriverContext);
      chai.assert.isTrue(res.isOk());
      if (res.isOk()) {
        chai.assert.includeDeepMembers(
          [
            ["SSL_CRT_FILE", "testCertPath"],
            ["SSL_KEY_FILE", "testKeyPath"],
          ],
          Array.from(res.value.entries())
        );
      }
    });

    it("Skip trust new local certificate", async () => {
      sandbox.stub(LocalCertificateManager.prototype, "setupCertificate").resolves({
        certPath: "testCertPath",
        keyPath: "testKeyPath",
        isTrusted: undefined,
        alreadyTrusted: undefined,
      });
      const res = await toolsInstallDriver.run({ devCert: { trust: false } }, mockedDriverContext);
      chai.assert.isTrue(res.isOk());
      if (res.isOk()) {
        chai.assert.isEmpty(res.value.entries());
      }
    });

    it("Failed to trust new local certificate", async () => {
      sandbox.stub(LocalCertificateManager.prototype, "setupCertificate").resolves({
        certPath: "testCertPath",
        keyPath: "testKeyPath",
        isTrusted: false,
        error: new UserError({
          error: new Error("test error"),
          source: CoreSource,
          name: "SetupCertificateError",
        }),
      });
      const res = await toolsInstallDriver.run({ devCert: { trust: true } }, mockedDriverContext);
      chai.assert.isTrue(res.isErr());
    });

    it("Invalid parameter", async () => {
      const res = await toolsInstallDriver.run(
        { devCert: { trust: "hello" } } as unknown as InstallToolArgs,
        mockedDriverContext
      );
      chai.assert.isTrue(res.isErr());
    });
  });

  describe("Func installation test (run)", () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("Install func", async () => {
      sandbox.stub(FuncToolChecker.prototype, "resolve").resolves({
        name: "Azure Functions Core Tools",
        type: DepsType.FuncCoreTools,
        isInstalled: true,
        command: "node ~/.fx/bin/func/node_modules/azure-functions-core-tools/lib/main.js",
        details: {
          isLinuxSupported: false,
          supportedVersions: ["4"],
          installVersion: "4",
          binFolders: ["~/.fx/bin/func/node_modules/.bin"],
        },
      });
      const res = await toolsInstallDriver.run({ func: true }, mockedDriverContext);
      chai.assert.isTrue(res.isOk());
      if (res.isOk()) {
        chai.assert.includeDeepMembers(
          [["FUNC_PATH", "~/.fx/bin/func/node_modules/.bin"]],
          Array.from(res.value.entries())
        );
      }
    });

    it("Failed to install func", async () => {
      sandbox.stub(FuncToolChecker.prototype, "resolve").resolves({
        name: "Azure Functions Core Tools",
        type: DepsType.FuncCoreTools,
        isInstalled: false,
        command: "node ~/.fx/bin/func/node_modules/azure-functions-core-tools/lib/main.js",
        details: {
          isLinuxSupported: false,
          supportedVersions: ["4"],
          installVersion: "4",
          binFolders: ["~/.fx/bin/func/node_modules/.bin"],
        },
        error: new DepsCheckerError("test message", "test link"),
      });
      const res = await toolsInstallDriver.run({ func: true }, mockedDriverContext);
      chai.assert.isTrue(res.isErr());
    });

    it("Install func with warning", async () => {
      sandbox.stub(FuncToolChecker.prototype, "resolve").resolves({
        name: "Azure Functions Core Tools",
        type: DepsType.FuncCoreTools,
        isInstalled: true,
        command: "node ~/.fx/bin/func/node_modules/azure-functions-core-tools/lib/main.js",
        details: {
          isLinuxSupported: false,
          supportedVersions: ["4"],
          installVersion: "4",
          binFolders: ["~/.fx/bin/func/node_modules/.bin"],
        },
        error: new DepsCheckerError("warning message", "test link"),
      });
      const res = await toolsInstallDriver.run({ func: true }, mockedDriverContext);
      chai.assert.isTrue(res.isOk());
      if (res.isOk()) {
        chai.assert.includeDeepMembers(
          [["FUNC_PATH", "~/.fx/bin/func/node_modules/.bin"]],
          Array.from(res.value.entries())
        );
      }
    });

    it("Invalid parameter", async () => {
      const res = await toolsInstallDriver.run(
        { func: { version: "hello" } } as unknown as InstallToolArgs,
        mockedDriverContext
      );
      chai.assert.isTrue(res.isErr());
    });
  });

  describe("Dotnet installation test (run)", () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("Install dotnet", async () => {
      sandbox.stub(DotnetChecker.prototype, "resolve").resolves({
        name: ".NET Core SDK",
        type: DepsType.Dotnet,
        isInstalled: true,
        command: "~/.fx/dotnet/dotnet.exe",
        details: {
          isLinuxSupported: false,
          installVersion: "3.1",
          supportedVersions: ["3.1", "5.0", "6.0"],
          binFolders: ["~/.fx/dotnet/dotnet.exe"],
        },
      });
      const res = await toolsInstallDriver.run({ dotnet: true }, mockedDriverContext);
      chai.assert.isTrue(res.isOk());
      if (res.isOk()) {
        chai.assert.includeDeepMembers(
          [["DOTNET_PATH", "~/.fx/dotnet"]],
          Array.from(res.value.entries())
        );
      }
    });

    it("Install dotnet: empty bin folders", async () => {
      sandbox.stub(DotnetChecker.prototype, "resolve").resolves({
        name: ".NET Core SDK",
        type: DepsType.Dotnet,
        isInstalled: true,
        command: "~/.fx/dotnet/dotnet.exe",
        details: {
          isLinuxSupported: false,
          installVersion: "3.1",
          supportedVersions: ["3.1", "5.0", "6.0"],
          binFolders: [],
        },
      });
      const res = await toolsInstallDriver.run({ dotnet: true }, mockedDriverContext);
      chai.assert.isTrue(res.isOk());
      if (res.isOk()) {
        chai.assert.includeDeepMembers([["DOTNET_PATH", ""]], Array.from(res.value.entries()));
      }
    });

    it("Install dotnet: undefined bin folders", async () => {
      sandbox.stub(DotnetChecker.prototype, "resolve").resolves({
        name: ".NET Core SDK",
        type: DepsType.Dotnet,
        isInstalled: true,
        command: "~/.fx/dotnet/dotnet.exe",
        details: {
          isLinuxSupported: false,
          installVersion: "3.1",
          supportedVersions: ["3.1", "5.0", "6.0"],
          binFolders: undefined,
        },
      });
      const res = await toolsInstallDriver.run({ dotnet: true }, mockedDriverContext);
      chai.assert.isTrue(res.isOk());
      if (res.isOk()) {
        chai.assert.includeDeepMembers([["DOTNET_PATH", ""]], Array.from(res.value.entries()));
      }
    });

    it("Failed to install dotnet", async () => {
      sandbox.stub(DotnetChecker.prototype, "resolve").resolves({
        name: ".NET Core SDK",
        type: DepsType.Dotnet,
        isInstalled: false,
        command: "~/.fx/dotnet/dotnet.exe",
        details: {
          isLinuxSupported: false,
          installVersion: "3.1",
          supportedVersions: ["3.1", "5.0", "6.0"],
          binFolders: ["~/.fx/dotnet/dotnet.exe"],
        },
        error: new DepsCheckerError("test message", "test link"),
      });
      const res = await toolsInstallDriver.run({ dotnet: true }, mockedDriverContext);
      chai.assert.isTrue(res.isErr());
    });

    it("Invalid parameter", async () => {
      const res = await toolsInstallDriver.run(
        { dotnet: { version: "hello" } } as unknown as InstallToolArgs,
        mockedDriverContext
      );
      chai.assert.isTrue(res.isErr());
    });
  });

  describe("Trust Cert test (execute)", () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("Create and trust new local certificate", async () => {
      sandbox.stub(LocalCertificateManager.prototype, "setupCertificate").resolves({
        certPath: "testCertPath",
        keyPath: "testKeyPath",
        isTrusted: true,
        alreadyTrusted: false,
      });
      const res = await toolsInstallDriver.execute(
        { devCert: { trust: true } },
        mockedDriverContext
      );
      chai.assert.isNotEmpty(res.summaries);
      chai.assert.isTrue(res.result.isOk());
      if (res.result.isOk()) {
        chai.assert.includeDeepMembers(
          [
            ["SSL_CRT_FILE", "testCertPath"],
            ["SSL_KEY_FILE", "testKeyPath"],
          ],
          Array.from(res.result.value.entries())
        );
      }
    });

    it("Already trust local certificate", async () => {
      sandbox.stub(LocalCertificateManager.prototype, "setupCertificate").resolves({
        certPath: "testCertPath",
        keyPath: "testKeyPath",
        isTrusted: true,
        alreadyTrusted: true,
      });
      const res = await toolsInstallDriver.execute(
        { devCert: { trust: true } },
        mockedDriverContext
      );
      chai.assert.isNotEmpty(res.summaries);
      chai.assert.isTrue(res.result.isOk());
      if (res.result.isOk()) {
        chai.assert.includeDeepMembers(
          [
            ["SSL_CRT_FILE", "testCertPath"],
            ["SSL_KEY_FILE", "testKeyPath"],
          ],
          Array.from(res.result.value.entries())
        );
      }
    });

    it("Skip trust new local certificate", async () => {
      sandbox.stub(LocalCertificateManager.prototype, "setupCertificate").resolves({
        certPath: "testCertPath",
        keyPath: "testKeyPath",
        isTrusted: undefined,
        alreadyTrusted: undefined,
      });
      const res = await toolsInstallDriver.execute(
        { devCert: { trust: false } },
        mockedDriverContext
      );
      chai.assert.isNotEmpty(res.summaries);
      chai.assert.isTrue(res.result.isOk());
      if (res.result.isOk()) {
        chai.assert.isEmpty(res.result.value.entries());
      }
    });

    it("Failed to trust new local certificate", async () => {
      sandbox.stub(LocalCertificateManager.prototype, "setupCertificate").resolves({
        certPath: "testCertPath",
        keyPath: "testKeyPath",
        isTrusted: false,
        error: new UserError({
          error: new Error("test error"),
          source: CoreSource,
          name: "SetupCertificateError",
        }),
      });
      const res = await toolsInstallDriver.execute(
        { devCert: { trust: true } },
        mockedDriverContext
      );
      chai.assert.isEmpty(res.summaries);
      chai.assert.isTrue(res.result.isErr());
    });

    it("Invalid parameter", async () => {
      const res = await toolsInstallDriver.execute(
        { devCert: { trust: "hello" } } as unknown as InstallToolArgs,
        mockedDriverContext
      );
      chai.assert.isEmpty(res.summaries);
      chai.assert.isTrue(res.result.isErr());
    });
  });

  describe("Func installation test (execute)", () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("Install func", async () => {
      sandbox.stub(FuncToolChecker.prototype, "resolve").resolves({
        name: "Azure Functions Core Tools",
        type: DepsType.FuncCoreTools,
        isInstalled: true,
        command: "node ~/.fx/bin/func/node_modules/azure-functions-core-tools/lib/main.js",
        details: {
          isLinuxSupported: false,
          supportedVersions: ["4"],
          installVersion: "4",
          binFolders: ["~/.fx/bin/func/node_modules/.bin"],
        },
      });
      const res = await toolsInstallDriver.execute({ func: true }, mockedDriverContext);
      chai.assert.isNotEmpty(res.summaries);
      chai.assert.isTrue(res.result.isOk());
      if (res.result.isOk()) {
        chai.assert.includeDeepMembers(
          [["FUNC_PATH", "~/.fx/bin/func/node_modules/.bin"]],
          Array.from(res.result.value.entries())
        );
      }
    });

    it("Failed to install func", async () => {
      sandbox.stub(FuncToolChecker.prototype, "resolve").resolves({
        name: "Azure Functions Core Tools",
        type: DepsType.FuncCoreTools,
        isInstalled: false,
        command: "node ~/.fx/bin/func/node_modules/azure-functions-core-tools/lib/main.js",
        details: {
          isLinuxSupported: false,
          supportedVersions: ["4"],
          installVersion: "4",
          binFolders: ["~/.fx/bin/func/node_modules/.bin"],
        },
        error: new DepsCheckerError("test message", "test link"),
      });
      const res = await toolsInstallDriver.execute({ func: true }, mockedDriverContext);
      chai.assert.isEmpty(res.summaries);
      chai.assert.isTrue(res.result.isErr());
    });

    it("Install func with warning", async () => {
      sandbox.stub(FuncToolChecker.prototype, "resolve").resolves({
        name: "Azure Functions Core Tools",
        type: DepsType.FuncCoreTools,
        isInstalled: true,
        command: "node ~/.fx/bin/func/node_modules/azure-functions-core-tools/lib/main.js",
        details: {
          isLinuxSupported: false,
          supportedVersions: ["4"],
          installVersion: "4",
          binFolders: ["~/.fx/bin/func/node_modules/.bin"],
        },
        error: new DepsCheckerError("warning message", "test link"),
      });
      const res = await toolsInstallDriver.execute({ func: true }, mockedDriverContext);
      chai.assert.isNotEmpty(res.summaries);
      chai.assert.isTrue(res.result.isOk());
      if (res.result.isOk()) {
        chai.assert.includeDeepMembers(
          [["FUNC_PATH", "~/.fx/bin/func/node_modules/.bin"]],
          Array.from(res.result.value.entries())
        );
      }
    });

    it("Invalid parameter", async () => {
      const res = await toolsInstallDriver.execute(
        { func: { version: "hello" } } as unknown as InstallToolArgs,
        mockedDriverContext
      );
      chai.assert.isEmpty(res.summaries);
      chai.assert.isTrue(res.result.isErr());
    });
  });

  describe("Dotnet installation test (execute)", () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("Install dotnet", async () => {
      sandbox.stub(DotnetChecker.prototype, "resolve").resolves({
        name: ".NET Core SDK",
        type: DepsType.Dotnet,
        isInstalled: true,
        command: "~/.fx/dotnet/dotnet.exe",
        details: {
          isLinuxSupported: false,
          installVersion: "3.1",
          supportedVersions: ["3.1", "5.0", "6.0"],
          binFolders: ["~/.fx/dotnet/dotnet.exe"],
        },
      });
      const res = await toolsInstallDriver.execute({ dotnet: true }, mockedDriverContext);
      chai.assert.isNotEmpty(res.summaries);
      chai.assert.isTrue(res.result.isOk());
      if (res.result.isOk()) {
        chai.assert.includeDeepMembers(
          [["DOTNET_PATH", "~/.fx/dotnet"]],
          Array.from(res.result.value.entries())
        );
      }
    });

    it("Install dotnet: empty bin folders", async () => {
      sandbox.stub(DotnetChecker.prototype, "resolve").resolves({
        name: ".NET Core SDK",
        type: DepsType.Dotnet,
        isInstalled: true,
        command: "~/.fx/dotnet/dotnet.exe",
        details: {
          isLinuxSupported: false,
          installVersion: "3.1",
          supportedVersions: ["3.1", "5.0", "6.0"],
          binFolders: [],
        },
      });
      const res = await toolsInstallDriver.execute({ dotnet: true }, mockedDriverContext);
      chai.assert.isNotEmpty(res.summaries);
      chai.assert.isTrue(res.result.isOk());
      if (res.result.isOk()) {
        chai.assert.includeDeepMembers(
          [["DOTNET_PATH", ""]],
          Array.from(res.result.value.entries())
        );
      }
    });

    it("Install dotnet: undefined bin folders", async () => {
      sandbox.stub(DotnetChecker.prototype, "resolve").resolves({
        name: ".NET Core SDK",
        type: DepsType.Dotnet,
        isInstalled: true,
        command: "~/.fx/dotnet/dotnet.exe",
        details: {
          isLinuxSupported: false,
          installVersion: "3.1",
          supportedVersions: ["3.1", "5.0", "6.0"],
          binFolders: undefined,
        },
      });
      const res = await toolsInstallDriver.execute({ dotnet: true }, mockedDriverContext);
      chai.assert.isNotEmpty(res.summaries);
      chai.assert.isTrue(res.result.isOk());
      if (res.result.isOk()) {
        chai.assert.includeDeepMembers(
          [["DOTNET_PATH", ""]],
          Array.from(res.result.value.entries())
        );
      }
    });

    it("Failed to install dotnet", async () => {
      sandbox.stub(DotnetChecker.prototype, "resolve").resolves({
        name: ".NET Core SDK",
        type: DepsType.Dotnet,
        isInstalled: false,
        command: "~/.fx/dotnet/dotnet.exe",
        details: {
          isLinuxSupported: false,
          installVersion: "3.1",
          supportedVersions: ["3.1", "5.0", "6.0"],
          binFolders: ["~/.fx/dotnet/dotnet.exe"],
        },
        error: new DepsCheckerError("test message", "test link"),
      });
      const res = await toolsInstallDriver.execute({ dotnet: true }, mockedDriverContext);
      chai.assert.isEmpty(res.summaries);
      chai.assert.isTrue(res.result.isErr());
    });

    it("Invalid parameter", async () => {
      const res = await toolsInstallDriver.execute(
        { dotnet: { version: "hello" } } as unknown as InstallToolArgs,
        mockedDriverContext
      );
      chai.assert.isTrue(res.result.isErr());
      chai.assert.isEmpty(res.summaries);
      chai.assert.isTrue(res.result.isErr());
    });
  });
});
