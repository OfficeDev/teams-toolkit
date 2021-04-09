// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import { ErrorWithCode, ErrorCode } from "../../src";

describe("ErrorWithCode", () => {
  const errorMessage = "error message";
  const code = ErrorCode.InvalidParameter;

  it("create with ErrorCode", () => {
    const error = new ErrorWithCode(errorMessage, code);

    assert.strictEqual(error.code, code);
    assert.strictEqual(error.message, `${errorMessage}`);
  });

  it("create without ErrorCode", () => {
    const error = new ErrorWithCode(errorMessage);

    assert.strictEqual(error.code, undefined);
    assert.strictEqual(error.message, errorMessage);
  });
});
