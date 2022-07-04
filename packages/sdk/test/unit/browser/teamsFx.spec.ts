// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken, GetTokenOptions, TokenCredential } from "@azure/identity";
import * as sinon from "sinon";
import { TeamsFx } from "../../../src/index.browser";

describe("TeamsFx Tests - Browser", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should not have breaking change for the interface", () => {
    const teamsfx = new TeamsFx();
    const scope = ["User.Read"];

    // Breaking changes in TeamsFx class for below interfaces may break graph toolkit teamsfx auth provider
    // Please contact rentu@microsoft.com before you making breaking changes for this class
    sinon
      .stub(TeamsFx.prototype, "login")
      .callsFake(async (scopes: string | string[]): Promise<void> => {});

    sinon.stub(TeamsFx.prototype, "getCredential").callsFake((): TokenCredential => {
      return {
        getToken: async (
          scopes: string | string[],
          options?: GetTokenOptions
        ): Promise<AccessToken | null> => {
          return null;
        },
      };
    });
    teamsfx.getCredential().getToken(scope);
    teamsfx.login(scope);
  });
});
