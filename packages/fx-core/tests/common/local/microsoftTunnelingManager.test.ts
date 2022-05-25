// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import * as chai from "chai";
import { err, ok, UserError } from "@microsoft/teamsfx-api";
import { MicrosoftTunnelingManager } from "../../../src/common/local/microsoftTunnelingManager";
import { TunnelManagementHttpClient, TunnelRequestOptions } from "@vs/tunnels-management";
import {
  Tunnel,
  TunnelAccessScopes,
  TunnelConnectionMode,
  TunnelProtocol,
} from "@vs/tunnels-contracts";
import { TunnelRelayTunnelHost } from "@vs/tunnels-connections";
import axios from "axios";
import {
  MicrosoftTunnelingLoginError,
  MicrosoftTunnelingNeedOnboardingError,
  MicrosoftTunnelingServiceError,
  MicrosoftTunnelingTimeoutError,
} from "../../../src/common/local/microsoftTunnelingError";
import { CoreSource } from "../../../src/core/error";

function createMockHttpError(status: number): Error {
  return Object.assign(new Error(), { isAxiosError: true, response: { status } });
}

describe("MicrosoftTunnelingManager", () => {
  describe("startTunnelHost()", () => {
    const sandbox = sinon.createSandbox();
    let clock: sinon.SinonFakeTimers;
    beforeEach(() => {
      clock = sinon.useFakeTimers();
    });
    afterEach(() => {
      clock.restore();
      sandbox.restore();
    });

    it("Create tunnel on the first run", async () => {
      // Arrange
      const createdTunnelId = "some random tunnel id";
      const createdTunnelClusterId = "some random tunnel cluster id";
      sandbox
        .stub(TunnelManagementHttpClient.prototype, "createTunnel")
        .callsFake(async (tunnel: Tunnel): Promise<Tunnel> => {
          const additionalProperties: Partial<Tunnel> = {
            tunnelId: createdTunnelId,
            clusterId: createdTunnelClusterId,
            accessTokens: {
              [TunnelAccessScopes.Host]: "fake host token",
              [TunnelAccessScopes.Connect]: "fake connect token",
            },
          };
          return Object.assign(additionalProperties, tunnel);
        });
      sandbox
        .stub(TunnelRelayTunnelHost.prototype, "start")
        .callsFake(async (): Promise<void> => {});
      sandbox
        .stub(TunnelManagementHttpClient.prototype, "getTunnel")
        .callsFake(async (tunnel: Tunnel): Promise<Tunnel | null> => {
          const additionalProperties: Partial<Tunnel> = {
            endpoints: [
              {
                connectionMode: TunnelConnectionMode.TunnelRelay,
                portUriFormat: "{port} url",
                hostId: "some host id",
              },
            ],
          };
          return Object.assign(additionalProperties, tunnel);
        });
      const manager = new MicrosoftTunnelingManager(async () => ok("fake token"));

      // Act
      const result = await manager.startTunnelHost([3978, 3000]);

      // Assert
      chai.assert.isTrue(result.isOk());
      chai.assert.deepEqual(Array.from(result._unsafeUnwrap().portEndpoints.entries()).sort(), [
        [3000, "3000 url"],
        [3978, "3978 url"],
      ]);
      chai.assert.deepEqual(result._unsafeUnwrap().tunnelInfo, {
        tunnelClusterId: createdTunnelClusterId,
        tunnelId: createdTunnelId,
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
        .callsFake(async (tunnel: Tunnel): Promise<Tunnel | null> => {
          const additionalProperties: Partial<Tunnel> = {
            endpoints: [
              {
                connectionMode: TunnelConnectionMode.TunnelRelay,
                portUriFormat: `${tunnel.tunnelId}-{port}.${tunnel.clusterId}.example.com`,
                hostId: "some host id",
              },
            ],
            accessTokens: {
              [TunnelAccessScopes.Host]: "fake host token",
              [TunnelAccessScopes.Connect]: "fake connect token",
            },
            ports: [
              { portNumber: 3978, protocol: TunnelProtocol.Http },
              { portNumber: 3000, protocol: TunnelProtocol.Http },
            ],
          };
          return Object.assign(additionalProperties, tunnel);
        });
      const existingTunnelId = "testtunnel";
      const existingTunnelClusterId = "testcluster";
      const manager = new MicrosoftTunnelingManager(async () => ok("fake token"));

      // Act
      const result = await manager.startTunnelHost([3978, 3000], {
        tunnelClusterId: existingTunnelClusterId,
        tunnelId: existingTunnelId,
      });

      // Assert
      chai.assert.isTrue(result.isOk());
      chai.assert.deepEqual(Array.from(result._unsafeUnwrap().portEndpoints.entries()).sort(), [
        [3000, "testtunnel-3000.testcluster.example.com"],
        [3978, "testtunnel-3978.testcluster.example.com"],
      ]);
      chai.assert.deepEqual(result._unsafeUnwrap().tunnelInfo, {
        tunnelClusterId: existingTunnelClusterId,
        tunnelId: existingTunnelId,
      });
    });

    it("Tunnel expiration", () => {});

    it("Need onboarding", async () => {
      // Arrange
      sandbox.stub(axios, "isAxiosError").callsFake((payload: any) => !!payload.isAxiosError);
      sandbox
        .stub(TunnelManagementHttpClient.prototype, "createTunnel")
        .callsFake(async (): Promise<Tunnel> => {
          throw createMockHttpError(403);
        });
      sandbox
        .stub(TunnelManagementHttpClient.prototype, "getTunnel")
        .callsFake(async (tunnel: Tunnel): Promise<Tunnel | null> => {
          const result = Object.assign({}, tunnel);
          result.endpoints = [
            {
              connectionMode: TunnelConnectionMode.TunnelRelay,
              portUriFormat: "{port} url",
              hostId: "some host id",
            },
          ];
          return result;
        });
      const manager = new MicrosoftTunnelingManager(async () => ok("fake token"));

      // Act
      const result = await manager.startTunnelHost([3978, 3000]);

      // Assert
      chai.assert.isTrue(result.isErr());
      chai.assert.instanceOf(result._unsafeUnwrapErr(), MicrosoftTunnelingNeedOnboardingError);
    });

    it("Service error", async () => {
      // Arrange
      sandbox.stub(axios, "isAxiosError").callsFake((payload: any) => !!payload.isAxiosError);
      sandbox
        .stub(TunnelManagementHttpClient.prototype, "createTunnel")
        .callsFake(async (): Promise<Tunnel> => {
          throw createMockHttpError(500);
        });
      sandbox
        .stub(TunnelManagementHttpClient.prototype, "getTunnel")
        .callsFake(async (tunnel: Tunnel): Promise<Tunnel | null> => {
          const result = Object.assign({}, tunnel);
          result.endpoints = [
            {
              connectionMode: TunnelConnectionMode.TunnelRelay,
              portUriFormat: "{port} url",
              hostId: "some host id",
            },
          ];
          return result;
        });
      const manager = new MicrosoftTunnelingManager(async () => ok("fake token"));

      // Act
      const result = await manager.startTunnelHost([3978, 3000]);

      // Assert
      chai.assert.isTrue(result.isErr());
      chai.assert.instanceOf(result._unsafeUnwrapErr(), MicrosoftTunnelingServiceError);
    });

    it("Host start timeout", async () => {
      // Arrange
      const createdTunnelId = "some random tunnel id";
      const createdTunnelClusterId = "some random tunnel cluster id";
      sandbox
        .stub(TunnelManagementHttpClient.prototype, "createTunnel")
        .callsFake(async (tunnel: Tunnel): Promise<Tunnel> => {
          const additionalProperties: Partial<Tunnel> = {
            tunnelId: createdTunnelId,
            clusterId: createdTunnelClusterId,
            accessTokens: {
              [TunnelAccessScopes.Host]: "fake host token",
              [TunnelAccessScopes.Connect]: "fake connect token",
            },
          };
          return Object.assign(additionalProperties, tunnel);
        });
      sandbox
        .stub(TunnelRelayTunnelHost.prototype, "start")
        .callsFake(async (): Promise<void> => {});
      sandbox
        .stub(TunnelManagementHttpClient.prototype, "getTunnel")
        .callsFake(
          async (tunnel: Tunnel, options?: TunnelRequestOptions): Promise<Tunnel | null> => {
            const result = Object.assign({}, tunnel);
            // return no more endpoint
            result.endpoints = [];
            return result;
          }
        );
      const manager = new MicrosoftTunnelingManager(async () => ok("fake token"));

      // Act
      const tunnelHostPromise = manager.startTunnelHost([3978, 3000]);
      // 12s should be enough for 10s timeout
      await clock.tickAsync(12 * 1000);
      const result = await tunnelHostPromise;

      // Assert
      chai.assert.isTrue(result.isErr());
      chai.assert.instanceOf(result._unsafeUnwrapErr(), MicrosoftTunnelingTimeoutError);
    });

    it("Host did not shut down cleanly", () => {});

    it("M365 Login error", async () => {
      // Arrange
      const manager = new MicrosoftTunnelingManager(async () =>
        err(new UserError(CoreSource, "M365 login error", "M365 login error"))
      );

      // Act
      const result = await manager.startTunnelHost([3978]);

      // Assert
      chai.assert.isTrue(result.isErr());
      chai.assert.instanceOf(result._unsafeUnwrapErr(), MicrosoftTunnelingLoginError);
    });
  });

  describe("stopTunnelHost()", () => {
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
        .callsFake(async (tunnel: Tunnel): Promise<Tunnel | null> => {
          const additionalProperties: Partial<Tunnel> = {
            endpoints: [
              {
                connectionMode: TunnelConnectionMode.TunnelRelay,
                portUriFormat: `${tunnel.tunnelId}-{port}.${tunnel.clusterId}.example.com`,
                hostId: "some host id",
              },
            ],
            accessTokens: {
              [TunnelAccessScopes.Host]: "fake host token",
              [TunnelAccessScopes.Connect]: "fake connect token",
            },
            ports: [{ portNumber: 3978 }],
          };
          return Object.assign(additionalProperties, tunnel);
        });
      const manager = new MicrosoftTunnelingManager(async () => ok("fake token"));

      // Act
      await manager.startTunnelHost([3978, 3000], {
        tunnelClusterId: "test cluster",
        tunnelId: "test tunnel",
      });
      await manager.stopTunnelHost();

      // Assert
      chai.assert.isTrue(disposeCalled);
    });
  });

  describe("checkOnboarded()", () => {
    const sandbox = sinon.createSandbox();
    beforeEach(() => {});
    afterEach(() => {
      sandbox.restore();
    });
    it("onboarded: successful creation", async () => {
      // Arrange
      sandbox
        .stub(TunnelManagementHttpClient.prototype, "createTunnel")
        .callsFake(async (): Promise<Tunnel> => {
          return { tunnelId: "good tunnel id", clusterId: "good cluster id" };
        });
      const manager = new MicrosoftTunnelingManager(async () => ok("fake token"));

      // Act
      const result = await manager.checkOnboarded();

      // Assert
      chai.assert.isTrue(result);
    });
    it("onboarded: tunnel exists", async () => {
      // Arrange
      sandbox
        .stub(TunnelManagementHttpClient.prototype, "createTunnel")
        .callsFake(async (): Promise<Tunnel> => {
          // 409 Conflict: tunnel already exists
          throw createMockHttpError(409);
        });
      const manager = new MicrosoftTunnelingManager(async () => ok("fake token"));

      // Act
      const result = await manager.checkOnboarded();

      // Assert
      chai.assert.isTrue(result);
    });
    it("not onboarded: forbidden", async () => {
      // Arrange
      sandbox
        .stub(TunnelManagementHttpClient.prototype, "createTunnel")
        .callsFake(async (): Promise<Tunnel> => {
          throw createMockHttpError(403);
        });
      const manager = new MicrosoftTunnelingManager(async () => ok("fake token"));

      // Act
      const result = await manager.checkOnboarded();

      // Assert
      chai.assert.isFalse(result);
    });
    it("other HTTP error, assume onboarded and let it fail at the point when running the real operation.", async () => {
      // Arrange
      sandbox
        .stub(TunnelManagementHttpClient.prototype, "createTunnel")
        .callsFake(async (): Promise<Tunnel> => {
          throw createMockHttpError(500);
        });
      const manager = new MicrosoftTunnelingManager(async () => ok("fake token"));

      // Act
      const result = await manager.checkOnboarded();

      // Assert
      chai.assert.isTrue(result);
    });
    it("other error, assume onboarded and let it fail at the point when running the real operation.", async () => {
      // Arrange
      sandbox
        .stub(TunnelManagementHttpClient.prototype, "createTunnel")
        .callsFake(async (): Promise<Tunnel> => {
          throw new Error("unknown error");
        });
      const manager = new MicrosoftTunnelingManager(async () => ok("fake token"));

      // Act
      const result = await manager.checkOnboarded();

      // Assert
      chai.assert.isTrue(result);
    });
  });
});
