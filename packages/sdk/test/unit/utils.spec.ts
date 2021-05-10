// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect } from "chai";
import { ErrorWithCode, ErrorCode } from "../../src";
import { validateScopesType } from "../../src/util/utils";

describe("Utils Tests", () => {
  it("validateScopesType should throw InvalidParameter error with invalid scopes", () => {
    const invalidScopes = [1, 2];
    const expectedErrorMsg = "The type of scopes is not valid, it must be string or string array";
    expect(() => {
      validateScopesType(invalidScopes);
    })
      .to.throw(ErrorWithCode, expectedErrorMsg)
      .with.property("code", ErrorCode.InvalidParameter);

    const invalidScopes2 = new Promise((resolve) => resolve(true));
    expect(() => {
      validateScopesType(invalidScopes2);
    })
      .to.throw(ErrorWithCode, expectedErrorMsg)
      .with.property("code", ErrorCode.InvalidParameter);

    const invalidScopes3 = 1;
    expect(() => {
      validateScopesType(invalidScopes3);
    })
      .to.throw(ErrorWithCode, expectedErrorMsg)
      .with.property("code", ErrorCode.InvalidParameter);

    const invalidScopes4 = { scopes: "user.read" };
    expect(() => {
      validateScopesType(invalidScopes4);
    })
      .to.throw(ErrorWithCode, expectedErrorMsg)
      .with.property("code", ErrorCode.InvalidParameter);

    const invalidScopes5 = true;
    expect(() => {
      validateScopesType(invalidScopes5);
    })
      .to.throw(ErrorWithCode, expectedErrorMsg)
      .with.property("code", ErrorCode.InvalidParameter);

    const invalidScopes6: any = null;
    expect(() => {
      validateScopesType(invalidScopes6);
    })
      .to.throw(ErrorWithCode, expectedErrorMsg)
      .with.property("code", ErrorCode.InvalidParameter);

    const invalidScopes7: any = undefined;
    expect(() => {
      validateScopesType(invalidScopes7);
    })
      .to.throw(ErrorWithCode, expectedErrorMsg)
      .with.property("code", ErrorCode.InvalidParameter);
  });

  it("validateScopesType should success with valid scopes", () => {
    const validScopes1 = "https://graph.microsoft.com/user.read";
    validateScopesType(validScopes1);

    const validScopes2 = ["user.read", "user.write"];
    validateScopesType(validScopes2);

    const validScopes3: string[] = [];
    validateScopesType(validScopes3);

    const validScopes4 = "";
    validateScopesType(validScopes4);
  });
});
