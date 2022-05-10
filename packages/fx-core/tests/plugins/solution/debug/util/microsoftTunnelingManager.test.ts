// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import * as chai from "chai";
import { MicrosoftTunnelingManager } from "../../../../../src/plugins/solution/fx-solution/debug/util/microsoftTunnelingManager";
import { TunnelManagementHttpClient, TunnelRequestOptions } from "@vs/tunnels-management";
import { Tunnel, TunnelConnectionMode, TunnelPort } from "@vs/tunnels-contracts";
import { MockedV2Context } from "../../util";
import { EnvInfoV2 } from "@microsoft/teamsfx-api/build/v2";
import { PluginNames } from "../../../../../src/plugins/solution/fx-solution/constants";
import { environmentManager } from "../../../../../src/core/environment";
import { TunnelRelayTunnelHost } from "@vs/tunnels-connections";

describe("MicrosoftTunnelingManager", () => {
  describe("startTunnelsHost()", () => {
    const sandbox = sinon.createSandbox();
    let ctx: MockedV2Context;
    beforeEach(() => {
      const projectSetting = {
        appName: "test app",
        projectId: "d984d788-6f33-476a-b6ec-d75867891ea7",
        solutionSettings: {
          name: "fx-solution-azure",
          hostType: "Azure",
          capabilities: ["Bot"],
          azureResources: [],
          activeResourcePlugins: ["fx-resource-bot"],
        },
        programmingLanguage: "typescript",
      };
      ctx = new MockedV2Context(projectSetting);
    });
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
      const manager = new MicrosoftTunnelingManager("fake token");
      const localEnvInfo: EnvInfoV2 = {
        envName: environmentManager.getLocalEnvName(),
        state: {}, // empty state.local.json
        config: {},
      };

      // Act
      const portMapping = await manager.startTunnelHost(ctx, localEnvInfo, [3978, 3000]);

      // Assert
      chai.assert.deepEqual(Array.from(portMapping.entries()).sort(), [
        [3000, "3000 url"],
        [3978, "3978 url"],
      ]);
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
      const manager = new MicrosoftTunnelingManager("fake token");
      const localEnvInfo: EnvInfoV2 = {
        envName: environmentManager.getLocalEnvName(),
        state: {
          [PluginNames.SOLUTION]: {
            tunnelsId: "testtunnel",
            tunnelsClusterId: "testcluster",
          },
        },
        // empty state.local.json
        config: {},
      };

      // Act
      const portMapping = await manager.startTunnelHost(ctx, localEnvInfo, [3978, 3000]);

      // Assert
      chai.assert.deepEqual(Array.from(portMapping.entries()).sort(), [
        [3000, "testtunnel-3000.testcluster.example.com"],
        [3978, "testtunnel-3978.testcluster.example.com"],
      ]);
    });
    it("Tunnel expiration", () => {});
    it("Need onboarding", () => {});
    it("Host did not shut down cleanly", () => {});
  });

  describe("stopTunnelsHost()", () => {
    const sandbox = sinon.createSandbox();
    let ctx: MockedV2Context;
    beforeEach(() => {
      const projectSetting = {
        appName: "test app",
        projectId: "d984d788-6f33-476a-b6ec-d75867891ea7",
        solutionSettings: {
          name: "fx-solution-azure",
          hostType: "Azure",
          capabilities: ["Bot"],
          azureResources: [],
          activeResourcePlugins: ["fx-resource-bot"],
        },
        programmingLanguage: "typescript",
      };
      ctx = new MockedV2Context(projectSetting);
    });
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
      const manager = new MicrosoftTunnelingManager("fake token");
      const localEnvInfo: EnvInfoV2 = {
        envName: environmentManager.getLocalEnvName(),
        state: {
          [PluginNames.SOLUTION]: {
            tunnelsId: "testtunnel",
            tunnelsClusterId: "testcluster",
          },
        },
        // empty state.local.json
        config: {},
      };

      // Act
      await manager.startTunnelHost(ctx, localEnvInfo, [3978, 3000]);
      await manager.stopTunnelHost();

      // Assert
      chai.assert.isTrue(disposeCalled);
    });
  });
});
