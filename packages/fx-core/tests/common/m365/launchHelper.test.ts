// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import sinon from "sinon";

import { err, ok } from "@microsoft/teamsfx-api";

import { Hub } from "../../../src/common/m365/constants";
import { LaunchHelper } from "../../../src/common/m365/launchHelper";
import { MockM365TokenProvider } from "../../core/utils";
import { PackageService } from "../../../src/common/m365/packageService";
import { NotExtendedToM365Error } from "../../../src/common/m365/errors";
import { HubTypes } from "../../../src/question";

describe("LaunchHelper", () => {
  const m365TokenProvider = new MockM365TokenProvider();
  const launchHelper = new LaunchHelper(m365TokenProvider);

  afterEach(() => {
    sinon.restore();
  });

  describe("getLaunchUrl", () => {
    it("getLaunchUrl: Teams, signed in", async () => {
      sinon.stub(m365TokenProvider, "getStatus").resolves(
        ok({
          status: "",
          accountInfo: {
            tid: "test-tid",
            upn: "test-upn",
          },
        })
      );
      const result = await launchHelper.getLaunchUrl(HubTypes.teams, "test-id", ["staticTab"]);
      chai.assert(result.isOk());
      chai.assert.equal(
        (result as any).value,
        "https://teams.microsoft.com/l/app/test-id?installAppPackage=true&webjoin=true&appTenantId=test-tid&login_hint=test-upn"
      );
    });

    it("Teams, signed out", async () => {
      sinon.stub(m365TokenProvider, "getStatus").resolves(
        ok({
          status: "",
        })
      );
      const result = await launchHelper.getLaunchUrl(HubTypes.teams, "test-id", ["staticTab"]);
      chai.assert(result.isOk());
      chai.assert.equal(
        (result as any).value,
        "https://teams.microsoft.com/l/app/test-id?installAppPackage=true&webjoin=true&login_hint=login_your_m365_account"
      );
    });

    it("Outlook, staticTab, acquired, signed in", async () => {
      sinon.stub(m365TokenProvider, "getStatus").resolves(
        ok({
          status: "",
          accountInfo: {
            tid: "test-tid",
            upn: "test-upn",
          },
        })
      );
      sinon.stub(LaunchHelper.prototype, <any>"getM365AppId").resolves(ok("test-app-id"));
      const result = await launchHelper.getLaunchUrl(HubTypes.outlook, "test-id", ["staticTab"]);
      chai.assert(result.isOk());
      chai.assert.equal(
        (result as any).value,
        "https://outlook.office.com/host/test-app-id?login_hint=test-upn"
      );
    });

    it("Outlook, staticTab, unacquired, signed in", async () => {
      sinon.stub(m365TokenProvider, "getStatus").resolves(
        ok({
          status: "",
          accountInfo: {
            tid: "test-tid",
            upn: "test-upn",
          },
        })
      );
      sinon.stub(LaunchHelper.prototype, <any>"getM365AppId").resolves(err({ foo: "bar" }));
      const result = await launchHelper.getLaunchUrl(HubTypes.outlook, "test-id", ["staticTab"]);
      chai.assert(result.isErr());
      chai.assert.deepEqual((result as any).error, { foo: "bar" });
    });

    it("Outlook, Bot, signed in", async () => {
      sinon.stub(m365TokenProvider, "getStatus").resolves(
        ok({
          status: "",
          accountInfo: {
            tid: "test-tid",
            upn: "test-upn",
          },
        })
      );
      sinon.stub(LaunchHelper.prototype, <any>"getM365AppId").resolves(ok("test-app-id"));
      const result = await launchHelper.getLaunchUrl(HubTypes.outlook, "test-id", ["Bot"]);
      chai.assert(result.isOk());
      chai.assert.equal(
        (result as any).value,
        "https://outlook.office.com/mail?login_hint=test-upn"
      );
    });

    it("Outlook, signed in", async () => {
      sinon.stub(m365TokenProvider, "getStatus").resolves(
        ok({
          status: "",
          accountInfo: {
            tid: "test-tid",
            upn: "test-upn",
          },
        })
      );
      sinon.stub(LaunchHelper.prototype, <any>"getM365AppId").resolves(ok("test-app-id"));
      const result = await launchHelper.getLaunchUrl(HubTypes.office, "test-id", ["Bot"]);
      chai.assert(result.isOk());
      chai.assert.equal(
        (result as any).value,
        "https://www.office.com/m365apps/test-app-id?auth=2&login_hint=test-upn"
      );
    });
  });

  describe("getM365AppId", () => {
    it("getAccessToken error", async () => {
      sinon.stub(m365TokenProvider, "getAccessToken").resolves(err({ foo: "bar" } as any));
      const result = await launchHelper.getM365AppId("test-id");
      chai.assert(result.isErr());
      chai.assert.deepEqual((result as any).error, { foo: "bar" });
    });

    it("retrieveAppId 404", async () => {
      sinon.stub(m365TokenProvider, "getAccessToken").resolves(ok(""));
      sinon
        .stub(PackageService.prototype, "retrieveAppId")
        .rejects(new NotExtendedToM365Error("test"));
      const result = await launchHelper.getM365AppId("test-id");
      chai.assert(result.isErr());
      chai.assert.deepEqual((result as any).error.name, "NotExtendedToM365Error");
    });

    it("retrieveAppId undefined", async () => {
      sinon.stub(m365TokenProvider, "getAccessToken").resolves(ok(""));
      sinon.stub(PackageService.prototype, "retrieveAppId").resolves(undefined);
      const result = await launchHelper.getM365AppId("test-id");
      chai.assert(result.isErr());
      chai.assert.deepEqual((result as any).error.name, "NotExtendedToM365Error");
    });

    it("happy path", async () => {
      sinon.stub(m365TokenProvider, "getAccessToken").resolves(ok(""));
      sinon.stub(PackageService.prototype, "retrieveAppId").resolves("test-app-id");
      const result = await launchHelper.getM365AppId("test-id");
      chai.assert(result.isOk());
      chai.assert.deepEqual((result as any).value, "test-app-id");
    });
  });
});
