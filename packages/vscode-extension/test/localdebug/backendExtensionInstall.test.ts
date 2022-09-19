// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import * as sinon from "sinon";
import {
  DepsTelemetry,
  DepsLogger,
  DepsType,
} from "@microsoft/teamsfx-core/build/common/deps-checker";

const expect = chai.expect;

import { VSCodeDepsChecker } from "../../src/debug/depsChecker/vscodeChecker";
import * as installer from "../../src/debug/depsChecker/backendExtensionsInstall";

describe("[Checker UT - Backend Extension Install]", () => {
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

    it("display error", async () => {
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
      expect(res).to.be.false;
    });
  });
});
