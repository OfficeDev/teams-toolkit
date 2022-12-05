// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import * as sinon from "sinon";
import {
  DepsLogger,
  DepsTelemetry,
  DepsType,
} from "@microsoft/teamsfx-core/build/common/deps-checker";

import * as cliUtils from "../../../../src/cmds/preview/depsChecker/cliUtils";
import { CliDepsChecker } from "../../../../src/cmds/preview/depsChecker/cliChecker";

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

    it("All Enabled", async () => {
      sandbox.stub(cliUtils, "isFuncCoreToolsEnabled").resolves(true);
      sandbox.stub(cliUtils, "isDotnetCheckerEnabled").resolves(true);
      sandbox.stub(cliUtils, "isNodeCheckerEnabled").resolves(true);
      sandbox.stub(cliUtils, "isNgrokCheckerEnabled").resolves(true);

      const deps = [DepsType.AzureNode, DepsType.Dotnet, DepsType.FuncCoreTools, DepsType.Ngrok];

      expect(await CliDepsChecker.getEnabledDeps(deps)).to.be.eql(deps, "All deps is enabled");
    });

    it("Node", async () => {
      sandbox.stub(cliUtils, "isNodeCheckerEnabled").resolves(false);
      expect(await CliDepsChecker.isEnabled(DepsType.SpfxNode)).to.be.false;
      expect(await CliDepsChecker.isEnabled(DepsType.AzureNode)).to.be.false;

      sandbox.restore();
      sandbox.stub(cliUtils, "isNodeCheckerEnabled").resolves(true);
      expect(await CliDepsChecker.isEnabled(DepsType.AzureNode)).to.be.true;
    });

    it("Dotnet", async () => {
      sandbox.stub(cliUtils, "isDotnetCheckerEnabled").resolves(false);
      expect(await CliDepsChecker.isEnabled(DepsType.Dotnet)).to.be.false;

      sandbox.restore();
      sandbox.stub(cliUtils, "isNodeCheckerEnabled").resolves(true);
      expect(await CliDepsChecker.isEnabled(DepsType.Dotnet)).to.be.true;
    });

    it("Func", async () => {
      sandbox.stub(cliUtils, "isFuncCoreToolsEnabled").resolves(false);
      expect(await CliDepsChecker.isEnabled(DepsType.FuncCoreTools)).to.be.false;

      sandbox.restore();
      sandbox.stub(cliUtils, "isFuncCoreToolsEnabled").resolves(true);
      expect(await CliDepsChecker.isEnabled(DepsType.FuncCoreTools)).to.be.true;
    });

    it("Ngrok", async () => {
      sandbox.stub(cliUtils, "isNgrokCheckerEnabled").resolves(false);
      expect(await CliDepsChecker.isEnabled(DepsType.Ngrok)).to.be.false;

      sandbox.restore();
      sandbox.stub(cliUtils, "isNgrokCheckerEnabled").resolves(true);
      expect(await CliDepsChecker.isEnabled(DepsType.Ngrok)).to.be.true;
    });
  });
});
