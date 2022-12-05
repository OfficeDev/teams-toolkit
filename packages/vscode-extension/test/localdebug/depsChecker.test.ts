// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import * as sinon from "sinon";
import {
  DepsTelemetry,
  DepsCheckerEvent,
  DepsLogger,
  DepsType,
  DepsCheckerError,
  defaultHelpLink,
} from "@microsoft/teamsfx-core/build/common/deps-checker";
import * as os from "os";

const expect = chai.expect;

import { vscodeHelper } from "../../src/debug/depsChecker/vscodeHelper";
import { VSCodeDepsChecker } from "../../src/debug/depsChecker/vscodeChecker";

describe("[Checker UT - Extension]", () => {
  const logger: DepsLogger = <DepsLogger>{};
  const telemetry: DepsTelemetry = <DepsTelemetry>{};
  const sandbox = sinon.createSandbox();
  const sendEventSpy = sandbox.stub();
  describe("resolve", async () => {
    beforeEach(() => {
      logger.cleanup = sandbox.stub().resolves();
      logger.error = sandbox.stub().resolves();
      logger.debug = sandbox.stub().resolves();
      logger.printDetailLog = sandbox.stub().resolves();
      telemetry.sendEvent = sendEventSpy.resolves();
    });
    afterEach(() => {
      sandbox.restore();
    });

    it("azure + f5: installed [windows + linux]", async () => {
      const checker = new VSCodeDepsChecker(logger, telemetry);
      const deps = [DepsType.AzureNode, DepsType.Dotnet, DepsType.FuncCoreTools, DepsType.Ngrok];

      chai.util.addMethod(checker, "ensure", async function () {
        return getAzureF5DepsStatus();
      });
      stubEnabled(sandbox);
      sandbox.stub(os, "type").onFirstCall().returns("Windows_NT").onSecondCall().returns("Linux");

      const shouldContinue = await checker.resolve(deps);
      expect(shouldContinue).to.be.true;

      const resolveLinux = await checker.resolve(deps);
      expect(resolveLinux).to.be.true;
    });

    it("azure + f5: failed [windows]", async () => {
      const checker = new VSCodeDepsChecker(logger, telemetry);
      const deps = [DepsType.AzureNode, DepsType.Dotnet, DepsType.FuncCoreTools, DepsType.Ngrok];
      const dotnetMessage = "Failed install dotnet";
      const dotnetHelpLink = "help link";
      const error = new DepsCheckerError(dotnetMessage, dotnetHelpLink);

      chai.util.addMethod(checker, "ensure", async function () {
        return getFailedDepsStatus(error);
      });
      sandbox.stub(os, "type").returns("Windows_NT");
      stubEnabled(sandbox);

      const openUrlSpy = sandbox.stub(vscodeHelper, "openUrl").callsFake(async (url: string) => {});
      const showSpy = sandbox.stub(vscodeHelper, "showWarningMessage");
      showSpy.onCall(0).resolves(true);
      showSpy.onCall(1).resolves(false);

      const shouldContinue = await checker.resolve(deps);

      sandbox.assert.calledTwice(showSpy);
      sandbox.assert.calledWith(showSpy, dotnetMessage, sinon.match.any);
      sandbox.assert.calledWith(openUrlSpy, dotnetHelpLink);
      expect(shouldContinue).to.be.false;

      sandbox.assert.calledTwice(sendEventSpy);
      sendEventSpy.firstCall.calledWith(DepsCheckerEvent.clickLearnMore);
      sendEventSpy.secondCall.calledWith(DepsCheckerEvent.clickCancel);
    });

    it("azure + f5: failed [linux]", async () => {
      const checker = new VSCodeDepsChecker(logger, telemetry);
      const deps = [DepsType.AzureNode, DepsType.Dotnet, DepsType.FuncCoreTools, DepsType.Ngrok];

      chai.util.addMethod(checker, "ensure", async function () {
        return getFailedDepsStatus(undefined);
      });
      sandbox.stub(os, "type").returns("Linux");
      stubEnabled(sandbox);

      const showSpy = sandbox.stub(vscodeHelper, "showWarningMessage");
      const openUrlSpy = sandbox.stub(vscodeHelper, "openUrl").callsFake(async (url: string) => {});
      showSpy.onCall(0).resolves(true);
      showSpy.onCall(1).resolves(false);

      const shouldContinue = await checker.resolve(deps);

      const depsNotFoundMatcher = sinon.match(function (msg: string) {
        return (
          msg.includes("Cannot find") && msg.includes("manually and restart Visual Studio Code.")
        );
      });
      sandbox.assert.calledTwice(showSpy);
      sandbox.assert.calledWith(showSpy, depsNotFoundMatcher, sinon.match.any);
      sandbox.assert.calledWith(openUrlSpy, defaultHelpLink);
      expect(shouldContinue).to.be.false;
    });

    it("azure + f5: all disabled 1", async () => {
      const checker = new VSCodeDepsChecker(logger, telemetry);
      const deps = [
        DepsType.SpfxNode,
        DepsType.AzureNode,
        DepsType.Dotnet,
        DepsType.FuncCoreTools,
        DepsType.Ngrok,
      ];

      sandbox.stub(os, "type").returns("Windows_NT");
      sandbox.stub(vscodeHelper, "hasFunction").resolves(false);
      sandbox.stub(vscodeHelper, "isFuncCoreToolsEnabled").returns(true);
      sandbox.stub(vscodeHelper, "isNodeCheckerEnabled").returns(false);
      sandbox.stub(vscodeHelper, "isDotnetCheckerEnabled").returns(false);
      sandbox.stub(vscodeHelper, "isNgrokCheckerEnabled").returns(false);
      sandbox.stub(vscodeHelper, "hasBot").onCall(0).resolves(true);

      chai.util.addMethod(checker, "ensure", async function (deps: DepsType[]) {
        chai.assert.equal(deps.length, 0, `Unexpected: ${deps}`);
        return [];
      });

      const shouldContinue = await checker.resolve(deps);
      expect(shouldContinue).to.be.true;
    });

    it("azure + f5: all disabled 2", async () => {
      const checker = new VSCodeDepsChecker(logger, telemetry);
      const deps = [
        DepsType.SpfxNode,
        DepsType.AzureNode,
        DepsType.Dotnet,
        DepsType.FuncCoreTools,
        DepsType.Ngrok,
      ];

      sandbox.stub(os, "type").returns("Windows_NT");
      sandbox.stub(vscodeHelper, "hasFunction").resolves(true);
      sandbox.stub(vscodeHelper, "isFuncCoreToolsEnabled").returns(false);
      sandbox.stub(vscodeHelper, "isNodeCheckerEnabled").returns(false);
      sandbox.stub(vscodeHelper, "isDotnetCheckerEnabled").returns(false);
      sandbox.stub(vscodeHelper, "isNgrokCheckerEnabled").returns(true);
      sandbox.stub(vscodeHelper, "hasBot").resolves(false);

      chai.util.addMethod(checker, "ensure", async function (deps: DepsType[]) {
        chai.assert.equal(deps.length, 0, `Unexpected: ${deps}`);
        return [];
      });

      const shouldContinue = await checker.resolve(deps);
      expect(shouldContinue).to.be.true;
    });
  });
});

