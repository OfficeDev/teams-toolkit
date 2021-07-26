// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import { FxError, SystemError, UserError } from "@microsoft/teamsfx-api";

import {
  DefaultValues,
  FunctionPluginInfo,
} from "../../../../../src/plugins/resource/function/constants";
import {
  FxResult,
  FunctionPluginResultFactory as ResultFactory,
} from "../../../../../src/plugins/resource/function/result";

describe(FunctionPluginInfo.pluginName, () => {
  describe("Result Factory Test", () => {
    const errorMsg = "test error msg";
    const link = "test link";

    const checkErrorCommon = (err: FxError, name: string) => {
      chai.assert.equal(err.source, FunctionPluginInfo.alias);
      chai.assert.equal(err.message, errorMsg);
      chai.assert.equal(err.name, name);
    };

    const checkUserError = (err: UserError, link: string) => {
      checkErrorCommon(err, "ut");
      chai.assert.isTrue(err instanceof UserError);
      chai.assert.equal(err.helpLink, link);
    };

    const checkSystemError = (err: SystemError, link: string) => {
      checkErrorCommon(err, "ut");
      chai.assert.isTrue(err instanceof SystemError);
      chai.assert.equal(err.issueLink, link);
    };

    it("Test create UserError with link", async () => {
      const result: FxResult = ResultFactory.UserError(errorMsg, "ut", link);
      chai.assert.isTrue(result.isErr());

      const err: UserError = result._unsafeUnwrapErr() as UserError;
      checkUserError(err, link);
    });

    it("Test create UserError without link", async () => {
      const result: FxResult = ResultFactory.UserError(errorMsg, "ut");
      chai.assert.isTrue(result.isErr());

      const err: UserError = result._unsafeUnwrapErr() as UserError;
      checkUserError(err, DefaultValues.helpLink);
    });

    it("Test create SystemError with link", async () => {
      const result: FxResult = ResultFactory.SystemError(errorMsg, "ut", link);
      chai.assert.isTrue(result.isErr());

      const err: SystemError = result._unsafeUnwrapErr() as SystemError;
      checkSystemError(err, link);
    });

    it("Test create Success", async () => {
      const result: FxResult = ResultFactory.Success("test");

      chai.assert.isTrue(result.isOk());
      chai.assert.equal(result.unwrapOr(""), "test");
    });
  });
});
