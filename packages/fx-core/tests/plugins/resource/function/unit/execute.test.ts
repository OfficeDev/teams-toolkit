// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { FunctionPluginInfo } from "../../../../../src/plugins/resource/function/constants";
import { execute } from "../../../../../src/plugins/resource/function/utils/execute";

chai.use(chaiAsPromised);

describe(FunctionPluginInfo.pluginName, async () => {
  describe("Execute Test", async () => {
    it("Test execute success", async () => {
      // Arrange

      // Act
      const res = await execute("echo 1");

      // Assert
      chai.assert.equal(res.trim(), "1");
    });

    it("Test execute fail", async () => {
      // Arrange

      // Act
      const res = execute("deadbeaf");

      // Assert
      chai.expect(res).be.rejectedWith(Error);
    });
  });
});
