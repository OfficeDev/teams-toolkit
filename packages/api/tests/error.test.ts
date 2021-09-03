// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import "mocha";
import {
  assembleError,
  FxError,
  newSystemError,
  newUserError,
  returnSystemError,
  returnUserError,
  SystemError,
  UserError,
} from "../src/error";
import * as chai from "chai";
import fs from "fs-extra";

const myName = "name1";
const myMessage = "message1";
const mySource = "source1";
const myHelpLink = "helplink1";
const myInnerError = "innerError1";
const myIssueLink = "issuelink";
const myStack = "stack1";

describe("error", function () {
  describe("userError", function () {
    it("happy path", () => {
      const temp = new UserError(myName, myMessage, mySource);
      chai.assert.equal(temp.name, myName);
      chai.assert.equal(temp.message, myMessage);
      chai.assert.equal(temp.source, mySource);
      chai.assert.isTrue(temp.stack !== undefined && temp.stack.includes("error.test.ts"));
      chai.assert.isDefined(temp.timestamp);
    }),
      it("happy path with more info", () => {
        const temp = new UserError(myName, myMessage, mySource, myStack, myHelpLink, myInnerError);
        chai.assert.equal(temp.name, myName);
        chai.assert.equal(temp.message, myMessage);
        chai.assert.equal(temp.source, mySource);
        chai.assert.isTrue(temp.stack !== undefined && temp.stack.includes("error.test.ts"));
        chai.assert.equal(temp.helpLink, myHelpLink);
        chai.assert.equal(temp.innerError, myInnerError);
      });
  });

  describe("returnUserError", function () {
    it("happy path", () => {
      const temp = returnUserError(new Error(myMessage), mySource, myName);
      chai.assert.equal(temp.name, myName);
      chai.assert.equal(temp.message, myMessage);
      chai.assert.equal(temp.source, mySource);
    }),
      it("happy path with more info", () => {
        const temp = returnUserError(
          new Error(myMessage),
          mySource,
          myName,
          myHelpLink,
          myInnerError
        );
        chai.assert.equal(temp.name, myName);
        chai.assert.equal(temp.message, myMessage);
        chai.assert.equal(temp.source, mySource);
        chai.assert.equal(temp.helpLink, myHelpLink);
        chai.assert.equal(temp.innerError, myInnerError);
      });
  });

  describe("systemError", function () {
    it("happy path", () => {
      const temp = new SystemError(myName, myMessage, mySource);
      chai.assert.equal(temp.name, myName);
      chai.assert.equal(temp.message, myMessage);
      chai.assert.equal(temp.source, mySource);
      chai.assert.isTrue(temp.stack !== undefined && temp.stack.includes("error.test.ts"));
      chai.assert.isDefined(temp.timestamp);
    }),
      it("happy path with more info", () => {
        const temp = new SystemError(
          myName,
          myMessage,
          mySource,
          myStack,
          myIssueLink,
          myInnerError
        );
        chai.assert.equal(temp.name, myName);
        chai.assert.equal(temp.message, myMessage);
        chai.assert.equal(temp.source, mySource);
        chai.assert.isTrue(temp.stack !== undefined && temp.stack.includes("error.test.ts"));
        chai.assert.equal(temp.issueLink, myIssueLink);
        chai.assert.equal(temp.innerError, myInnerError);
      });
  });

  describe("returnSystemError", function () {
    it("happy path", () => {
      const temp = returnSystemError(new Error(myMessage), mySource, myName);
      chai.assert.equal(temp.name, myName);
      chai.assert.equal(temp.message, myMessage);
      chai.assert.equal(temp.source, mySource);
    }),
      it("happy path with more info", () => {
        const temp = returnSystemError(
          new Error(myMessage),
          mySource,
          myName,
          myIssueLink,
          myInnerError
        );
        chai.assert.equal(temp.name, myName);
        chai.assert.equal(temp.message, myMessage);
        chai.assert.equal(temp.source, mySource);
        chai.assert.equal(temp.issueLink, myIssueLink);
        chai.assert.equal(temp.innerError, myInnerError);
      });
  });

  describe("error type", function () {
    it("happy path", () => {
      const userFxError: FxError = new UserError(myName, myMessage, mySource) as FxError;
      const userError: UserError = new UserError(myName, myMessage, mySource);
      const systemFxError: FxError = new SystemError(myName, myMessage, mySource) as FxError;
      const systemError: SystemError = new SystemError(myName, myMessage, mySource);

      chai.assert.isTrue(userFxError instanceof UserError);
      chai.assert.isFalse(userFxError instanceof SystemError);
      chai.assert.isTrue(userError instanceof UserError);
      chai.assert.isFalse(userError instanceof SystemError);
      chai.assert.isTrue(systemFxError instanceof SystemError);
      chai.assert.isFalse(systemFxError instanceof UserError);
      chai.assert.isTrue(systemError instanceof SystemError);
      chai.assert.isFalse(systemError instanceof UserError);
    });
  });

  describe("assembleError", function () {
    it("error is string", () => {
      const fxError = assembleError(myMessage);
      chai.assert.isTrue(fxError instanceof SystemError);
      chai.assert.isTrue(fxError.message === myMessage);
      chai.assert.isTrue(fxError.name === "Error");
      chai.assert.isTrue(fxError.source === "unknown");
      chai.assert.isTrue(fxError.stack !== undefined && fxError.stack.includes("error.test.ts"));
    });

    it("error is Error", () => {
      const raw = new Error(myMessage);
      const fxError = assembleError(raw);
      chai.assert.isTrue(fxError instanceof SystemError);
      chai.assert.isTrue(fxError.message === myMessage);
      chai.assert.isTrue(fxError.name === "Error");
      chai.assert.isTrue(fxError.source === "unknown");
      chai.assert.isTrue(fxError.stack !== undefined && fxError.stack.includes("error.test.ts"));
      chai.assert.isTrue(raw === fxError.innerError);
    });

    it("error has source", () => {
      const raw = new Error(myMessage);
      const fxError = assembleError(raw, mySource);
      chai.assert.isTrue(fxError instanceof SystemError);
      chai.assert.isTrue(fxError.message === myMessage);
      chai.assert.isTrue(fxError.name === "Error");
      chai.assert.isTrue(fxError.source === mySource);
      chai.assert.isTrue(fxError.stack !== undefined && fxError.stack.includes("error.test.ts"));
      chai.assert.isTrue(raw === fxError.innerError);
    });

    it("error has source", () => {
      try {
        fs.readFileSync("12345" + new Date().getTime());
        chai.assert.fail("Should not reach here");
      } catch (e) {
        const fxError = assembleError(e, mySource);
        chai.assert.isTrue(e === fxError.innerError);
        chai.assert.isTrue(fxError instanceof SystemError);
        chai.assert.isTrue(
          fxError.message !== undefined &&
            fxError.message.includes("ENOENT: no such file or directory")
        );
        chai.assert.isTrue(fxError.name === "ENOENT");
        chai.assert.isTrue(fxError.source === mySource);
        chai.assert.isTrue(fxError.stack === e.stack);
      }
    });

    it("error has other type", () => {
      const raw = [1, 2, 3];
      const fxError = assembleError(raw);
      chai.assert.isTrue(raw === fxError.innerError);
      chai.assert.isTrue(fxError instanceof SystemError);
      chai.assert.isTrue(fxError.message === JSON.stringify(raw));
      chai.assert.isTrue(fxError.stack !== undefined && fxError.stack.includes("error.test.ts"));
    });
  });
  describe("newUserError", function () {
    it("happy path", () => {
      const error = newUserError(mySource, myName, myMessage, myHelpLink);
      chai.assert.isTrue(error instanceof UserError);
      chai.assert.isFalse(error instanceof SystemError);
      chai.assert.equal(error.message, myMessage);
      chai.assert.equal(error.name, myName);
      chai.assert.equal(error.source, mySource);
      chai.assert.equal(error.helpLink, myHelpLink);
    });
  });

  describe("newSystemError", function () {
    it("happy path", () => {
      const error = newSystemError(mySource, myName, myMessage, myIssueLink);
      chai.assert.isTrue(error instanceof SystemError);
      chai.assert.isFalse(error instanceof UserError);
      chai.assert.equal(error.message, myMessage);
      chai.assert.equal(error.name, myName);
      chai.assert.equal(error.source, mySource);
      chai.assert.equal(error.issueLink, myIssueLink);
    });
  });

  describe("Sub class", function () {
    it("happy path", () => {
      class MyError extends UserError {
        constructor(message?: string) {
          super(new.target.name, message || "", mySource);
        }
      }
      const myerr = new MyError(myMessage);
      chai.assert.equal(myerr.errorCode(), `${mySource}.MyError`);
      chai.assert.equal(myerr.message, myMessage);
      chai.assert.isTrue(myerr.stack?.includes("error.test.ts"));
    });
  });

  describe("UserError.build", function () {
    it("build with Error", () => {
      const error = UserError.build(mySource, new RangeError(myMessage), myHelpLink);
      chai.assert.equal(error.errorCode(), `${mySource}.RangeError`);
      chai.assert.equal(error.message, myMessage);
      chai.assert.equal(error.helpLink, myHelpLink);
      chai.assert.isTrue(error.stack?.includes("error.test.ts"));
    });

    it("build with name and message", () => {
      const error = UserError.build(mySource, myName, myMessage, myHelpLink);
      chai.assert.equal(error.errorCode(), `${mySource}.${myName}`);
      chai.assert.equal(error.message, myMessage);
      chai.assert.equal(error.helpLink, myHelpLink);
      chai.assert.isTrue(error.stack?.includes("error.test.ts"));
    });

    it("build with empty name and message", () => {
      const error = UserError.build(mySource, "", myMessage, myHelpLink);
      chai.assert.equal(error.errorCode(), `${mySource}.UserError`);
      chai.assert.equal(error.message, myMessage);
      chai.assert.equal(error.helpLink, myHelpLink);
      chai.assert.isTrue(error.stack?.includes("error.test.ts"));
    });
  });

  describe("SystemError.build", function () {
    it("build with Error", () => {
      const error = SystemError.build(mySource, new RangeError(myMessage), myIssueLink);
      chai.assert.equal(error.errorCode(), `${mySource}.RangeError`);
      chai.assert.equal(error.message, myMessage);
      chai.assert.equal(error.issueLink, myIssueLink);
      chai.assert.isTrue(error.stack?.includes("error.test.ts"));
    });

    it("build with name and message", () => {
      const error = SystemError.build(mySource, myName, myMessage, myIssueLink);
      chai.assert.equal(error.errorCode(), `${mySource}.${myName}`);
      chai.assert.equal(error.message, myMessage);
      chai.assert.equal(error.issueLink, myIssueLink);
      chai.assert.isTrue(error.stack?.includes("error.test.ts"));
    });

    it("build with empty name and message", () => {
      const error = SystemError.build(mySource, "", myMessage, myIssueLink);
      chai.assert.equal(error.errorCode(), `${mySource}.SystemError`);
      chai.assert.equal(error.message, myMessage);
      chai.assert.equal(error.issueLink, myIssueLink);
      chai.assert.isTrue(error.stack?.includes("error.test.ts"));
    });
  });
});
