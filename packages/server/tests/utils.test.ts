// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, FxError, ok, SystemError, UIConfig, UserError } from "@microsoft/teamsfx-api";
import "mocha";
import { assert, expect } from "chai";
import {
  convertToHandlerResult,
  convertUIConfigToJson,
  getResponseWithErrorHandling,
  standardizeResult,
} from "../src/utils";
import { CustomizeFuncRequestType } from "../src/apis";
import { ResponseError } from "vscode-jsonrpc";
import { reset } from "../src/customizedFuncAdapter";

describe("utils", () => {
  describe("getResponseWithErrorHandling", () => {
    it("case 1: UserError", () => {
      const e = new UserError(
        "testSource",
        "testUserError",
        "test user error",
        "test display user error"
      );
      const res = getResponseWithErrorHandling(Promise.resolve(err(e)));
      return res.then(function (data) {
        expect((data as any).error).to.equal(e);
      });
    });

    it('case 2: errorType as "UserError"', () => {
      const e = new UserError(
        "testSource",
        "testUserError",
        "test user error",
        "test display user error"
      );
      const e1 = {
        errorType: "UserError",
        source: e.source,
        message: e.message,
        name: e.name,
        displayMessage: e.displayMessage,
        timestamp: e.timestamp,
        stack: e.stack,
        userData: e.userData,
        innerError: e.innerError,
      };
      const res = getResponseWithErrorHandling(Promise.resolve(err(e1)));
      return res.then(function (data) {
        expect(data.isErr()).to.be.true;
        if (data.isErr()) {
          expect(data.error.source).to.equal(e.source);
          expect(data.error.name).to.equal(e.name);
          expect(data.error.message).to.equal(e.message);
          expect((data.error as any).displayMessage).to.equal(e.displayMessage);
          expect(data.error.stack).to.equal(e.stack);
          expect(data.error.timestamp).to.equal(e.timestamp);
        }
      });
    });

    it("case 3: SystemError", () => {
      const e = new SystemError(
        "testSource",
        "testSystemError",
        "test system error",
        "test display system error"
      );
      const res = getResponseWithErrorHandling(Promise.resolve(err(e)));
      return res.then(function (data) {
        expect((data as any).error).to.equal(e);
      });
    });

    it("case 4: ok with value", () => {
      const e = "test value";
      const res = getResponseWithErrorHandling(Promise.resolve(ok(e)));
      return res.then(function (data) {
        expect((data as any).value).to.equal(e);
      });
    });

    it("case 5: ok with undefined", () => {
      const res = getResponseWithErrorHandling(Promise.resolve(ok(undefined)));
      return res.then(function (data) {
        expect((data as any).value).to.equal(undefined);
      });
    });
  });

  it("convertUIConfigToJson", () => {
    const f = () => {};
    const config = {
      name: "test name",
      title: "test title",
      default: "test default value",
      options: ["option1", "option2"],
      validation: f,
    };
    reset();
    const res = convertUIConfigToJson(config as UIConfig<string>);
    const exp = {
      name: "test name",
      title: "test title",
      default: "test default value",
      options: [
        { id: "option1", label: "option1" },
        { id: "option2", label: "option2" },
      ],
    };
    (exp as any).validation = <CustomizeFuncRequestType>{
      id: 1,
      type: "ValidateFunc",
    };
    expect(res).to.eql(exp);
  });

  describe("standardizeResult", () => {
    it("case 1: error result", () => {
      const e = new UserError(
        "testSource",
        "testUserError",
        "test user error",
        "test display user error"
      );
      const e1 = {
        errorType: "UserError",
        source: e.source,
        message: e.message,
        name: e.name,
        displayMessage: e.displayMessage,
        timestamp: e.timestamp,
        stack: e.stack,
        userData: e.userData,
        innerError: e.innerError,
        helpLink: undefined,
        issueLink: undefined,
      };
      const r = err(e);
      const res = standardizeResult(r);
      expect(res).to.eql(err(e1));
    });

    it("case 2: ok result", () => {
      const r = ok<string, FxError>("test");
      const res = standardizeResult(r);
      expect(res).to.eql(ok("test"));
    });
  });

  describe("convertToHandlerResult", () => {
    it("case 1: ok result", () => {
      const r = ok<string, FxError>("test");
      const res = convertToHandlerResult(r);
      expect(res).to.eql(r.value);
    });

    it("case 2: error result", () => {
      const e = new UserError(
        "testSource",
        "testUserError",
        "test user error",
        "test display user error"
      );
      const exp = new ResponseError(-32000, e.message, e);
      const res = convertToHandlerResult(err(e));
      expect(res instanceof ResponseError).to.be.true;
      if (res instanceof ResponseError) {
        expect(res.code).to.equal(exp.code);
        expect(res.message).to.equal(exp.message);
        expect(res.data).to.equal(exp.data);
      }
    });
  });
});
