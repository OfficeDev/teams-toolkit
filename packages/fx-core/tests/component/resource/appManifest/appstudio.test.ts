// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import sinon from "sinon";
import { MockLogProvider, MockM365TokenProvider } from "../../../core/utils";
import { err, ok, UserError } from "@microsoft/teamsfx-api";
import { checkIfAppInDifferentAcountSameTenant } from "../../../../src/component/resource/appManifest/appStudio";
import { AppStudioClient } from "../../../../src/component/resource/appManifest/appStudioClient";

describe("appStudio", () => {
  const sandbox = sinon.createSandbox();
  describe("checkIfAppInDifferentAcountSameTenant", () => {
    const logger = new MockLogProvider();
    const teamsAppId = "teams";
    const m365TokenProvider = new MockM365TokenProvider();

    afterEach(() => {
      sandbox.restore();
    });

    it("get app successfully: returns false", async () => {
      m365TokenProvider.getAccessToken = sandbox.stub().returns(ok("token"));
      sandbox.stub(AppStudioClient, "getApp").resolves();

      const res = await checkIfAppInDifferentAcountSameTenant(
        teamsAppId,
        m365TokenProvider,
        logger
      );
      chai.assert.isTrue(res.isOk());

      if (res.isOk()) {
        chai.assert.isFalse(res.value);
      }
    });

    it("get token error: returns error", async () => {
      m365TokenProvider.getAccessToken = sandbox
        .stub()
        .returns(err(new UserError("token", "token", "", "")));

      const res = await checkIfAppInDifferentAcountSameTenant(
        teamsAppId,
        m365TokenProvider,
        logger
      );
      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.equal(res.error.name, "token");
      }
    });

    it("app in tenant but different account: returns true", async () => {
      m365TokenProvider.getAccessToken = sandbox.stub().returns(ok("token"));
      sandbox.stub(AppStudioClient, "getApp").throws({ message: "404" });
      sandbox.stub(AppStudioClient, "checkExistsInTenant").returns(Promise.resolve(true));
      const res = await checkIfAppInDifferentAcountSameTenant(
        teamsAppId,
        m365TokenProvider,
        logger
      );
      chai.assert.isTrue(res.isOk());

      if (res.isOk()) {
        chai.assert.isTrue(res.value);
      }
    });

    it("get app error (not 404): returns false", async () => {
      m365TokenProvider.getAccessToken = sandbox.stub().returns(ok("token"));
      sandbox.stub(AppStudioClient, "getApp").throws({ message: "401" });
      const res = await checkIfAppInDifferentAcountSameTenant(
        teamsAppId,
        m365TokenProvider,
        logger
      );
      chai.assert.isTrue(res.isOk());

      if (res.isOk()) {
        chai.assert.isFalse(res.value);
      }
    });
  });
});
