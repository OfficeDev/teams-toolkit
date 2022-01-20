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
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import { CommonErrorHandlerMW } from "../../../src/core/middleware/CommonErrorHandlerMW";

describe("Middleware - CommonErrorHandlerMW", () => {
  const inputs: Inputs = { platform: Platform.VSCode };
  it("return FxError", async () => {
    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        return err(UserCancelError);
      }
    }
    hooks(MyClass, {
      myMethod: [CommonErrorHandlerMW()],
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
      myMethod: [CommonErrorHandlerMW()],
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
      myMethod: [CommonErrorHandlerMW()],
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
      myMethod: [CommonErrorHandlerMW()],
    });
    const my = new MyClass();
    const res = await my.myMethod(inputs);
    assert.isTrue(
      res.isErr() && res.error instanceof SystemError && res.error.message === "unknown"
    );
  });

  it("startFn, endFn called when throw Error", async () => {
    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        throw "unknown";
      }
    }
    let startFnCalled = false;
    let endFnCalled = false;
    hooks(MyClass, {
      myMethod: [
        CommonErrorHandlerMW({
          startFn: async (ctx) => {
            startFnCalled = true;
            return ok(undefined);
          },
          endFn: async (ctx) => {
            endFnCalled = true;
            return ok(undefined);
          },
        }),
      ],
    });
    const my = new MyClass();
    const res = await my.myMethod(inputs);
    assert.isTrue(res.isErr());
    assert.isTrue(startFnCalled);
    assert.isTrue(endFnCalled);
  });

  it("startFn, endFn called when ok", async () => {
    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        return ok(undefined);
      }
    }
    let startFnCalled = false;
    let endFnCalled = false;
    hooks(MyClass, {
      myMethod: [
        CommonErrorHandlerMW({
          startFn: async (ctx) => {
            startFnCalled = true;
            return ok(undefined);
          },
          endFn: async (ctx) => {
            endFnCalled = true;
            return ok(undefined);
          },
        }),
      ],
    });
    const my = new MyClass();
    const res = await my.myMethod(inputs);
    assert.isTrue(res.isOk());
    assert.isTrue(startFnCalled);
    assert.isTrue(endFnCalled);
  });
});
