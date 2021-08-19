// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import fs, { PathLike } from "fs-extra";

import sinon from "sinon";
import { EnvironmentUtils } from "../../../../../src/plugins/resource/frontend/utils/environment-utils";

chai.use(chaiAsPromised);

describe("EnvironmentUtils", async () => {
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
    sinon.stub(fs, "readFile").resolves(Buffer.from(""));
    sinon.stub(fs, "writeFile").callsFake((path: number | PathLike, data: any) => {
      chai.assert.equal(fakeEnv, data);
    });
    EnvironmentUtils.writeEnvironments(fakePath, fakeVariables);
  });

  it("read environments", async () => {
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").resolves(Buffer.from(fakeEnv));
    const envs = await EnvironmentUtils.readEnvironments(fakePath);
    if (envs === undefined) {
      chai.assert.fail("Read environments failed with undefined value");
    }
    chai.assert.equal(envs[fakePropertyKey], fakePropertyValue);
  });
});
