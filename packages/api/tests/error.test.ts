// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as chai from "chai";
import fs from "fs-extra";
import "mocha";
import { SystemError, UserError } from "../src/error";

const myName = "MyError";
const myMessage = "message1";
const myMessage2 = "message2";
const mySource = "source1";
const myHelpLink = "helplink1";
const myIssueLink = "issuelink";

describe("error", function () {
  describe("UserError", function () {
    it("constructor with source,name,message", () => {
      {
        const error = new UserError(mySource, myName, myMessage, myMessage2);
        chai.assert.equal(error.name, myName);
        chai.assert.equal(error.message, myMessage);
        chai.assert.equal(error.displayMessage, myMessage2);
        chai.assert.isTrue(error.stack && error.stack.includes("error.test.ts"));
        chai.assert.isDefined(error.timestamp);
        chai.assert.isTrue(error instanceof UserError);
      }
      {
        const error = new UserError(mySource, myName, myMessage);
        chai.assert.equal(error.name, myName);
        chai.assert.isTrue(error.message.includes(myMessage));
        chai.assert.equal(error.source, mySource);
        chai.assert.isTrue(error.stack && error.stack.includes("error.test.ts"));
        chai.assert.isDefined(error.timestamp);
        chai.assert.isTrue(error instanceof UserError);
      }
    }),
      it("constructor with UserErrorOptions object", () => {
        {
          const error = new UserError({
            error: new RangeError(myMessage2),
            source: mySource,
            message: myMessage,
            displayMessage: myMessage2,
            name: myName,
            helpLink: myHelpLink,
          });
          chai.assert.equal(error.name, myName);
          chai.assert.equal(error.message, myMessage);
          chai.assert.equal(error.displayMessage, myMessage2);
          chai.assert.equal(error.source, mySource);
          chai.assert.equal(error.helpLink, myHelpLink);
          chai.assert.isTrue(error.stack && error.stack.includes("error.test.ts"));
          chai.assert.isTrue(error instanceof UserError);
        }
        {
          const error = new UserError({
            error: new RangeError(myMessage),
            source: mySource,
            helpLink: myHelpLink,
          });
          chai.assert.equal(error.name, "UserError");
          chai.assert.isTrue(error.message && error.message.includes(myMessage));
          chai.assert.equal(error.source, mySource);
          chai.assert.equal(error.helpLink, myHelpLink);
          chai.assert.isTrue(error.stack && error.stack.includes("error.test.ts"));
          chai.assert.isTrue(error instanceof UserError);
        }
        {
          const error = new UserError({});
          chai.assert.equal(error.name, "UserError");
          chai.assert.equal(error.message, "");
          chai.assert.equal(error.source, "unknown");
          chai.assert.isTrue(error.stack && error.stack.includes("error.test.ts"));
          chai.assert.isTrue(error instanceof UserError);
        }
      });
  });

  describe("SystemError", function () {
    it("constructor with source,name,message", () => {
      {
        const error = new SystemError(mySource, myName, myMessage, myMessage2);
        chai.assert.equal(error.name, myName);
        chai.assert.equal(error.message, myMessage);
        chai.assert.equal(error.displayMessage, myMessage2);
        chai.assert.equal(error.source, mySource);
        chai.assert.isTrue(error.stack && error.stack.includes("error.test.ts"));
        chai.assert.isDefined(error.timestamp);
        chai.assert.isTrue(error instanceof SystemError);
      }
    }),
      it("constructor with SystemErrorOptions object", () => {
        {
          const error = new SystemError({
            error: new RangeError(myMessage2),
            source: mySource,
            message: myMessage,
            displayMessage: myMessage2,
            name: myName,
            issueLink: myIssueLink,
          });
          chai.assert.equal(error.name, myName);
          chai.assert.equal(error.message, myMessage);
          chai.assert.equal(error.displayMessage, myMessage2);
          chai.assert.equal(error.source, mySource);
          chai.assert.equal(error.issueLink, myIssueLink);
          chai.assert.isTrue(error.stack && error.stack.includes("error.test.ts"));
          chai.assert.isTrue(error instanceof SystemError);
        }
        {
          const error = new SystemError({
            error: new RangeError(myMessage),
            source: mySource,
            issueLink: myIssueLink,
          });
          chai.assert.equal(error.name, "SystemError");
          chai.assert.equal(error.message, myMessage);
          chai.assert.equal(error.source, mySource);
          chai.assert.equal(error.issueLink, myIssueLink);
          chai.assert.isTrue(error.stack && error.stack.includes("error.test.ts"));
          chai.assert.isTrue(error instanceof SystemError);
        }
        {
          const error = new SystemError({});
          chai.assert.equal(error.name, "SystemError");
          chai.assert.equal(error.message, "");
          chai.assert.equal(error.source, "unknown");
          chai.assert.isTrue(error.stack && error.stack.includes("error.test.ts"));
          chai.assert.isTrue(error instanceof SystemError);
        }
        {
          try {
            fs.readFileSync("12345" + new Date().getTime());
            chai.assert.fail("Should not reach here");
          } catch (e) {
            const fxError = new SystemError({
              error: e as SystemError,
              source: mySource,
              name: "ReadFileError",
            });
            chai.assert.isTrue(fxError instanceof SystemError);
            chai.assert.isTrue(fxError.message === (e as SystemError).message);
            chai.assert.isTrue(fxError.name === "ReadFileError");
            chai.assert.isTrue(fxError.source === mySource);
          }
        }
      });
  });

  describe("Sub class", function () {
    it("happy path", () => {
      class MyError extends UserError {
        constructor() {
          super({});
        }
      }
      const error = new MyError();
      chai.assert.equal(error.source, "unknown");
      chai.assert.equal(error.name, "MyError");
      chai.assert.isTrue(error.stack?.includes("error.test.ts"));
    });
  });
});