function getAzureF5DepsStatus() {
  return [
    {
      name: "",
      type: DepsType.AzureNode,
      isInstalled: true,
      command: "node",
      details: { isLinuxSupported: true, supportedVersions: [] },
    },
    {
      name: "",
      type: DepsType.Dotnet,
      isInstalled: true,
      command: "dotnet",
      details: { isLinuxSupported: false, supportedVersions: [] },
    },
    {
      name: "",
      type: DepsType.FuncCoreTools,
      isInstalled: true,
      command: "func",
      details: { isLinuxSupported: false, supportedVersions: [] },
    },
    {
      name: "",
      type: DepsType.Ngrok,
      isInstalled: true,
      command: "ngrok",
      details: { isLinuxSupported: true, supportedVersions: [] },
    },
  ];
}

function getFailedDepsStatus(error: DepsCheckerError | undefined) {
  return [
    {
      name: "",
      type: DepsType.AzureNode,
      isInstalled: true,
      command: "node",
      details: { isLinuxSupported: true, supportedVersions: [] },
    },
    {
      name: "",
      type: DepsType.Dotnet,
      isInstalled: false,
      command: "dotnet",
      error: error,
      details: { isLinuxSupported: false, supportedVersions: [] },
    },
    {
      name: "",
      type: DepsType.FuncCoreTools,
      isInstalled: false,
      command: "func",
      error: new DepsCheckerError("should not use this error", "should not use this error"),
      details: { isLinuxSupported: false, supportedVersions: [] },
    },
    {
      name: "",
      type: DepsType.Ngrok,
      isInstalled: false,
      command: "ngrok",
      details: { isLinuxSupported: true, supportedVersions: [] },
    },
  ];
}

function stubEnabled(sandbox: sinon.SinonSandbox) {
  sandbox.stub(vscodeHelper, "checkerEnabled").returns(true);
  sandbox.stub(vscodeHelper, "hasFunction").resolves(true);
  sandbox.stub(vscodeHelper, "isNgrokCheckerEnabled").resolves(true);
  sandbox.stub(vscodeHelper, "hasBot").resolves(true);
  sandbox.stub(vscodeHelper, "isFuncCoreToolsEnabled").returns(true);
  sandbox.stub(vscodeHelper, "isDotnetCheckerEnabled").returns(true);
  sandbox.stub(vscodeHelper, "isNodeCheckerEnabled").returns(true);
}
