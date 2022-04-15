// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import {
  CertificateAuthProvider,
  createPemCertOption,
  createPfxCertOption,
  ErrorCode,
  ErrorWithCode,
} from "../../../src";
import * as chaiPromises from "chai-as-promised";

chaiUse(chaiPromises);

describe("CertificateAuthProvider Tests - Node", () => {
  it("should add PEM cert to https agent", async function () {
    const certificateTokenAuthProvider = new CertificateAuthProvider({
      cert: "test cert",
      key: "test key",
      passphrase: "test passphrase",
      ca: "test ca",
    });

    const updatedConfig = await certificateTokenAuthProvider.AddAuthenticationInfo({});

    assert.equal(updatedConfig.httpsAgent.options.cert, "test cert");
    assert.equal(updatedConfig.httpsAgent.options.key, "test key");
    assert.equal(updatedConfig.httpsAgent.options.passphrase, "test passphrase");
    assert.equal(updatedConfig.httpsAgent.options.ca, "test ca");
  });

  it("should add pfx cert to https agent", async function () {
    const certificateTokenAuthProvider = new CertificateAuthProvider({
      pfx: "test pfx",
      passphrase: "test passphrase",
    });

    const updatedConfig = await certificateTokenAuthProvider.AddAuthenticationInfo({});

    assert.equal(updatedConfig.httpsAgent.options.pfx, "test pfx");
    assert.equal(updatedConfig.httpsAgent.options.passphrase, "test passphrase");
  });

  it("should update existing https agent", async function () {
    const certificateTokenAuthProvider = new CertificateAuthProvider({
      cert: "test cert",
      key: "test key",
      passphrase: "test passphrase",
      ca: "test ca",
    });

    const updatedConfig = await certificateTokenAuthProvider.AddAuthenticationInfo({
      httpsAgent: {
        options: {
          rejectUnauthorized: true,
        },
      },
    });

    assert.equal(updatedConfig.httpsAgent.options.cert, "test cert");
    assert.equal(updatedConfig.httpsAgent.options.key, "test key");
    assert.equal(updatedConfig.httpsAgent.options.passphrase, "test passphrase");
    assert.equal(updatedConfig.httpsAgent.options.ca, "test ca");
    assert.equal(updatedConfig.httpsAgent.options.rejectUnauthorized, true);
  });

  it("should throw error if conflict with existing https agent options", async function () {
    const certificateTokenAuthProvider = new CertificateAuthProvider({
      cert: "test cert",
      key: "test key",
      passphrase: "test passphrase",
      ca: "test ca",
    });

    const error: ErrorWithCode = await expect(
      certificateTokenAuthProvider.AddAuthenticationInfo({
        httpsAgent: {
          options: {
            cert: "existing cert",
          },
        },
      })
    ).to.eventually.be.rejectedWith(ErrorWithCode);

    assert.equal(error.code, ErrorCode.InvalidParameter);
    assert.equal(error.message, "Axios HTTPS agent already defined value for property cert");
  });

  it("should throw error if pass empty parameter to constructor", async function () {
    expect(() => new CertificateAuthProvider({}))
      .to.throw("Parameter certOption is empty")
      .that.has.property("code")
      .that.equals(ErrorCode.InvalidParameter);
  });
});

describe("createPfxCertOption Tests - Node", () => {
  it("should initialize SecureContextOption with correct property", async function () {
    const pfxWithNecessaryParameters = createPfxCertOption("test pfx");
    assert.equal(Object.keys(pfxWithNecessaryParameters).length, 2);
    assert.equal(pfxWithNecessaryParameters.pfx, "test pfx");
    assert.equal(pfxWithNecessaryParameters.passphrase, undefined);

    const pfxWithAllParameters = createPfxCertOption("test pfx", { passphrase: "test passphrase" });
    assert.equal(Object.keys(pfxWithAllParameters).length, 2);
    assert.equal(pfxWithAllParameters.pfx, "test pfx");
    assert.equal(pfxWithAllParameters.passphrase, "test passphrase");
  });

  it("should throw error if user passes empty parameter", async function () {
    expect(() => createPfxCertOption(""))
      .to.throw("Parameter pfx is empty")
      .that.has.property("code")
      .that.equals(ErrorCode.InvalidParameter);
  });
});

describe("createPemCertOption Tests - Node", () => {
  it("should initialize SecureContextOption with correct property", async function () {
    const pemWithNecessaryParameters = createPemCertOption("test cert", "test key");
    assert.equal(Object.keys(pemWithNecessaryParameters).length, 4);
    assert.equal(pemWithNecessaryParameters.cert, "test cert");
    assert.equal(pemWithNecessaryParameters.key, "test key");
    assert.equal(pemWithNecessaryParameters.passphrase, undefined);
    assert.equal(pemWithNecessaryParameters.ca, undefined);

    const pemWithAllParameters = createPemCertOption("test cert", "test key", {
      passphrase: "test passphrase",
      ca: "test ca",
    });
    assert.equal(Object.keys(pemWithAllParameters).length, 4);
    assert.equal(pemWithAllParameters.cert, "test cert");
    assert.equal(pemWithAllParameters.key, "test key");
    assert.equal(pemWithAllParameters.passphrase, "test passphrase");
    assert.equal(pemWithAllParameters.ca, "test ca");
  });

  it("should throw error if user passes empty parameter", async function () {
    expect(() => createPemCertOption("", ""))
      .to.throw("Parameter cert is empty")
      .that.has.property("code")
      .that.equals(ErrorCode.InvalidParameter);

    expect(() => createPemCertOption("test cert", ""))
      .to.throw("Parameter key is empty")
      .that.has.property("code")
      .that.equals(ErrorCode.InvalidParameter);
  });
});
