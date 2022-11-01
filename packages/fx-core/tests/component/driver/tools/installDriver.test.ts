// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import chai from "chai";

import { ToolsInstallDriver } from "../../../../src/component/driver/tools/installDriver";
import { MockedLogProvider, MockedUserInteraction } from "../../../plugins/solution/util";
import { DriverContext } from "../../../../src/component/driver/interface/commonArgs";
import { LocalCertificateManager } from "../../../../src/common/local/localCertificateManager";
import { UserError } from "@microsoft/teamsfx-api";
import { CoreSource } from "../../../../src/core/error";

describe("Tools Install Driver test", () => {
  const sandbox = sinon.createSandbox();
  const toolsInstallDriver = new ToolsInstallDriver();
  const mockedDriverContext = {
    logProvider: new MockedLogProvider(),
    ui: new MockedUserInteraction(),
  } as DriverContext;

  afterEach(() => {
    sandbox.restore();
  });

  it("Create and trust new local certificate", async () => {
    sandbox.stub(LocalCertificateManager.prototype, "setupCertificate").resolves({
      certPath: "testCertPath",
      keyPath: "testKeyPath",
      isTrusted: true,
      alreadyTrusted: false,
    });
    const res = await toolsInstallDriver.run({ devCert: { trust: true } }, mockedDriverContext);
    chai.assert.isTrue(res.isOk());
    if (res.isOk()) {
      chai.assert.includeDeepMembers(
        [
          ["SSL_CRT_FILE", "testCertPath"],
          ["SSL_KEY_FILE", "testKeyPath"],
        ],
        Array.from(res.value.entries())
      );
    }
  });

  it("Already trust local certificate", async () => {
    sandbox.stub(LocalCertificateManager.prototype, "setupCertificate").resolves({
      certPath: "testCertPath",
      keyPath: "testKeyPath",
      isTrusted: true,
      alreadyTrusted: true,
    });
    const res = await toolsInstallDriver.run({ devCert: { trust: true } }, mockedDriverContext);
    chai.assert.isTrue(res.isOk());
    if (res.isOk()) {
      chai.assert.includeDeepMembers(
        [
          ["SSL_CRT_FILE", "testCertPath"],
          ["SSL_KEY_FILE", "testKeyPath"],
        ],
        Array.from(res.value.entries())
      );
    }
  });

  it("Skip trust new local certificate", async () => {
    sandbox.stub(LocalCertificateManager.prototype, "setupCertificate").resolves({
      certPath: "testCertPath",
      keyPath: "testKeyPath",
      isTrusted: undefined,
      alreadyTrusted: undefined,
    });
    const res = await toolsInstallDriver.run({ devCert: { trust: false } }, mockedDriverContext);
    chai.assert.isTrue(res.isOk());
    if (res.isOk()) {
      chai.assert.isEmpty(res.value.entries());
    }
  });

  it("Failed to trust new local certificate", async () => {
    sandbox.stub(LocalCertificateManager.prototype, "setupCertificate").resolves({
      certPath: "testCertPath",
      keyPath: "testKeyPath",
      isTrusted: false,
      error: new UserError({
        error: new Error("test error"),
        source: CoreSource,
        name: "SetupCertificateError",
      }),
    });
    const res = await toolsInstallDriver.run({ devCert: { trust: true } }, mockedDriverContext);
    chai.assert.isTrue(res.isErr());
  });
});
