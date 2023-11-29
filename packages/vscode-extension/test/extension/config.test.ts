import * as sinon from "sinon";
import * as chai from "chai";
import * as vscode from "vscode";
import VsCodeLogInstance from "../../src/commonlib/log";
import { LogLevel } from "@microsoft/teamsfx-api";
import * as config from "../../src/configuration";
import { ConfigurationKey } from "../../src/constants";

describe("Configuration", () => {
  const sanbox = sinon.createSandbox();
  describe("loadConfigurations", () => {
    afterEach(async () => {
      sanbox.restore();
    });
    it("happy", () => {
      const stub = sanbox.stub(vscode.workspace, "getConfiguration").returns({
        get: (key: string) => {
          if (key === ConfigurationKey.BicepEnvCheckerEnable) return true;
          if (key === ConfigurationKey.CopilotPluginEnable) return true;
          if (key === ConfigurationKey.LogLevel) return "debug";
          return "debug";
        },
      } as any);
      config.loadConfigurations();
      chai.assert.isTrue(stub.called);
    });
  });

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
      config.loadLogLevel();
      chai.assert.equal(VsCodeLogInstance.logLevel, LogLevel.Debug);
    });

    it("verbose", () => {
      sanbox.stub(vscode.workspace, "getConfiguration").returns({
        get: () => {
          return "verbose";
        },
      } as any);
      config.loadLogLevel();
      chai.assert.equal(VsCodeLogInstance.logLevel, LogLevel.Verbose);
    });

    it("info", () => {
      sanbox.stub(vscode.workspace, "getConfiguration").returns({
        get: () => {
          return "info";
        },
      } as any);
      config.loadLogLevel();
      chai.assert.equal(VsCodeLogInstance.logLevel, LogLevel.Info);
    });
  });

  describe("changeConfigCallback", () => {
    afterEach(async () => {
      sanbox.restore();
    });
    it("happy", () => {
      const stub = sanbox.stub(vscode.workspace, "getConfiguration").returns({
        get: (key: string) => {
          if (key === ConfigurationKey.BicepEnvCheckerEnable) return true;
          if (key === ConfigurationKey.CopilotPluginEnable) return true;
          if (key === ConfigurationKey.LogLevel) return "debug";
          return "debug";
        },
      } as any);
      config.changeConfigCallback({ affectsConfiguration: () => true });
      chai.assert.isTrue(stub.called);
    });
  });
});
