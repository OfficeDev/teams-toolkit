// Copyright (c) Microsoft Corporation.

// Licensed under the MIT license.

"use strict";

import { MemoryCache } from "../../../src/commonlib/memoryCache";

import { expect } from "../utils";

describe("memory cache tests", () => {
  it("we can use memorycache anytime", () => {
    /* eslint-disable @typescript-eslint/ban-ts-comment */

    // @ts-ignore

    const m = new MemoryCache();

    expect(m).not.null;
  });

  it("we can get the size of memorycache", () => {
    /* eslint-disable @typescript-eslint/ban-ts-comment */

    // @ts-ignore

    const m = new MemoryCache();

    expect(m.size()).equal(0);
  });

  it("we can add/find/remove stuff in memorycache", () => {
    /* eslint-disable @typescript-eslint/ban-ts-comment */

    // @ts-ignore

    const m = new MemoryCache();

    m.add(1, (e: Error, y: boolean) => {
      expect(e).is.null;

      expect(y).is.true;
    });

    m.find(1, (e: Error) => {
      expect(e).is.null;
    });

    m.remove(1, (e: Error) => {
      expect(e).is.undefined;
    });
  });
});
