import { assert } from "chai";
import "mocha";
import * as sinon from "sinon";
import { setTools } from "../../src/core/globalVars";
import { InvalidYamlSchemaError } from "../../src/error/yml";
import { MockTools } from "../core/utils";
import { UnhandledError, assembleError } from "../../src/error";
import { SystemError } from "@microsoft/teamsfx-api";

describe("Error", () => {
  const tools = new MockTools();
  setTools(tools);
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  beforeEach(() => {});
  it("InvalidYamlSchemaError", async () => {
    const e1 = new InvalidYamlSchemaError(".", ".");
    const e2 = new InvalidYamlSchemaError(".");
    assert.isTrue(e1 instanceof InvalidYamlSchemaError);
    assert.isTrue(e2 instanceof InvalidYamlSchemaError);
  });
});

describe("assembleError", function () {
  const myMessage = "message1";
  const mySource = "source1";
  it("error is string", () => {
    const fxError = assembleError(myMessage);
    chai.assert.isTrue(fxError instanceof UnhandledError);
    chai.assert.isTrue(fxError.message === myMessage);
    chai.assert.isTrue(fxError.name === "UnhandledError");
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
  it("error has other type", () => {
    const raw = [1, 2, 3];
    const fxError = assembleError(raw);
    chai.assert.isTrue(fxError instanceof SystemError);
    chai.assert.isTrue(fxError.message === JSON.stringify(raw, Object.getOwnPropertyNames(raw)));
    chai.assert.isTrue(fxError.stack && fxError.stack.includes("error.test.ts"));
  });
});
