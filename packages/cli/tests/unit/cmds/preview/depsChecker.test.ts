// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import * as sinon from "sinon";
import {
  defaultHelpLink,
  DepsCheckerError,
  DepsCheckerEvent,
  DepsLogger,
  DepsTelemetry,
  DepsType,
} from "@microsoft/teamsfx-core";
import { ok } from "@microsoft/teamsfx-api";

import { UserSettings } from "../../../../src/userSetttings";
import * as cliUtils from "../../../../src/cmds/preview/depsChecker/cliUtils";
import { CliDepsChecker } from "../../../../src/cmds/preview/depsChecker/cliChecker";
import UI from "../../../../src/userInteraction";

const expect = chai.expect;

describe("[Checker UT - Cli]", () => {
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
      const checker = new CliDepsChecker(logger, telemetry, true, true, true);
      const deps = [DepsType.AzureNode, DepsType.Dotnet, DepsType.FuncCoreTools, DepsType.Ngrok];

      chai.util.addMethod(checker, "ensure", async function () {
        return getAzureF5DepsStatus();
      });
      sandbox.stub(UI, "openUrl").callsFake(async (url: string) => {
        return ok(true);
      });
      sandbox.stub(UI, "showMessage").resolves(ok("selected button"));
      sandbox.stub(cliUtils, "isLinux").onFirstCall().returns(false).onSecondCall().returns(true);

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

    it("azure + f5: failed [windows]", async () => {
      const checker = new CliDepsChecker(logger, telemetry, true, true, true);
      const deps = [DepsType.AzureNode, DepsType.Dotnet, DepsType.FuncCoreTools, DepsType.Ngrok];
      const dotnetMessage = "Failed install dotnet";
      const dotnetHelpLink = "help link";
      const error = new DepsCheckerError(dotnetMessage, dotnetHelpLink);

      chai.util.addMethod(checker, "ensure", async function () {
        return getFailedDepsStatus(error);
      });
      sandbox.stub(cliUtils, "isLinux").returns(false);

      const openUrlSpy = sandbox.stub(UI, "openUrl").callsFake(async (url: string) => {
        return ok(true);
      });
      const showSpy = sandbox.stub(UI, "showMessage");
      showSpy.onCall(0).resolves(ok("Learn more"));
      showSpy.onCall(1).resolves(ok(undefined));

      const shouldContinue = await checker.resolve(deps);

      sandbox.assert.calledTwice(showSpy);
      sandbox.assert.calledWith(showSpy, "info", dotnetMessage, sinon.match.any, sinon.match.any);
      sandbox.assert.calledWith(openUrlSpy, dotnetHelpLink);
      expect(shouldContinue).to.be.false;

      sandbox.assert.calledTwice(sendEventSpy);
      sendEventSpy.firstCall.calledWith(DepsCheckerEvent.clickLearnMore);
      sendEventSpy.secondCall.calledWith(DepsCheckerEvent.clickCancel);
    });

    it("azure + f5: failed [linux]", async () => {
      const checker = new CliDepsChecker(logger, telemetry, true, true, true);
      const deps = [DepsType.AzureNode, DepsType.Dotnet, DepsType.FuncCoreTools, DepsType.Ngrok];

      chai.util.addMethod(checker, "ensure", async function () {
        return getFailedDepsStatus(undefined);
      });
      sandbox.stub(cliUtils, "isLinux").returns(true);

      const showSpy = sandbox.stub(UI, "showMessage");
      const openUrlSpy = sandbox.stub(UI, "openUrl").callsFake(async (url: string) => {
        return ok(true);
      });
      showSpy.onCall(0).resolves(ok("Learn more"));
      showSpy.onCall(1).resolves(ok(undefined));

      const shouldContinue = await checker.resolve(deps);

      const depsNotFoundMatcher = sinon.match(function (msg: string) {
        return msg.includes("Teams Toolkit requires these dependencies");
      });
      sandbox.assert.calledTwice(showSpy);
      sandbox.assert.calledWith(
        showSpy,
        "info",
        depsNotFoundMatcher,
        sinon.match.any,
        sinon.match.any
      );
      sandbox.assert.calledWith(openUrlSpy, defaultHelpLink);
      expect(shouldContinue).to.be.false;
    });

    it("azure + f5: all disabled", async () => {
      const checker = new CliDepsChecker(logger, telemetry, false, false, false);
      const deps = [
        DepsType.SpfxNode,
        DepsType.FunctionNode,
        DepsType.AzureNode,
        DepsType.Dotnet,
        DepsType.FuncCoreTools,
        DepsType.Ngrok,
      ];

      chai.util.addMethod(checker, "ensure", async function (deps: DepsType[]) {
        chai.assert.equal(deps.length, 0);
        return [];
      });

      const config = {
        "validate-func-core-tools": "on",
        "validate-node": "off",
        "validate-dotnet-sdk": "off",
      };
      sandbox.stub(UserSettings, "getConfigSync").returns(ok(config));

      sandbox.stub(cliUtils, "isLinux").returns(false);
      const shouldContinue = await checker.resolve(deps);
      expect(shouldContinue).to.be.true;
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
