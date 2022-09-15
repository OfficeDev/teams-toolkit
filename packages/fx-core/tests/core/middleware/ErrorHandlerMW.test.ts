// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  err,
  FxError,
  Inputs,
  ok,
  Platform,
  Result,
  SystemError,
  UserCancelError,
  UserError,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import { ErrorHandlerMW } from "../../../src/core/middleware/errorHandler";

describe("Middleware - ErrorHandlerMW", () => {
  const inputs: Inputs = { platform: Platform.VSCode };
  it("return FxError", async () => {
    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        return err(UserCancelError);
      }
    }
    hooks(MyClass, {
      myMethod: [ErrorHandlerMW],
    });
    const my = new MyClass();
    const res = await my.myMethod(inputs);
    assert.isTrue(res.isErr() && res.error === UserCancelError);
  });

  it("return ok", async () => {
    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        return ok("hello");
      }
    }
    hooks(MyClass, {
      myMethod: [ErrorHandlerMW],
    });
    const my = new MyClass();
    const res = await my.myMethod(inputs);
    assert.isTrue(res.isOk() && res.value === "hello");
    const res2 = await my.myMethod(inputs);
    assert.isTrue(res2.isOk() && res2.value === "hello");
  });

  it("throw known error", async () => {
    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        throw UserCancelError;
      }
    }

    hooks(MyClass, {
      myMethod: [ErrorHandlerMW],
    });
    const my = new MyClass();
    const res = await my.myMethod(inputs);
    assert.isTrue(res.isErr() && res.error === UserCancelError);
  });

  it("throw unknown error", async () => {
    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        throw "unknown";
      }
    }
    hooks(MyClass, {
      myMethod: [ErrorHandlerMW],
    });
    const my = new MyClass();
    const res = await my.myMethod(inputs);
    assert.isTrue(
      res.isErr() && res.error instanceof SystemError && res.error.message === "unknown"
    );
  });

  it("convert system error to user error: The client 'xxx@xxx.com' with object id 'xxx' does not have authorization to perform action", async () => {
    const msg =
      "The client 'xxx@xxx.com' with object id 'xxx' does not have authorization to perform action '<REDACTED: user-file-path>' over scope '<REDACTED: user-file-path>' or the scope is invalid. If access was recently granted, please refresh your credentials.";
    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        throw new Error(msg);
      }
    }
    hooks(MyClass, {
      myMethod: [ErrorHandlerMW],
    });
    const my = new MyClass();
    const res = await my.myMethod(inputs);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      const error = res.error;
      assert.isTrue(error instanceof UserError);
      assert.equal(error.message, msg);
    }
  });
  it("convert system error to user error: no space left on device", async () => {
    const msg = "xxx no space left on device.";
    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        throw new Error(msg);
      }
    }
    hooks(MyClass, {
      myMethod: [ErrorHandlerMW],
    });
    const my = new MyClass();
    const res = await my.myMethod(inputs);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      const error = res.error;
      assert.isTrue(error instanceof UserError);
      assert.equal(error.message, msg);
    }
  });
});
