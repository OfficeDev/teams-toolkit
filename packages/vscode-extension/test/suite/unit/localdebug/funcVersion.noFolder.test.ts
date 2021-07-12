// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { expect } from "chai";
import {
  FuncVersion,
  mapToFuncToolsVersion,
} from "../../../../src/debug/depsChecker/funcToolChecker";

suite("[debug > funcCoreTools] funcVersion", () => {
  test("getFuncToolsVersion", () => {
    const result = mapToFuncToolsVersion("`-- (empty)");
    expect(result).to.be.null;
  });
  test("getFuncToolsVersion", () => {
    const result = mapToFuncToolsVersion("2.7.3188");
    const x = result === FuncVersion.v2;
    expect(result).to.equal(FuncVersion.v2);
  });
  test("getFuncToolsVersion", () => {
    const result = mapToFuncToolsVersion("3.0.3388");
    expect(result).to.equal(FuncVersion.v3);
  });
  test("getFuncToolsVersion", () => {
    const result = mapToFuncToolsVersion("\n3.0.3388\n");
    expect(result).to.equal(FuncVersion.v3);
  });
  test("getFuncToolsVersion", () => {
    const result = mapToFuncToolsVersion("");
    expect(result).to.be.null;
  });
  test("getFuncToolsVersion", () => {
    const result = mapToFuncToolsVersion("3.0");
    expect(result).to.be.null;
  });
  test("getFuncToolsVersion", () => {
    const result = mapToFuncToolsVersion("3.0.");
    expect(result).to.be.null;
  });
  test("getFuncToolsVersion", () => {
    const result = mapToFuncToolsVersion("`-- azure-functions-core-tools@42.0.3388");
    expect(result).to.be.null;
  });
});
