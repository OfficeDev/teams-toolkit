// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { Utils } from "../../../../../src/plugins/resource/frontend/utils";

chai.use(chaiAsPromised);

describe("FrontendUtils", async () => {
  describe("execute", async () => {
    it("success", async () => {
      const res = await Utils.execute("echo 1");
      chai.assert.equal(res.trim(), "1");
    });

    it("fail", async () => {
      const res = Utils.execute("deadbeaf");
      chai.expect(res).be.rejectedWith(Error);
    });
  });
});
