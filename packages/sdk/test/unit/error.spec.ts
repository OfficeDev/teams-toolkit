// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import { ErrorWithCode, ErrorCode } from "../../src";

describe("ErrorWithCode Tests", () => {
  const errorMessage = "error message";
  const code = ErrorCode.InvalidParameter;

  it("create ErrorCode should success with ErrorCode", () => {
    const error = new ErrorWithCode(errorMessage, code);

    assert.strictEqual(error.code, code);
    assert.strictEqual(error.message, `${errorMessage}`);
  });

  it("create ErrorCode should success without ErrorCode", () => {
    const error = new ErrorWithCode(errorMessage);

    assert.strictEqual(error.code, undefined);
    assert.strictEqual(error.message, errorMessage);
  });
});
