// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  ConcurrentError,
  ConfigFolderName,
  CoreCallbackEvent,
  FxError,
  Inputs,
  ok,
  Platform,
  Result,
  UserCancelError,
} from "@microsoft/teamsfx-api";
import { assert, expect } from "chai";
import fs from "fs-extra";
import "mocha";
import * as sinon from "sinon";
import * as os from "os";
import * as path from "path";
import { getLockFolder } from "../../../src";
import { CallbackRegistry } from "../../../src/core/callback";
import {
  CoreSource,
  InvalidProjectError,
  NoProjectOpenedError,
  PathNotExistError,
} from "../../../src/core/error";
import { ConcurrentLockerMW } from "../../../src/core/middleware";
import { randomAppName } from "../utils";
import * as tools from "../../../src/common/tools";

describe("Middleware - ConcurrentLockerMW", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("check lock file existence", async () => {
    class MyClass1 {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        const lockFileDir = getLockFolder(inputs.projectPath!);
        const lockfilePath = path.join(lockFileDir, `${ConfigFolderName}.lock`);
        const exist = await fs.pathExists(lockfilePath);
        assert.isTrue(exist);
        return ok("");
      }
    }
    hooks(MyClass1, {
      myMethod: [ConcurrentLockerMW],
    });
    const my = new MyClass1();
    const inputs: Inputs = { platform: Platform.VSCode };
    inputs.projectPath = path.join(os.tmpdir(), randomAppName());
    const lockFileDir = getLockFolder(inputs.projectPath!);
    try {
      await fs.ensureDir(inputs.projectPath);
      await fs.ensureDir(path.join(inputs.projectPath, `.${ConfigFolderName}`));
      await my.myMethod(inputs);
      const lockfilePath = path.join(lockFileDir, `${ConfigFolderName}.lock`);
      const exist = await fs.pathExists(lockfilePath);
      assert.isFalse(exist);
    } finally {
      await fs.rmdir(inputs.projectPath!, { recursive: true });
    }
  });

  class MyClass {
    count = 0;
    async methodReturnOK(inputs: Inputs): Promise<Result<any, FxError>> {
      this.count++;
      return ok("");
    }
    async methodThrowError(inputs: Inputs): Promise<Result<any, FxError>> {
      this.count++;
      throw UserCancelError;
    }
    async methodCallSelf(inputs: Inputs): Promise<Result<any, FxError>> {
      this.count++;
      const res = await this.methodCallSelf(inputs);
      assert.isTrue(res.isErr() && res.error.name === new ConcurrentError(CoreSource).name);
      const res2 = await this.methodCallSelf(inputs);
      assert.isTrue(res2.isErr() && res2.error.name === new ConcurrentError(CoreSource).name);
      return ok("");
    }
  }
  hooks(MyClass, {
    methodReturnOK: [ConcurrentLockerMW],
    methodThrowError: [ConcurrentLockerMW],
    methodCallSelf: [ConcurrentLockerMW],
  });

  it("sequence: ok", async () => {
    const inputs: Inputs = { platform: Platform.VSCode };
    inputs.projectPath = path.join(os.tmpdir(), randomAppName());
    try {
      await fs.ensureDir(inputs.projectPath);
      await fs.ensureDir(path.join(inputs.projectPath, `.${ConfigFolderName}`));
      const my = new MyClass();
      await my.methodReturnOK(inputs);
      await my.methodReturnOK(inputs);
      assert.isTrue(my.count === 2);
    } finally {
      await fs.rmdir(inputs.projectPath!, { recursive: true });
    }
  });

  it("single: throw error", async () => {
    const inputs: Inputs = { platform: Platform.VSCode };
    inputs.projectPath = path.join(os.tmpdir(), randomAppName());
    try {
      await fs.ensureDir(inputs.projectPath);
      await fs.ensureDir(path.join(inputs.projectPath, `.${ConfigFolderName}`));
      const my = new MyClass();
      await my.methodThrowError(inputs);
    } catch (e) {
      assert.isTrue(e === UserCancelError);
    } finally {
      await fs.rmdir(inputs.projectPath!, { recursive: true });
    }
  });

  it("single: invalid NoProjectOpenedError", async () => {
    const inputs: Inputs = { platform: Platform.VSCode };
    inputs.projectPath = undefined;
    const my = new MyClass();
    const res = await my.methodReturnOK(inputs);
    assert.isTrue(res.isErr() && res.error.name === NoProjectOpenedError().name);
    assert.isTrue(my.count === 0);
  });

  it("single: invalid PathNotExistError", async () => {
    const my = new MyClass();
    const inputs: Inputs = { platform: Platform.VSCode };
    inputs.projectPath = path.join(os.tmpdir(), randomAppName());
    const res = await my.methodReturnOK(inputs);
    assert.isTrue(res.isErr() && res.error.name === PathNotExistError(inputs.projectPath).name);
    assert.isTrue(my.count === 0);
  });

  it("single: invalid InvalidProjectError", async () => {
    const my = new MyClass();
    const inputs: Inputs = { platform: Platform.VSCode };
    inputs.projectPath = path.join(os.tmpdir(), randomAppName());
    try {
      await fs.ensureDir(inputs.projectPath);
      const res = await my.methodReturnOK(inputs);
      assert.isTrue(res.isErr() && res.error.name === InvalidProjectError().name);
    } finally {
      await fs.rmdir(inputs.projectPath!, { recursive: true });
    }
    assert.isTrue(my.count === 0);
  });

  it("concurrent: fail to get lock", async () => {
    const inputs: Inputs = { platform: Platform.VSCode };
    const my = new MyClass();
    sinon.stub(tools, "waitSeconds").resolves();
    try {
      inputs.projectPath = path.join(os.tmpdir(), randomAppName());
      await fs.ensureDir(inputs.projectPath);
      await fs.ensureDir(path.join(inputs.projectPath, `.${ConfigFolderName}`));
      await my.methodCallSelf(inputs);
    } finally {
      await fs.rmdir(inputs.projectPath!, { recursive: true });
    }
    assert.isTrue(my.count === 1);
  });

  // it("concurrent: ignore lock", async () => {
  //   class MyClass2 {
  //     count1 = 0;
  //     count2 = 0;
  //     async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
  //       this.count1++;
  //       const inputs2: Inputs = { platform: Platform.VSCode, ignoreLock: true };
  //       const res2 = await this.myMethod2(inputs2);
  //       assert.isTrue(res2.isOk() && res2.value === "");
  //       return ok("");
  //     }
  //     async myMethod2(inputs: Inputs): Promise<Result<any, FxError>> {
  //       this.count2++;
  //       return ok("");
  //     }
  //   }
  //   hooks(MyClass2, {
  //     myMethod: [ConcurrentLockerMW],
  //     myMethod2: [ConcurrentLockerMW],
  //   });
  //   const inputs: Inputs = { platform: Platform.VSCode };
  //   const my = new MyClass2();
  //   try {
  //     inputs.projectPath = path.join(os.tmpdir(), randomAppName());
  //     await fs.ensureDir(inputs.projectPath);
  //     await fs.ensureDir(path.join(inputs.projectPath, `.${ConfigFolderName}`));
  //     await my.myMethod(inputs);
  //   } finally {
  //     await fs.rmdir(inputs.projectPath!, { recursive: true });
  //   }
  //   assert.isTrue(my.count1 === 1);
  //   assert.isTrue(my.count2 === 1);
  // });

  it("callback should work", async () => {
    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        return ok("");
      }
    }
    let d = 0;
    const lockCb = () => {
      d++;
    };
    const unlockCb = () => {
      d--;
    };

    CallbackRegistry.set(CoreCallbackEvent.lock, lockCb);
    CallbackRegistry.set(CoreCallbackEvent.lock, lockCb);
    CallbackRegistry.set(CoreCallbackEvent.unlock, unlockCb);

    hooks(MyClass, {
      myMethod: [ConcurrentLockerMW],
    });

    const my = new MyClass();
    const inputs: Inputs = { platform: Platform.VSCode };
    inputs.projectPath = path.join(os.tmpdir(), randomAppName());
    try {
      await fs.ensureDir(inputs.projectPath);
      await fs.ensureDir(path.join(inputs.projectPath, `.${ConfigFolderName}`));
      await my.myMethod(inputs);
      expect(d).eql(1);
    } finally {
      await fs.rmdir(inputs.projectPath!, { recursive: true });
    }
  });
});
