// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import * as chai from "chai";
import { ok } from "@microsoft/teamsfx-api";
import { TunnelAccessScopes } from "@vs/tunnels-contracts";
import { TunnelRelayTunnelHost } from "@vs/tunnels-connections";
import { MicrosoftTunnelingService } from "../../../src/common/local/microsoftTunnelingService";
import { MicrosoftTunnelingError } from "../../../src/common/local/microsoftTunnelingError";

describe("MicrosoftTunnelingService", () => {
  describe("hostStart()", () => {
    const sandbox = sinon.createSandbox();
    beforeEach(() => {});
    afterEach(() => {
      sandbox.restore();
    });

    it("should not allow host start without access tokens", async () => {
      // Arrange
      const service = new MicrosoftTunnelingService(async () => ok("fake token"));
      sandbox
        .stub(TunnelRelayTunnelHost.prototype, "start")
        .callsFake(async (): Promise<void> => {});

      // Act
      const result = await service.hostStart({
        tunnelId: "fake id",
        clusterId: "fake cluster id",
        ports: [
          {
            portNumber: 3978,
          },
        ],
        accessTokens: {},
      });

      // Assert
      chai.assert.isTrue(result.isErr());
      chai.assert.instanceOf(result._unsafeUnwrapErr(), MicrosoftTunnelingError);
    });

    it("should not allow host start without ports", async () => {
      // Arrange
      const service = new MicrosoftTunnelingService(async () => ok("fake token"));
      sandbox
        .stub(TunnelRelayTunnelHost.prototype, "start")
        .callsFake(async (): Promise<void> => {});

      // Act
      const result = await service.hostStart({
        tunnelId: "fake id",
        clusterId: "fake cluster id",
        ports: [],
        accessTokens: {
          [TunnelAccessScopes.Host]: "fake host token",
          [TunnelAccessScopes.Connect]: "fake connect token",
        },
      });

      // Assert
      chai.assert.isTrue(result.isErr());
      chai.assert.instanceOf(result._unsafeUnwrapErr(), MicrosoftTunnelingError);
    });
  });
});
