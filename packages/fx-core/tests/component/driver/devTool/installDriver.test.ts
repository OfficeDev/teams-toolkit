// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import chai from "chai";

import { ToolsInstallDriver } from "../../../../src/component/driver/devTool/installDriver";
import { MockedLogProvider, MockedUserInteraction } from "../../../plugins/solution/util";
import { LocalCertificateManager } from "../../../../src/common/local/localCertificateManager";
import { UserError } from "@microsoft/teamsfx-api";
import { CoreSource } from "../../../../src/core/error";
import { InstallToolArgs } from "../../../../src/component/driver/devTool/interfaces/InstallToolArgs";
import { FuncToolChecker } from "../../../../src/common/deps-checker/internal/funcToolChecker";
import { DepsType } from "../../../../src/common/deps-checker/depsChecker";
import { DepsCheckerError } from "../../../../src/common/deps-checker/depsError";
import { DotnetChecker } from "../../../../src/common/deps-checker/internal/dotnetChecker";

describe("Tools Install Driver test", () => {
  const sandbox = sinon.createSandbox();
  const toolsInstallDriver = new ToolsInstallDriver();
  const mockedDriverContext: any = {
    logProvider: new MockedLogProvider(),
    ui: new MockedUserInteraction(),
  };

  describe("Trust Cert test (run)", () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("TEST1", async () => {
      sandbox.stub(LocalCertificateManager.prototype, "setupCertificate").resolves({
        certPath: "testCertPath",
        keyPath: "testKeyPath",
        isTrusted: true,
        alreadyTrusted: false,
      });
      const res = await toolsInstallDriver.run({ devCert: { trust: true } }, mockedDriverContext);
      chai.assert.isTrue(res.isOk());
      if (res.isOk()) {
        chai.assert.isEmpty(res.value);
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
        chai.assert.isEmpty(res.value);
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
        command: "func",
        details: {
          isLinuxSupported: false,
          supportedVersions: [],
          installVersion: "4.0.0",
          binFolders: ["./devTools/func"],
        },
      });
      const res = await toolsInstallDriver.run(
        { func: { version: "4", symlinkDir: "./devTools/func" } },
        mockedDriverContext
      );
      chai.assert.isTrue(res.isOk());
      if (res.isOk()) {
        chai.assert.isEmpty(res.value);
      }
    });

    it("Install func without symlinkDir", async () => {
      sandbox.stub(FuncToolChecker.prototype, "resolve").resolves({
        name: "Azure Functions Core Tools",
        type: DepsType.FuncCoreTools,
        isInstalled: true,
        command: "func",
        details: {
          isLinuxSupported: false,
          supportedVersions: [],
          installVersion: "4.0.0",
          binFolders: ["~/.fx/bin/func/node_modules/azure-functions-core-tools/bin"],
        },
      });
      const res = await toolsInstallDriver.run({ func: { version: "4" } }, mockedDriverContext);
      chai.assert.isTrue(res.isOk());
      if (res.isOk()) {
        chai.assert.isEmpty(res.value);
      }
    });

    it("Failed to install func", async () => {
      sandbox.stub(FuncToolChecker.prototype, "resolve").resolves({
        name: "Azure Functions Core Tools",
        type: DepsType.FuncCoreTools,
        isInstalled: false,
        command: "func",
        details: {
          isLinuxSupported: false,
          supportedVersions: [],
          installVersion: "4.0.0",
          binFolders: undefined,
        },
        error: new DepsCheckerError("test message", "test link"),
      });
      const res = await toolsInstallDriver.run(
        { func: { version: 4, symlinkDir: "./devTools/func" } },
        mockedDriverContext
      );
      chai.assert.isTrue(res.isErr());
    });

    it("Install func with warning", async () => {
      sandbox.stub(FuncToolChecker.prototype, "resolve").resolves({
        name: "Azure Functions Core Tools",
        type: DepsType.FuncCoreTools,
        isInstalled: true,
        command: "func",
        details: {
          isLinuxSupported: false,
          supportedVersions: [],
          installVersion: "4.0.0",
          binFolders: ["/devTools/func1"],
        },
        telemetryProperties: {
          "global-func-version": "3.0.0",
        },
        error: new DepsCheckerError("warning message", "test link"),
      });
      const res = await toolsInstallDriver.run(
        { func: { version: "4", symlinkDir: "./devTools/func1" } },
        mockedDriverContext
      );
      chai.assert.isTrue(res.isOk());
      if (res.isOk()) {
        chai.assert.isEmpty(res.value);
      }
    });

    const invalidParams: any[] = [
      { version: "hello" },
      false,
      { hello: "hello" },
      { version: "#2", symlinkDir: "./devTools" },
      { version: "#2", symlinkDir: 123 },
      { symlinkDir: 123 },
    ];
    invalidParams.forEach((invalidParam: any) => {
      it(`Invalid parameter - ${JSON.stringify(invalidParam)}`, async () => {
        sandbox.stub(FuncToolChecker.prototype, "resolve").resolves({
          name: "Azure Functions Core Tools",
          type: DepsType.FuncCoreTools,
          isInstalled: true,
          command: "func",
          details: {
            isLinuxSupported: false,
            supportedVersions: [],
            installVersion: "4.0.0",
            binFolders: ["./devTools/func"],
          },
        });
        const res = await toolsInstallDriver.run(
          { func: invalidParam } as unknown as InstallToolArgs,
          mockedDriverContext
        );
        chai.assert.isTrue(res.isErr());
      });
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
        chai.assert.isEmpty(res.value);
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
        chai.assert.isEmpty(res.value);
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
        chai.assert.isEmpty(res.value);
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
      const outputEnvVarNames = new Map([
        ["sslCertFile", "MY_SSL_CRT_FILE"],
        ["sslKeyFile", "MY_SSL_KEY_FILE"],
      ]);
      const res = await toolsInstallDriver.execute(
        { devCert: { trust: true } },
        mockedDriverContext,
        outputEnvVarNames
      );
      chai.assert.isNotEmpty(res.summaries);
      chai.assert.isTrue(res.result.isOk());
      if (res.result.isOk()) {
        chai.assert.includeDeepMembers(Array.from(res.result.value.entries()), [
          ["MY_SSL_CRT_FILE", "testCertPath"],
          ["MY_SSL_KEY_FILE", "testKeyPath"],
        ]);
      }
    });

    it("Create and trust new local certificate: empty outputEnvVarNames", async () => {
      sandbox.stub(LocalCertificateManager.prototype, "setupCertificate").resolves({
        certPath: "testCertPath",
        keyPath: "testKeyPath",
        isTrusted: true,
        alreadyTrusted: false,
      });
      const outputEnvVarNames = new Map();
      const res = await toolsInstallDriver.execute(
        { devCert: { trust: true } },
        mockedDriverContext,
        outputEnvVarNames
      );
      chai.assert.isNotEmpty(res.summaries);
      chai.assert.isTrue(res.result.isOk());
      if (res.result.isOk()) {
        chai.assert.isEmpty(res.result.value);
      }
    });

    it("Already trust local certificate", async () => {
      sandbox.stub(LocalCertificateManager.prototype, "setupCertificate").resolves({
        certPath: "testCertPath",
        keyPath: "testKeyPath",
        isTrusted: true,
        alreadyTrusted: true,
      });
      const outputEnvVarNames = new Map([
        ["sslCertFile", "MY_SSL_CRT_FILE"],
        ["sslKeyFile", "MY_SSL_KEY_FILE"],
      ]);
      const res = await toolsInstallDriver.execute(
        { devCert: { trust: true } },
        mockedDriverContext,
        outputEnvVarNames
      );
      chai.assert.isNotEmpty(res.summaries);
      chai.assert.isTrue(res.result.isOk());
      if (res.result.isOk()) {
        chai.assert.includeDeepMembers(Array.from(res.result.value.entries()), [
          ["MY_SSL_CRT_FILE", "testCertPath"],
          ["MY_SSL_KEY_FILE", "testKeyPath"],
        ]);
      }
    });

    it("Skip trust new local certificate", async () => {
      sandbox.stub(LocalCertificateManager.prototype, "setupCertificate").resolves({
        certPath: "testCertPath",
        keyPath: "testKeyPath",
        isTrusted: undefined,
        alreadyTrusted: undefined,
      });
      const outputEnvVarNames = new Map([
        ["sslCertFile", "MY_SSL_CRT_FILE"],
        ["sslKeyFile", "MY_SSL_KEY_FILE"],
      ]);
      const res = await toolsInstallDriver.execute(
        { devCert: { trust: false } },
        mockedDriverContext,
        outputEnvVarNames
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
      const outputEnvVarNames = new Map([
        ["sslCertFile", "MY_SSL_CRT_FILE"],
        ["sslKeyFile", "MY_SSL_KEY_FILE"],
      ]);
      const res = await toolsInstallDriver.execute(
        { devCert: { trust: true } },
        mockedDriverContext,
        outputEnvVarNames
      );
      chai.assert.isEmpty(res.summaries);
      chai.assert.isTrue(res.result.isErr());
    });

    it("Invalid parameter", async () => {
      const outputEnvVarNames = new Map([
        ["sslCertFile", "MY_SSL_CRT_FILE"],
        ["sslKeyFile", "MY_SSL_KEY_FILE"],
      ]);
      const res = await toolsInstallDriver.execute(
        { devCert: { trust: "hello" } } as unknown as InstallToolArgs,
        mockedDriverContext,
        outputEnvVarNames
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
        command: "func",
        details: {
          isLinuxSupported: false,
          supportedVersions: [],
          installVersion: "4.0.0",
          binFolders: ["./devTools/func"],
        },
      });
      const outputEnvVarNames = new Map([["funcPath", "MY_FUNC_PATH"]]);
      const res = await toolsInstallDriver.execute(
        { func: { version: "~4.0.0", symlinkDir: "./devTools/func" } },
        mockedDriverContext,
        outputEnvVarNames
      );
      chai.assert.isNotEmpty(res.summaries);
      chai.assert.isTrue(res.result.isOk());
      if (res.result.isOk()) {
        chai.assert.includeDeepMembers(Array.from(res.result.value.entries()), [
          ["MY_FUNC_PATH", "./devTools/func"],
        ]);
      }
    });

    it("Install func without symlinkDir", async () => {
      sandbox.stub(FuncToolChecker.prototype, "resolve").resolves({
        name: "Azure Functions Core Tools",
        type: DepsType.FuncCoreTools,
        isInstalled: true,
        command: "func",
        details: {
          isLinuxSupported: false,
          supportedVersions: [],
          installVersion: "4.0.0",
          binFolders: ["~/.fx/bin/func/node_modules/azure-functions-core-tools/bin"],
        },
      });
      const outputEnvVarNames = new Map([["funcPath", "MY_FUNC_PATH"]]);
      const res = await toolsInstallDriver.execute(
        { func: { version: 4 } },
        mockedDriverContext,
        outputEnvVarNames
      );
      chai.assert.isNotEmpty(res.summaries);
      chai.assert.isTrue(res.result.isOk());
      if (res.result.isOk()) {
        chai.assert.isEmpty(res.result.value.entries());
      }
    });

    it("Install func: empty outputEnvVarNames", async () => {
      sandbox.stub(FuncToolChecker.prototype, "resolve").resolves({
        name: "Azure Functions Core Tools",
        type: DepsType.FuncCoreTools,
        isInstalled: true,
        command: "func",
        details: {
          isLinuxSupported: false,
          supportedVersions: [],
          installVersion: "4.0.0",
          binFolders: ["./devTools/func"],
        },
      });
      const outputEnvVarNames = new Map();
      const res = await toolsInstallDriver.execute(
        { func: { version: "4", symlinkDir: "./devTools/func" } },
        mockedDriverContext,
        outputEnvVarNames
      );
      chai.assert.isNotEmpty(res.summaries);
      chai.assert.isTrue(res.result.isOk());
      if (res.result.isOk()) {
        chai.assert.isEmpty(res.result.value);
      }
    });

    it("Failed to install func", async () => {
      sandbox.stub(FuncToolChecker.prototype, "resolve").resolves({
        name: "Azure Functions Core Tools",
        type: DepsType.FuncCoreTools,
        isInstalled: false,
        command: "func",
        details: {
          isLinuxSupported: false,
          supportedVersions: [],
          installVersion: "4.0.0",
          binFolders: undefined,
        },
        error: new DepsCheckerError("test message", "test link"),
      });
      const outputEnvVarNames = new Map([["funcPath", "MY_FUNC_PATH"]]);
      const res = await toolsInstallDriver.execute(
        { func: { version: "4", symlinkDir: "./devTools/func" } },
        mockedDriverContext,
        outputEnvVarNames
      );
      chai.assert.isEmpty(res.summaries);
      chai.assert.isTrue(res.result.isErr());
    });

    it("Install func with warning", async () => {
      sandbox.stub(FuncToolChecker.prototype, "resolve").resolves({
        name: "Azure Functions Core Tools",
        type: DepsType.FuncCoreTools,
        isInstalled: true,
        command: "func",
        details: {
          isLinuxSupported: false,
          supportedVersions: [],
          installVersion: "4.0.0",
          binFolders: ["./devTools/func"],
        },
        error: new DepsCheckerError("warning message", "test link"),
      });
      const outputEnvVarNames = new Map([["funcPath", "MY_FUNC_PATH"]]);
      const res = await toolsInstallDriver.execute(
        { func: { version: "4", symlinkDir: "./devTools/func" } },
        mockedDriverContext,
        outputEnvVarNames
      );
      chai.assert.isNotEmpty(res.summaries);
      chai.assert.isTrue(res.result.isOk());
      if (res.result.isOk()) {
        chai.assert.includeDeepMembers(Array.from(res.result.value.entries()), [
          ["MY_FUNC_PATH", "./devTools/func"],
        ]);
      }
    });

    const invalidParams: any[] = [
      { version: "hello" },
      false,
      { hello: "hello" },
      { version: "#2", symlinkDir: "./devTools" },
      { version: "#2", symlinkDir: 123 },
      { symlinkDir: 123 },
    ];
    invalidParams.forEach((invalidParam: any) => {
      it(`Invalid parameter - ${JSON.stringify(invalidParam)}`, async () => {
        sandbox.stub(FuncToolChecker.prototype, "resolve").resolves({
          name: "Azure Functions Core Tools",
          type: DepsType.FuncCoreTools,
          isInstalled: true,
          command: "func",
          details: {
            isLinuxSupported: false,
            supportedVersions: [],
            installVersion: "4.0.0",
            binFolders: ["./devTools/func"],
          },
        });
        const outputEnvVarNames = new Map([["funcPath", "MY_FUNC_PATH"]]);
        const res = await toolsInstallDriver.execute(
          { func: invalidParam } as unknown as InstallToolArgs,
          mockedDriverContext,
          outputEnvVarNames
        );
        chai.assert.isEmpty(res.summaries);
        chai.assert.isTrue(res.result.isErr());
      });
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
      const outputEnvVarNames = new Map([["dotnetPath", "MY_DOTNET_PATH"]]);
      const res = await toolsInstallDriver.execute(
        { dotnet: true },
        mockedDriverContext,
        outputEnvVarNames
      );
      chai.assert.isNotEmpty(res.summaries);
      chai.assert.isTrue(res.result.isOk());
      if (res.result.isOk()) {
        chai.assert.includeDeepMembers(Array.from(res.result.value.entries()), [
          ["MY_DOTNET_PATH", "~/.fx/dotnet"],
        ]);
      }
    });

    it("Install dotnet: empty outputEnvVarNames", async () => {
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
      const outputEnvVarNames = new Map();
      const res = await toolsInstallDriver.execute(
        { dotnet: true },
        mockedDriverContext,
        outputEnvVarNames
      );
      chai.assert.isNotEmpty(res.summaries);
      chai.assert.isTrue(res.result.isOk());
      if (res.result.isOk()) {
        chai.assert.isEmpty(res.result.value);
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
      const outputEnvVarNames = new Map([["dotnetPath", "MY_DOTNET_PATH"]]);
      const res = await toolsInstallDriver.execute(
        { dotnet: true },
        mockedDriverContext,
        outputEnvVarNames
      );
      chai.assert.isNotEmpty(res.summaries);
      chai.assert.isTrue(res.result.isOk());
      if (res.result.isOk()) {
        chai.assert.includeDeepMembers(Array.from(res.result.value.entries()), [
          ["MY_DOTNET_PATH", ""],
        ]);
      }
    });

    it("Install dotnet: undefined details", async () => {
      sandbox.stub(DotnetChecker.prototype, "resolve").resolves({
        name: ".NET Core SDK",
        type: DepsType.Dotnet,
        isInstalled: true,
        command: "~/.fx/dotnet/dotnet.exe",
        details: undefined as any,
      });
      const outputEnvVarNames = new Map([["dotnetPath", "MY_DOTNET_PATH"]]);
      const res = await toolsInstallDriver.execute(
        { dotnet: true },
        mockedDriverContext,
        outputEnvVarNames
      );
      chai.assert.isNotEmpty(res.summaries);
      chai.assert.isTrue(res.result.isOk());
      if (res.result.isOk()) {
        chai.assert.isEmpty(res.result.value);
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
      const outputEnvVarNames = new Map([["dotnetPath", "MY_DOTNET_PATH"]]);
      const res = await toolsInstallDriver.execute(
        { dotnet: true },
        mockedDriverContext,
        outputEnvVarNames
      );
      chai.assert.isNotEmpty(res.summaries);
      chai.assert.isTrue(res.result.isOk());
      if (res.result.isOk()) {
        chai.assert.isEmpty(res.result.value);
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
      const outputEnvVarNames = new Map([["dotnetPath", "MY_DOTNET_PATH"]]);
      const res = await toolsInstallDriver.execute(
        { dotnet: true },
        mockedDriverContext,
        outputEnvVarNames
      );
      chai.assert.isEmpty(res.summaries);
      chai.assert.isTrue(res.result.isErr());
    });

    it("Invalid parameter", async () => {
      const outputEnvVarNames = new Map([["dotnetPath", "MY_DOTNET_PATH"]]);
      const res = await toolsInstallDriver.execute(
        { dotnet: { version: "hello" } } as unknown as InstallToolArgs,
        mockedDriverContext,
        outputEnvVarNames
      );
      chai.assert.isTrue(res.result.isErr());
      chai.assert.isEmpty(res.summaries);
      chai.assert.isTrue(res.result.isErr());
    });
  });
});
