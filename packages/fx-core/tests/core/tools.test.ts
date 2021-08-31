// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { base64Encode, isValidProject, newEnvInfo } from "../../src/core/tools";
import "mocha";

import { expect } from "chai";

describe("tools", () => {
  it("base64 encode", () => {
    const source = "Hello, World!";
    expect(base64Encode(source)).to.equal("SGVsbG8sIFdvcmxkIQ==");
  });

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
