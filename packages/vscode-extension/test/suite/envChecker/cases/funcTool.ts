// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as funcToolCheckerUtils from "../utils/funcTool";

suite("FuncToolChecker E2E Test", async () => {
  test("FuncTool v3 is installed", async function(this: Mocha.Context) {
    if ((await funcToolCheckerUtils.getFuncCoreToolsVersion()) !== "3") {
      this.skip();
    }
  });

  test("FuncTool not installed", async function(this: Mocha.Context) {
    if ((await funcToolCheckerUtils.getFuncCoreToolsVersion()) !== null) {
      this.skip();
    }
  });
});
