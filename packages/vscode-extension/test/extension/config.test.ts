import { LogLevel } from "@microsoft/teamsfx-api";
import * as chai from "chai";
import * as sinon from "sinon";
import * as vscode from "vscode";
import VsCodeLogInstance from "../../src/commonlib/log";
import { configMgr } from "../../src/config";

describe("configMgr", () => {
  const sanbox = sinon.createSandbox();
  describe("loadLogLevel", () => {
    afterEach(async () => {
      sanbox.restore();
    });
    it("debug", () => {
      sanbox.stub(vscode.workspace, "getConfiguration").returns({
        get: () => {
          return "debug";
        },
      } as any);
      configMgr.loadLogLevel();
      chai.assert.equal(VsCodeLogInstance.logLevel, LogLevel.Debug);
    });

    it("verbose", () => {
      sanbox.stub(vscode.workspace, "getConfiguration").returns({
        get: () => {
          return "verbose";
        },
      } as any);
      configMgr.loadLogLevel();
      chai.assert.equal(VsCodeLogInstance.logLevel, LogLevel.Verbose);
    });

    it("info", () => {
      sanbox.stub(vscode.workspace, "getConfiguration").returns({
        get: () => {
          return "info";
        },
      } as any);
      configMgr.loadLogLevel();
      chai.assert.equal(VsCodeLogInstance.logLevel, LogLevel.Info);
    });
  });

  describe("changeConfigCallback", () => {
    afterEach(() => {
      sanbox.restore();
    });
    it("happy", () => {
      const stub = sanbox.stub(configMgr, "loadConfigs").returns();
      configMgr.changeConfigCallback({ affectsConfiguration: () => true });
      chai.assert.isTrue(stub.called);
    });
  });
  describe("loadConfigs", () => {
    afterEach(() => {
      sanbox.restore();
    });
    it("happy", () => {
      const stub = sanbox.stub(configMgr, "loadLogLevel").returns();
      const stub2 = sanbox.stub(configMgr, "loadFeatureFlags").returns();
      configMgr.loadConfigs();
      chai.assert.isTrue(stub.called);
      chai.assert.isTrue(stub2.called);
    });
  });

  describe("loadFeatureFlags", () => {
    afterEach(() => {
      sanbox.restore();
    });
    it("happy", () => {
      const stub = sanbox.stub(configMgr, "getConfiguration").returns(false);
      configMgr.loadFeatureFlags();
      chai.assert.isTrue(stub.called);
    });
  });
});
