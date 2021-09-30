// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Json } from "@microsoft/teamsfx-api";
import { assert, expect } from "chai";
import "mocha";
import { flattenConfigJson, isValidProject, newEnvInfo } from "../../src/core/tools";

describe("tools", () => {
  // it("base64 encode", () => {
  //   const source = "Hello, World!";
  //   expect(base64Encode(source)).to.equal("SGVsbG8sIFdvcmxkIQ==");
  // });

  it("newEnvInfo should return valid object", () => {
    const result = newEnvInfo();
    expect(result).to.be.not.null;
    expect(result.envName).to.be.not.empty;
    expect(result.config).to.be.not.null;
    expect(result.profile).to.be.not.null;
  });

  it("is not valid project", () => {
    expect(isValidProject()).is.false;
  });
});

describe("flattenConfigJson", () => {
  it("should flatten output and secrets fields", () => {
    const config: Json = { a: { output: { b: 1 }, secrets: { value: 9 } }, c: 2 };
    const expected: Json = { a: { b: 1, value: 9 }, c: 2 };
    const result = flattenConfigJson(config);
    assert.deepEqual(result, expected);
  });
});
