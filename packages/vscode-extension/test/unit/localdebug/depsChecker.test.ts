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
} from "@microsoft/teamsfx-core";
import * as os from "os";

const expect = chai.expect;
const mock = require("mock-require");

mock("../../../src/debug/depsChecker/vscodeUtils", {
  showWarningMessage: async function (message: string, button: MessageItem) {},
  openUrl: async function (url: string) {},
  checkerEnabled: function (key: string) {},
  isNodeCheckerEnabled: function () {},
  isFuncCoreToolsEnabled: function () {},
  isDotnetCheckerEnabled: function () {},
  hasFunction: async function () {},
  hasNgrok: async function () {},
  hasBot: async function () {},
});

import * as vscodeUtils from "../../../src/debug/depsChecker/vscodeUtils";
import { VSCodeDepsChecker } from "../../../src/debug/depsChecker/vscodeChecker";
import { MessageItem } from "vscode";

suite("[Checker UT - Extension]", () => {
  const logger: DepsLogger = <DepsLogger>{};
  const telemetry: DepsTelemetry = <DepsTelemetry>{};
  const sandbox = sinon.createSandbox();
  const sendEventSpy = sandbox.stub();
  suite("resolve", async () => {
    setup(() => {
      logger.cleanup = sandbox.stub().resolves();
      logger.error = sandbox.stub().resolves();
      logger.debug = sandbox.stub().resolves();
      logger.printDetailLog = sandbox.stub().resolves();
      telemetry.sendEvent = sendEventSpy.resolves();
    });
    teardown(() => {
      sandbox.restore();
    });

    test("azure + f5: installed [windows + linux]", async () => {
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

      chai.util.addMethod(checker, "ensure", async function () {
        return [
          {
            name: DepsType.Dotnet,
            isInstalled: true,
            command: "dotnet",
            details: { isLinuxSupported: false, supportedVersions: [] },
          },
        ];
      });
      const dotnetStatus = await checker.getDepsStatus(DepsType.Dotnet);
      expect(dotnetStatus.isInstalled).to.be.true;
      expect(dotnetStatus.command).to.be.eq("dotnet");
    });

    test("azure + f5: failed [windows]", async () => {
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

      const openUrlSpy = sandbox.stub(vscodeUtils, "openUrl").callsFake(async (url: string) => {});
      const showSpy = sandbox.stub(vscodeUtils, "showWarningMessage");
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

    test("azure + f5: failed [linux]", async () => {
      const checker = new VSCodeDepsChecker(logger, telemetry);
      const deps = [DepsType.AzureNode, DepsType.Dotnet, DepsType.FuncCoreTools, DepsType.Ngrok];

      chai.util.addMethod(checker, "ensure", async function () {
        return getFailedDepsStatus(undefined);
      });
      sandbox.stub(os, "type").returns("Linux");
      stubEnabled(sandbox);

      const showSpy = sandbox.stub(vscodeUtils, "showWarningMessage");
      const openUrlSpy = sandbox.stub(vscodeUtils, "openUrl").callsFake(async (url: string) => {});
      showSpy.onCall(0).resolves(true);
      showSpy.onCall(1).resolves(false);

      const shouldContinue = await checker.resolve(deps);

      const depsNotFoundMatcher = sinon.match(function (msg: string) {
        return msg.includes("Teams Toolkit requires these dependencies");
      });
      sandbox.assert.calledTwice(showSpy);
      sandbox.assert.calledWith(showSpy, depsNotFoundMatcher, sinon.match.any);
      sandbox.assert.calledWith(openUrlSpy, defaultHelpLink);
      expect(shouldContinue).to.be.false;
    });

    test("azure + f5: all disabled", async () => {
      const checker = new VSCodeDepsChecker(logger, telemetry);
      const deps = [
        DepsType.SpfxNode,
        DepsType.FunctionNode,
        DepsType.AzureNode,
        DepsType.Dotnet,
        DepsType.FuncCoreTools,
        DepsType.Ngrok,
      ];

      sandbox.stub(os, "type").returns("Windows_NT");
      sandbox.stub(vscodeUtils, "hasFunction").resolves(false);
      sandbox.stub(vscodeUtils, "isFuncCoreToolsEnabled").resolves(true);
      sandbox.stub(vscodeUtils, "isNodeCheckerEnabled").resolves(false);
      sandbox.stub(vscodeUtils, "isDotnetCheckerEnabled").resolves(false);

      sandbox.stub(vscodeUtils, "hasNgrok").onCall(0).resolves(false).onCall(1).resolves(true);
      sandbox.stub(vscodeUtils, "hasBot").onCall(0).resolves(true).onCall(1).resolves(false);

      chai.util.addMethod(checker, "ensure", async function (deps: DepsType[]) {
        chai.assert.equal(deps.length, 0);
        return [];
      });

      const shouldContinue = await checker.resolve(deps);
      expect(shouldContinue).to.be.true;

      const secondRes = await checker.resolve(deps);
      expect(secondRes).to.be.true;
    });
  });
});

function getAzureF5DepsStatus() {
  return [
    {
      name: DepsType.AzureNode,
      isInstalled: true,
      command: "node",
      details: { isLinuxSupported: true, supportedVersions: [] },
    },
    {
      name: DepsType.Dotnet,
      isInstalled: true,
      command: "dotnet",
      details: { isLinuxSupported: false, supportedVersions: [] },
    },
    {
      name: DepsType.FuncCoreTools,
      isInstalled: true,
      command: "func",
      details: { isLinuxSupported: false, supportedVersions: [] },
    },
    {
      name: DepsType.Ngrok,
      isInstalled: true,
      command: "ngrok",
      details: { isLinuxSupported: true, supportedVersions: [] },
    },
  ];
}

function getFailedDepsStatus(error: DepsCheckerError | undefined) {
  return [
    {
      name: DepsType.AzureNode,
      isInstalled: true,
      command: "node",
      details: { isLinuxSupported: true, supportedVersions: [] },
    },
    {
      name: DepsType.Dotnet,
      isInstalled: false,
      command: "dotnet",
      error: error,
      details: { isLinuxSupported: false, supportedVersions: [] },
    },
    {
      name: DepsType.FuncCoreTools,
      isInstalled: false,
      command: "func",
      error: new DepsCheckerError("should not use this error", "should not use this error"),
      details: { isLinuxSupported: false, supportedVersions: [] },
    },
    {
      name: DepsType.Ngrok,
      isInstalled: false,
      command: "ngrok",
      details: { isLinuxSupported: true, supportedVersions: [] },
    },
  ];
}

function stubEnabled(sandbox: sinon.SinonSandbox) {
  sandbox.stub(vscodeUtils, "checkerEnabled").returns(true);
  sandbox.stub(vscodeUtils, "hasFunction").resolves(true);
  sandbox.stub(vscodeUtils, "hasNgrok").resolves(true);
  sandbox.stub(vscodeUtils, "hasBot").resolves(true);
  sandbox.stub(vscodeUtils, "isNodeCheckerEnabled").resolves(true);
  sandbox.stub(vscodeUtils, "isFuncCoreToolsEnabled").resolves(true);
  sandbox.stub(vscodeUtils, "isDotnetCheckerEnabled").resolves(true);
}
