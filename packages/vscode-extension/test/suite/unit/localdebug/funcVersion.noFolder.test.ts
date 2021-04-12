// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { expect } from "chai";
import { FuncVersion, getFuncToolsVersion } from "../../../../src/debug/depsChecker/funcToolChecker";

suite("[debug > funcCoreTools] funcVersion", () => {
  test("getFuncToolsVersion", () => {
    const result = getFuncToolsVersion("`-- (empty)");
    expect(result).to.be.null;
  });
  test("getFuncToolsVersion", () => {
    const result = getFuncToolsVersion("2.7.3188");
    const x = result === FuncVersion.v2;
    expect(result).to.equal(FuncVersion.v2);
  });
  test("getFuncToolsVersion", () => {
    const result = getFuncToolsVersion("3.0.3388");
    expect(result).to.equal(FuncVersion.v3);
  });
  test("getFuncToolsVersion", () => {
    const result = getFuncToolsVersion("\n3.0.3388\n");
    expect(result).to.equal(FuncVersion.v3);
  });
  test("getFuncToolsVersion", () => {
    const result = getFuncToolsVersion("");
    expect(result).to.be.null;
  });
  test("getFuncToolsVersion", () => {
    const result = getFuncToolsVersion("3.0");
    expect(result).to.be.null;
  });
  test("getFuncToolsVersion", () => {
    const result = getFuncToolsVersion("3.0.");
    expect(result).to.be.null;
  });
  test("getFuncToolsVersion", () => {
    const result = getFuncToolsVersion("`-- azure-functions-core-tools@42.0.3388");
    expect(result).to.be.null;
  });
});
