import { assert } from "chai";
import "mocha";
import * as sinon from "sinon";
import { setTools } from "../../src/core/globalVars";
import { InvalidYamlSchemaError } from "../../src/error/yml";
import { MockTools } from "../core/utils";

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
