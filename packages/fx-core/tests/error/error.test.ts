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
  UserError,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import { convertError, ErrorHandlerMW } from "../../src/core/middleware/errorHandler";
import {
  FilePermissionError,
  UnhandledError,
  UnhandledUserError,
  UserCancelError,
} from "../../src/error/common";

describe("Middleware - ErrorHandlerMW", () => {
  const inputs: Inputs = { platform: Platform.VSCode };
  it("return FxError", async () => {
    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        return err(new UserCancelError());
      }
    }
    hooks(MyClass, {
      myMethod: [ErrorHandlerMW],
    });
    const my = new MyClass();
    const res = await my.myMethod(inputs);
    assert.isTrue(res.isErr() && res.error instanceof UserCancelError);
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
        throw new UserCancelError();
      }
    }

    hooks(MyClass, {
      myMethod: [ErrorHandlerMW],
    });
    const my = new MyClass();
    const res = await my.myMethod(inputs);
    assert.isTrue(res.isErr() && res.error instanceof UserCancelError);
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
    assert.isTrue(res.isErr() && res.error instanceof UnhandledError);
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
    }
  });
});

describe("convertError", () => {
  it("EPERM: operation not permitted (Error)", () => {
    const error = new Error(`EPERM: operation not permitted, open '<REDACTED: user-file-path>'`);
    const converted = convertError(error);
    assert.isTrue(converted instanceof UserError);
  });
  it("EPERM: operation not permitted (SystemError)", () => {
    const error = new SystemError(
      "test",
      "Error",
      `EPERM: operation not permitted, open '<REDACTED: user-file-path>'`
    );
    const converted = convertError(error);
    assert.isTrue(converted instanceof UserError);
  });
});

describe("Errors", () => {
  it("FilePermissionError", () => {
    const error = new Error(`EPERM: operation not permitted, open '<REDACTED: user-file-path>'`);
    const converted = new FilePermissionError(error);
    assert.isTrue(converted instanceof UserError);
  });
  it("UnhandledError", () => {
    const error = new Error("test");
    const error1 = new UnhandledError(error);
    assert.isTrue(error1 instanceof SystemError);
    const error2 = new UnhandledError(error, "source");
    assert.isTrue(error2 instanceof SystemError);
  });
  it("UnhandledUserError", () => {
    const error = new Error("test");
    const error1 = new UnhandledUserError(error);
    assert.isTrue(error1 instanceof UserError);
    const error2 = new UnhandledUserError(error, "source");
    assert.isTrue(error2 instanceof UserError);
  });
});
