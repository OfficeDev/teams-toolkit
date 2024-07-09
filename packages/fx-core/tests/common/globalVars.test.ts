// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import "mocha";
import sinon from "sinon";
import "../../src/component/feature/sso";
import { ErrorContextMW, globalVars, setErrorContext, setTools } from "../../src/common/globalVars";
import { MockTools } from "../core/utils";
import { hooks } from "@feathersjs/hooks";

const tools = new MockTools();

describe("globalVars", () => {
  const sandbox = sinon.createSandbox();
  beforeEach(() => {
    setTools(tools);
  });
  afterEach(async () => {
    sandbox.restore();
  });

  describe("setErrorContext", () => {
    it("should set error context", async () => {
      setErrorContext({
        component: "test-component",
        stage: "test-stage",
        source: "Azure",
        method: "test-method",
      });
      assert.equal(globalVars.component, "test-component");
      assert.equal(globalVars.stage, "test-stage");
      assert.equal(globalVars.source, "Azure");
      assert.equal(globalVars.method, "test-method");
    });
    it("should resset error context", async () => {
      setErrorContext({ component: "test-component", stage: "test-stage", reset: true });
      assert.equal(globalVars.component, "test-component");
      assert.equal(globalVars.stage, "test-stage");
      assert.equal(globalVars.source, "");
      assert.equal(globalVars.method, "");
    });
  });

  describe("ErrorContextMW", () => {
    it("should set error context", async () => {
      class MyClass1 {
        myMethod() {}
      }
      hooks(MyClass1, {
        myMethod: [
          ErrorContextMW({ component: "test-component", stage: "test-stage", source: "Azure" }),
        ],
      });
      const my = new MyClass1();
      my.myMethod();
      assert.equal(globalVars.component, "test-component");
      assert.equal(globalVars.stage, "test-stage");
      assert.equal(globalVars.source, "Azure");
      assert.equal(globalVars.method, "myMethod");
    });
    it("should reset error context", async () => {
      class MyClass1 {
        myMethod() {}
      }
      hooks(MyClass1, {
        myMethod: [ErrorContextMW({ reset: true })],
      });
      const my = new MyClass1();
      my.myMethod();
      assert.equal(globalVars.component, "");
      assert.equal(globalVars.stage, "");
      assert.equal(globalVars.source, "");
      assert.equal(globalVars.method, "myMethod");
    });
  });
});
