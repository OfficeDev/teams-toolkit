import { featureFlagManager } from "@microsoft/teamsfx-core";
import * as chai from "chai";
import sinon, { SinonFakeTimers, useFakeTimers } from "sinon";
import { cdpClient } from "../../src/pluginDebugger/cdpClient";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";

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
  });
});
