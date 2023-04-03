// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as chai from "chai";
import "mocha";
import {
  assembleError,
  ConcurrentError,
  EmptyOptionError,
  InvalidInputError,
  InvalidObjectError,
  InvalidOperationError,
  InvalidProjectError,
  NoProjectOpenedError,
  NotImplementedError,
  ObjectAlreadyExistsError,
  ObjectNotExistError,
  PathAlreadyExistsError,
  ReadFileError,
  SystemError,
  UndefinedError,
  UnknownError,
  UserError,
  WriteFileError,
} from "../src/error";
import fs from "fs-extra";

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
          chai.assert.equal(error.name, "RangeError");
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
          chai.assert.equal(error.name, "RangeError");
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
              error: e,
              source: mySource,
              name: "ReadFileError",
            });
            chai.assert.isTrue(fxError instanceof SystemError);
            chai.assert.isTrue(fxError.message === e.message);
            chai.assert.isTrue(fxError.name === "ReadFileError");
            chai.assert.isTrue(fxError.source === mySource);
          }
        }
      });
  });
  describe("assembleError", function () {
    it("error is string", () => {
      const fxError = assembleError(myMessage);
      chai.assert.isTrue(fxError instanceof UnknownError);
      chai.assert.isTrue(fxError.message === myMessage);
      chai.assert.isTrue(fxError.name === "UnknownError");
      chai.assert.isTrue(fxError.source === "unknown");
      chai.assert.isTrue(fxError.stack && fxError.stack.includes("error.test.ts"));
    });

    it("error is Error", () => {
      const raw = new Error(myMessage);
      const fxError = assembleError(raw);
      chai.assert.isTrue(fxError instanceof SystemError);
      chai.assert.isTrue(fxError.message === myMessage);
      chai.assert.isTrue(fxError.name === "Error");
      chai.assert.isTrue(fxError.source === "unknown");
      chai.assert.isTrue(fxError.stack && fxError.stack.includes("error.test.ts"));
    });

    it("error is Error with source", () => {
      const raw = new Error(myMessage);
      const fxError = assembleError(raw, mySource);
      chai.assert.isTrue(fxError instanceof SystemError);
      chai.assert.isTrue(fxError.message === myMessage);
      chai.assert.isTrue(fxError.name === "Error");
      chai.assert.isTrue(fxError.source === mySource);
      chai.assert.isTrue(fxError.stack && fxError.stack.includes("error.test.ts"));
    });

    it("throw real error", () => {
      try {
        fs.readFileSync("12345" + new Date().getTime());
        chai.assert.fail("Should not reach here");
      } catch (e) {
        const fxError = assembleError(e, mySource);
        chai.assert.isTrue(fxError instanceof SystemError);
        chai.assert.isTrue(
          fxError.message !== undefined &&
            fxError.message.includes("ENOENT: no such file or directory")
        );
        chai.assert.isTrue(fxError.name === "Error");
        chai.assert.isTrue(fxError.source === mySource);
        chai.assert.isTrue(fxError.stack === e.stack);
      }
    });

    it("error has other type", () => {
      const raw = [1, 2, 3];
      const fxError = assembleError(raw);
      chai.assert.isTrue(fxError instanceof SystemError);
      chai.assert.isTrue(fxError.message === JSON.stringify(raw));
      chai.assert.isTrue(fxError.stack && fxError.stack.includes("error.test.ts"));
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

  describe("Predefined Errors", function () {
    it("happy path", () => {
      {
        const error = new EmptyOptionError();
        chai.assert.equal(error.name, "EmptyOptionError");
        chai.assert.isTrue(error instanceof EmptyOptionError);
      }
      {
        const error = new PathAlreadyExistsError(mySource, "123");
        chai.assert.equal(error.name, "PathAlreadyExistsError");
        chai.assert.equal(error.source, mySource);
        chai.assert.isTrue(error instanceof PathAlreadyExistsError);
      }
      {
        const error = new ObjectAlreadyExistsError(mySource, "123");
        chai.assert.equal(error.name, "ObjectAlreadyExistsError");
        chai.assert.equal(error.source, mySource);
        chai.assert.isTrue(error instanceof ObjectAlreadyExistsError);
      }
      {
        const error = new ObjectNotExistError(mySource, "123");
        chai.assert.equal(error.name, "ObjectNotExistError");
        chai.assert.equal(error.source, mySource);
        chai.assert.isTrue(error instanceof ObjectNotExistError);
      }
      {
        const error = new UndefinedError(mySource, "123");
        chai.assert.equal(error.name, "UndefinedError");
        chai.assert.equal(error.source, mySource);
        chai.assert.isTrue(error instanceof UndefinedError);
      }
      {
        const error = new NotImplementedError(mySource, "123");
        chai.assert.equal(error.name, "NotImplementedError");
        chai.assert.equal(error.source, mySource);
        chai.assert.isTrue(error instanceof NotImplementedError);
      }
      {
        const error = new WriteFileError(mySource, new Error("my error"));
        chai.assert.equal(error.name, "WriteFileError");
        chai.assert.equal(error.source, mySource);
        chai.assert.isTrue(error instanceof WriteFileError);
      }
      {
        const error = new ReadFileError(mySource, new Error("my error"));
        chai.assert.equal(error.name, "ReadFileError");
        chai.assert.equal(error.source, mySource);
        chai.assert.isTrue(error instanceof ReadFileError);
      }
      {
        const error = new NoProjectOpenedError(mySource);
        chai.assert.equal(error.name, "NoProjectOpenedError");
        chai.assert.equal(error.source, mySource);
        chai.assert.isTrue(error instanceof NoProjectOpenedError);
      }
      {
        const error = new ConcurrentError(mySource);
        chai.assert.equal(error.name, "ConcurrentError");
        chai.assert.equal(error.source, mySource);
        chai.assert.isTrue(error instanceof ConcurrentError);
      }
      {
        const error = new InvalidInputError(mySource, "123");
        chai.assert.equal(error.name, "InvalidInputError");
        chai.assert.equal(error.source, mySource);
        chai.assert.isTrue(error instanceof InvalidInputError);
      }
      {
        const error = new InvalidProjectError(mySource);
        chai.assert.equal(error.name, "InvalidProjectError");
        chai.assert.equal(error.source, mySource);
        chai.assert.isTrue(error instanceof InvalidProjectError);
      }
      {
        const error = new InvalidObjectError(mySource, "123");
        chai.assert.equal(error.name, "InvalidObjectError");
        chai.assert.equal(error.source, mySource);
        chai.assert.isTrue(error instanceof InvalidObjectError);
      }
      {
        const error = new InvalidOperationError(mySource, "123");
        chai.assert.equal(error.name, "InvalidOperationError");
        chai.assert.equal(error.source, mySource);
        chai.assert.isTrue(error instanceof InvalidOperationError);
      }
    });
  });
});
