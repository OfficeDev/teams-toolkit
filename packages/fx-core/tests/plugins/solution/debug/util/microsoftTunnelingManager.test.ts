// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import * as chai from "chai";
import { MicrosoftTunnelingManager } from "../../../../../src/plugins/solution/fx-solution/debug/util/microsoftTunnelingManager";
import { TunnelManagementHttpClient, TunnelRequestOptions } from "@vs/tunnels-management";
import { Tunnel, TunnelConnectionMode } from "@vs/tunnels-contracts";
import { TunnelRelayTunnelHost } from "@vs/tunnels-connections";

describe("MicrosoftTunnelingManager", () => {
  describe("startTunnelsHost()", () => {
    const sandbox = sinon.createSandbox();
    beforeEach(() => {});
    afterEach(() => {
      sandbox.restore();
    });

    it("Create tunnel on the first run", async () => {
      // Arrange
      const createdTunnelId = "some random tunnel id";
      const createdTunnelClusterId = "some random tunnel cluster id";
      sandbox
        .stub(TunnelManagementHttpClient.prototype, "createTunnel")
        .callsFake(async (tunnel: Tunnel, options?: TunnelRequestOptions): Promise<Tunnel> => {
          return { tunnelId: createdTunnelId, clusterId: createdTunnelClusterId };
        });
      sandbox
        .stub(TunnelRelayTunnelHost.prototype, "start")
        .callsFake(async (): Promise<void> => {});
      sandbox
        .stub(TunnelManagementHttpClient.prototype, "getTunnel")
        .callsFake(
          async (tunnel: Tunnel, options?: TunnelRequestOptions): Promise<Tunnel | null> => {
            const result = Object.assign({}, tunnel);
            result.endpoints = [
              {
                connectionMode: TunnelConnectionMode.TunnelRelay,
                portUriFormat: "{port} url",
                hostId: "some host id",
              },
            ];
            return result;
          }
        );
      const manager = new MicrosoftTunnelingManager(async () => "fake token");

      // Act
      const result = await manager.startTunnelHost([3978, 3000]);

      // Assert
      chai.assert.deepEqual(Array.from(result.portEndpoints.entries()).sort(), [
        [3000, "3000 url"],
        [3978, "3978 url"],
      ]);
      chai.assert.deepEqual(result.tunnelInfo, {
        tunnelsClusterId: createdTunnelClusterId,
        tunnelsId: createdTunnelId,
      });
    });

    it("Re-use tunnel", async () => {
      // Arrange
      sandbox
        .stub(TunnelManagementHttpClient.prototype, "createTunnel")
        .callsFake(async (tunnel: Tunnel, options?: TunnelRequestOptions): Promise<Tunnel> => {
          throw new Error("Should not create tunnel");
        });
      sandbox
        .stub(TunnelRelayTunnelHost.prototype, "start")
        .callsFake(async (): Promise<void> => {});
      sandbox
        .stub(TunnelManagementHttpClient.prototype, "getTunnel")
        .callsFake(
          async (tunnel: Tunnel, options?: TunnelRequestOptions): Promise<Tunnel | null> => {
            const result = Object.assign({}, tunnel);
            result.endpoints = [
              {
                connectionMode: TunnelConnectionMode.TunnelRelay,
                portUriFormat: `${tunnel.tunnelId}-{port}.${tunnel.clusterId}.example.com`,
                hostId: "some host id",
              },
            ];
            return result;
          }
        );
      const existingTunnelId = "testtunnel";
      const existingTunnelClusterId = "testcluster";
      const manager = new MicrosoftTunnelingManager(async () => "fake token");

      // Act
      const result = await manager.startTunnelHost([3978, 3000], {
        tunnelsClusterId: existingTunnelClusterId,
        tunnelsId: existingTunnelId,
      });

      // Assert
      chai.assert.deepEqual(Array.from(result.portEndpoints.entries()).sort(), [
        [3000, "testtunnel-3000.testcluster.example.com"],
        [3978, "testtunnel-3978.testcluster.example.com"],
      ]);
      chai.assert.deepEqual(result.tunnelInfo, {
        tunnelsClusterId: existingTunnelClusterId,
        tunnelsId: existingTunnelId,
      });
    });
    it("Tunnel expiration", () => {});
    it("Need onboarding", () => {});
    it("Host did not shut down cleanly", () => {});
  });

  describe("stopTunnelsHost()", () => {
    const sandbox = sinon.createSandbox();
    beforeEach(() => {});
    afterEach(() => {
      sandbox.restore();
    });
    it("Can stop host while running", async () => {
      // Arrange
      let disposeCalled = false;
      sandbox.stub(TunnelRelayTunnelHost.prototype, "dispose").callsFake(async () => {
        disposeCalled = true;
      });
      sandbox
        .stub(TunnelRelayTunnelHost.prototype, "start")
        .callsFake(async (): Promise<void> => {});
      sandbox
        .stub(TunnelManagementHttpClient.prototype, "getTunnel")
        .callsFake(
          async (tunnel: Tunnel, options?: TunnelRequestOptions): Promise<Tunnel | null> => {
            const result = Object.assign({}, tunnel);
            result.endpoints = [
              {
                connectionMode: TunnelConnectionMode.TunnelRelay,
                portUriFormat: `${tunnel.tunnelId}-{port}.${tunnel.clusterId}.example.com`,
                hostId: "some host id",
              },
            ];
            return result;
          }
        );
      const manager = new MicrosoftTunnelingManager(async () => "fake token");

      // Act
      await manager.startTunnelHost([3978, 3000], {
        tunnelsClusterId: "test cluster",
        tunnelsId: "test tunnel",
      });
      await manager.stopTunnelHost();

      // Assert
      chai.assert.isTrue(disposeCalled);
    });
  });
});
