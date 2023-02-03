// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author zhijie <zhihuan@microsoft.com>
 */
import { SystemError, UserError } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import { ErrorNames } from "../../../../src/component/resource/botService/constants";
import {
  BotFrameworkConflictResultError,
  BotFrameworkForbiddenResultError,
  BotFrameworkNotAllowedToAcquireTokenError,
  wrapError,
} from "../../../../src/component/resource/botService/errors";

describe("wrap error", () => {
  it("wrap empty error", () => {
    const e = new Error();
    const res = wrapError(e);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.equal(res.error.name, "UnhandledError");
    }
  });
  it("wrap user error", () => {
    const e = new UserError("ut", "utError", "ut error message");
    const res = wrapError(e);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.isTrue(res.error instanceof UserError);
      assert.equal(res.error.name, "utError");
    }
  });
  it("wrap system error", () => {
    const e = new SystemError("ut", "utError", "ut error message");
    const res = wrapError(e);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.isTrue(res.error instanceof SystemError);
      assert.equal(res.error.name, "utError");
    }
  });

  it("Increase UT - BotFrameworkNotAllowedToAcquireTokenError", () => {
    const e = new BotFrameworkNotAllowedToAcquireTokenError();
    assert.isTrue(e.name === ErrorNames.ACQUIRE_BOT_FRAMEWORK_TOKEN_ERROR);
  });

  it("Increase UT - BotFrameworkForbiddenResultError", () => {
    const e = new BotFrameworkForbiddenResultError();
    assert.isTrue(e.name === ErrorNames.FORBIDDEN_RESULT_BOT_FRAMEWORK_ERROR);
  });

  it("Increase UT - BotFrameworkConflictResultError", () => {
    const e = new BotFrameworkConflictResultError();
    assert.isTrue(e.name === ErrorNames.CONFLICT_RESULT_BOT_FRAMEWORK_ERROR);
  });
});
