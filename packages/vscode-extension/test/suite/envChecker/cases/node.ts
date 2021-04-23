// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as nodeUtils from "../utils/node";

suite("NodeChecker E2E Test", async () => {

  test("Node is not installed", async function(this: Mocha.Context) {
    if (await nodeUtils.getNodeVersion() !== null) {
        this.skip();
    }
  });

  test("Node v14 is installed", async function(this: Mocha.Context) {
    if ((await nodeUtils.getNodeVersion()) !== "14") {
        this.skip();
    }
  });
});
