import { featureFlagManager } from "@microsoft/teamsfx-core";
import * as chai from "chai";
import sinon, { SinonFakeTimers, useFakeTimers } from "sinon";
import { cdpClient, CDPModule } from "../../src/pluginDebugger/cdpClient";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import "../setup";

describe("cdpClient", () => {
  const sandbox = sinon.createSandbox();
  let clock: SinonFakeTimers;

  beforeEach(() => {
    clock = useFakeTimers();
  });

  afterEach(() => {
    sandbox.restore();
    clock.restore();
  });
  describe("build", () => {
    it("happy", async () => {
      sandbox.stub(CDPModule, "build").resolves({} as any);
      const client = await cdpClient.build({ port: 9222 });
      chai.assert.isDefined(client);
    });
  });
  describe("connectWithBackoff", () => {
    it("build fail", async () => {
      sandbox.stub(cdpClient, "build").rejects(new Error());
      try {
        const p = cdpClient.connectWithBackoff(9222, "", 1, 1);
        clock.tick(1);
        await p;
        chai.assert.fail("should not reach here");
      } catch (e) {
        chai.assert.isDefined(e);
      }
    });
  });
  describe("subscribeToWebSocketEvents", () => {
    it("happy", async () => {
      sandbox.stub(cdpClient, "launchTeamsChatListener").resolves();
      const client = {
        Network: { enable: () => {}, webSocketFrameReceived: () => {} },
        Page: { enable: () => {} },
        Target: {
          getTargets: () => {
            return { targetInfos: [] };
          },
        },
      } as any;
      const webSocketFrameReceived = sandbox.stub(client.Network, "webSocketFrameReceived");
      await cdpClient.subscribeToWebSocketEvents(client);
      chai.assert.isTrue(webSocketFrameReceived.called);
    });
  });
  describe("start", () => {
    it("happy", async () => {
      const sendTelemetryEvent = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(featureFlagManager, "getBooleanValue").returns(true);
      sandbox.stub(cdpClient, "build").resolves({
        Network: { enable: () => {}, webSocketFrameReceived: () => {} },
        Page: { enable: () => {} },
        Target: {
          getTargets: () => {
            return { targetInfos: [] };
          },
        },
      } as any);
      sandbox.stub(cdpClient, "subscribeToWebSocketEvents").resolves();
      const startPromise = cdpClient.start();
      clock.tick(2000);
      await startPromise;
      chai.assert.isTrue(sendTelemetryEvent.called);
    });
    it("error", async () => {
      const sendTelemetryEvent = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      const sendTelemetryErrorEvent = sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sandbox.stub(featureFlagManager, "getBooleanValue").returns(true);
      sandbox.stub(cdpClient, "cdpClients").value([]);
      sandbox.stub(cdpClient, "build").resolves({
        Network: { enable: () => {}, webSocketFrameReceived: () => {} },
        Page: { enable: () => {} },
        Target: {
          getTargets: () => {
            return { targetInfos: [] };
          },
        },
      } as any);
      sandbox.stub(cdpClient, "subscribeToWebSocketEvents").rejects(new Error());
      const startPromise = cdpClient.start();
      clock.tick(2000);
      await startPromise;
      chai.assert.isTrue(sendTelemetryEvent.called);
      chai.assert.isTrue(sendTelemetryErrorEvent.called);
    });
    it("feature flag disabled", async () => {
      const sendTelemetryEvent = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(featureFlagManager, "getBooleanValue").returns(false);
      await cdpClient.start();
      chai.assert.isTrue(sendTelemetryEvent.notCalled);
    });
    it("already started", async () => {
      const sendTelemetryEvent = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(cdpClient, "cdpClients").value([{} as any]);
      sandbox.stub(featureFlagManager, "getBooleanValue").returns(true);
      await cdpClient.start();
      chai.assert.isTrue(sendTelemetryEvent.notCalled);
    });
  });
});
