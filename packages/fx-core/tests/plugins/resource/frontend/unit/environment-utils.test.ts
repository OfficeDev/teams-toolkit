// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import fs, { PathLike } from "fs-extra";
import * as dotenv from "dotenv";

import sinon from "sinon";
import { EnvironmentUtils } from "../../../../../src/plugins/resource/frontend/utils/environment-utils";
import { EnvironmentVariables } from "../../../../../src/plugins/resource/frontend/constants";

chai.use(chaiAsPromised);

describe("EnvironmentUtils", async () => {
  beforeEach(() => {});

  afterEach(() => {
    sinon.restore();
  });

  const fakePath = "fake-path";
  const fakePropertyKey = "fake-property-key";
  const fakePropertyValue = "fake-property-value";
  const fakeVariables = { [fakePropertyKey]: fakePropertyValue };
  const fakeEnv = `${fakePropertyKey}=${fakePropertyValue}\r\n`;

  it("write environments", async () => {
    sinon.stub(fs, "ensureFile").resolves(Buffer.from(""));
    sinon.stub(fs, "writeFile").callsFake((path: number | PathLike, data: any) => {
      chai.assert.equal(fakeEnv, data);
    });
    EnvironmentUtils.writeEnvironments(fakePath, fakeVariables);
    sinon.restore();
  });

  it("read environments", async () => {
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").resolves(Buffer.from(fakeEnv));
    const envs = await EnvironmentUtils.readEnvironments(fakePath);
    if (envs === undefined) {
      chai.assert.fail("Read environments failed with undefined value");
    }
    chai.assert.equal(envs[fakePropertyKey], fakePropertyValue);
    sinon.restore();
  });

  it("update environment", async () => {
    sinon.stub(fs, "ensureFile").resolves(Buffer.from(""));
    sinon.stub(fs, "readFile").resolves(Buffer.from(fakeEnv));

    const functionEnv = {
      defaultName: "fake-function-name",
      endpoint: "fake-function-endpoint",
    };

    const runtimeEnv = {
      endpoint: "fake-runtime-endpoint",
      startLoginPageUrl: "fake-start-login-page-url",
    };

    const aadEnv = {
      clientId: "fake-aad-client-id",
    };
    sinon.stub(fs, "writeFile").callsFake((path: number | PathLike, data: any) => {
      const configs = dotenv.parse(data);
      chai.assert.equal(configs[fakePropertyKey], fakePropertyValue);
      chai.assert.equal(configs[EnvironmentVariables.FuncName], functionEnv["defaultName"]);
      chai.assert.equal(configs[EnvironmentVariables.FuncEndpoint], functionEnv["endpoint"]);
      chai.assert.equal(
        configs[EnvironmentVariables.StartLoginPage],
        runtimeEnv["startLoginPageUrl"]
      );
      chai.assert.equal(configs[EnvironmentVariables.RuntimeEndpoint], runtimeEnv["endpoint"]);
      chai.assert.equal(configs[EnvironmentVariables.ClientID], aadEnv.clientId);
    });
    await EnvironmentUtils.updateEnvironment(fakePath, runtimeEnv, aadEnv, functionEnv);
  });
});
