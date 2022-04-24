// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect } from "chai";
import "mocha";
import { Duplex } from "stream";
import sinon from "sinon";
import { MemoryCache } from "../../../src/providers/token/memoryCache";

describe("memoryCache", () => {
  it("memoryCache", () => {
    const mc = new (MemoryCache as any)();
    assert(mc["_entries"], [] as any);

    const fake = sinon.fake();
    mc.add(
      [
        {
          key: "test value",
        },
      ],
      fake
    );
    expect(mc.size()).equal(1);
    assert.isTrue(fake.getCall(0).lastArg === true);

    mc.find({ key: "test value" }, fake);
    assert.deepEqual(fake.getCall(1).lastArg, [{ key: "test value" }]);

    mc.add(
      [
        {
          key: "test value 1",
        },
      ],
      fake
    );
    mc.remove({ key: "test value 1" }, fake);
    assert.equal(fake.callCount, 4);

    mc.find({ key: "test value 1" }, fake);
    assert.isNull(fake.getCall(5));

    mc.add(
      [
        {
          key: "test value",
        },
      ],
      fake
    );
    assert.isNull(fake.getCall(6));
  });
});
