// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { err, FxError, Inputs, ok, Platform, Result } from "@microsoft/teamsfx-api";
import "mocha";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { MockTools, randomAppName } from "../utils";
import { setTools } from "../../../src/core/globalVars";
import { EnvInfoWriterMW_V3 } from "../../../src/core/middleware/envInfoWriterV3";
import { assert } from "chai";

describe("Middleware - EnvInfoWriterMW_V3", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(function () {
    setTools(new MockTools());
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("return error path", async () => {
    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        return err("mock error" as any);
      }
    }

    hooks(MyClass, {
      myMethod: [EnvInfoWriterMW_V3()],
    });
    const my = new MyClass();
    const inputs: Inputs = {
      platform: Platform.CLI_HELP,
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    const res = await my.myMethod(inputs);
    assert.isTrue(res.isErr());
  });

  it("throw error path", async () => {
    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        throw err("mock error" as any);
      }
    }

    hooks(MyClass, {
      myMethod: [EnvInfoWriterMW_V3(true)],
    });
    const my = new MyClass();
    const inputs: Inputs = {
      platform: Platform.CLI_HELP,
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    try {
      const res = await my.myMethod(inputs);
    } catch (error) {
      assert.isNotEmpty(error);
    }
  });

  it("throw error with no project path", async () => {
    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        throw err("mock error" as any);
      }
    }

    hooks(MyClass, {
      myMethod: [EnvInfoWriterMW_V3(false)],
    });
    const my = new MyClass();
    const inputs: Inputs = {
      platform: Platform.CLI_HELP,
    };
    try {
      const res = await my.myMethod(inputs);
    } catch (error) {
      assert.isNotEmpty(error);
    }
  });

  it("throw error with no project path", async () => {
    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        throw err("mock error" as any);
      }
    }

    hooks(MyClass, {
      myMethod: [EnvInfoWriterMW_V3(false)],
    });
    const my = new MyClass();
    const inputs: Inputs = {
      platform: Platform.CLI_HELP,
    };
    try {
      const res = await my.myMethod(inputs);
    } catch (error) {
      assert.isNotEmpty(error);
    }
  });
});
