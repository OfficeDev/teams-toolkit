// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import * as sinon from "sinon";
import { DepsTelemetry, DepsLogger, DepsType } from "@microsoft/teamsfx-core";

const expect = chai.expect;

import { VSCodeDepsChecker } from "../../../src/debug/depsChecker/vscodeChecker";
import * as installer from "../../../src/debug/depsChecker/backendExtensionsInstall";

suite("[Checker UT - Backend Extension Install]", () => {
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

    test("display error", async () => {
      const checker = new VSCodeDepsChecker(logger, telemetry);
      sandbox.stub(checker, "getDepsStatus").resolves({
        name: "DotNet",
        type: DepsType.Dotnet,
        isInstalled: true,
        command: "",
        details: { isLinuxSupported: false, supportedVersions: [] },
      });
      const displaySpy = sandbox.stub(checker, "display").resolves();

      const dir = "Dir";
      const res = await installer.installBackendExtension(dir, checker, logger);

      sandbox.assert.calledOnce(displaySpy);
      expect(res.isOk()).to.be.false;
    });
  });
});
