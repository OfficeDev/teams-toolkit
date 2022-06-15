// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as sinon from "sinon";
import { expect } from "../../utils";
import cliLogger from "../../../../src/commonlib/log";
import m365LoginInstance, { M365Login } from "../../../../src/commonlib/m365Login";
import { signedIn, signedOut } from "../../../../src/commonlib/common/constant";
import { getTeamsAppInternalId } from "../../../../src/cmds/preview/teamsAppInstallation";
import {
  GetTeamsAppInstallationFailed,
  M365AccountInfoNotFound,
} from "../../../../src/cmds/preview/errors";
import axios from "axios";
import { ok } from "@microsoft/teamsfx-api";

describe("teamsAppInstallation", () => {
  const sandbox = sinon.createSandbox();

  before(() => {
    sandbox.stub(cliLogger, "necessaryLog").callsFake(() => {});
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("getTeamsAppInternalId", () => {
    const appId = "appId";
    const oid = "oid";
    const token = "token";
    const internalId = "internalId";
    const response = {
      data: {
        value: [
          {
            teamsApp: {
              distributionMethod: "sideloaded",
              id: internalId,
            },
          },
        ],
      },
    };

    it("not signed", async () => {
      sandbox.stub(m365LoginInstance as M365Login, "getStatus").returns(
        Promise.resolve(
          ok({
            status: signedOut,
            accountInfo: undefined,
            token: undefined,
          })
        )
      );
      expect(getTeamsAppInternalId(appId)).to.be.rejectedWith(M365AccountInfoNotFound());
    });

    it("happy path", async () => {
      sandbox.stub(m365LoginInstance as M365Login, "getStatus").returns(
        Promise.resolve(
          ok({
            status: signedIn,
            accountInfo: {
              oid,
            },
            token,
          })
        )
      );
      sandbox.stub(axios, "get").returns(Promise.resolve(response));
      expect(await getTeamsAppInternalId(appId)).to.deep.equals(internalId);
    });

    it("axios.get exception", async () => {
      sandbox.stub(m365LoginInstance as M365Login, "getStatus").returns(
        Promise.resolve(
          ok({
            status: signedIn,
            accountInfo: {
              oid,
            },
            token,
          })
        )
      );
      sandbox.stub(axios, "get").throws("500");
      expect(getTeamsAppInternalId(appId)).to.be.rejectedWith(
        GetTeamsAppInstallationFailed(new Error("500"))
      );
    });
  });
});
