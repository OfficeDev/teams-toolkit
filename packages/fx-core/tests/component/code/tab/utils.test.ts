// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as faker from "faker";
import chaiAsPromised from "chai-as-promised";
import { isKvPairEqual } from "../../../../src/component/utils/common";
import { execute } from "../../../../src/component/code/utils";

chai.use(chaiAsPromised);

describe("FrontendUtils", async () => {
  describe("execute", async () => {
    it("success", async () => {
      const res = await execute("echo 1");
      chai.assert.equal(res.trim(), "1");
    });

    it("fail", async () => {
      const res = execute("wrong command");
      chai.expect(res).be.rejectedWith(Error);
    });

    it("should fail but still get stdout", function () {
      const res = execute("echo 1 && wrong command");
      chai.expect(res).be.rejectedWith(Error);
    });
  });

  describe("isKvPairEqual", async () => {
    const length = 10;
    const keys = Array.from(Array(length), () => faker.unique(faker.lorem.word));
    const values = Array.from(Array(length), () => faker.unique(faker.lorem.word));

    it("kv pairs equal", async () => {
      // arrange
      const kv1: { [key: string]: string } = {};
      const kv2: { [key: string]: string } = {};
      for (let i = 0; i < length; i++) {
        kv1[keys[i]] = values[i];
        kv2[keys[length - 1 - i]] = values[length - 1 - i];
      }

      // act
      const res = isKvPairEqual(kv1, kv2);

      // assert
      chai.assert.isTrue(res);
      chai.assert.notEqual(JSON.stringify(kv1), JSON.stringify(kv2));
    });

    it("kv pairs not equal", async () => {
      // arrange
      const kv1: { [key: string]: string } = {};
      const kv2: { [key: string]: string } = {};
      for (let i = 0; i < length; i++) {
        kv1[keys[i]] = values[i];
        kv2[keys[length - 1 - i]] = values[i];
      }

      // act
      const res = isKvPairEqual(kv1, kv2);

      // assert
      chai.assert.isFalse(res);
      chai.assert.notEqual(JSON.stringify(kv1), JSON.stringify(kv2));
    });
  });
});
