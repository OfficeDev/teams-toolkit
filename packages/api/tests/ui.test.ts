// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import { assert } from "chai";
import {
  GroupOfTasks,
  InputTextConfig,
  InputTextResult,
  IProgressHandler,
  MultiSelectConfig,
  MultiSelectResult,
  RunnableTask,
  SelectFileConfig,
  SelectFileResult,
  SelectFilesConfig,
  SelectFilesResult,
  SelectFolderConfig,
  SelectFolderResult,
  SingleSelectConfig,
  SingleSelectResult,
  TaskConfig,
  UserInteraction,
} from "../src/qm/ui";
import { err, ok, Result } from "neverthrow";
import { Colors, FxError, UserCancelError } from "../src";

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
class MockUserInteraction implements UserInteraction {
  selectOption(config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> {
    throw new Error("Method not implemented.");
  }
  selectOptions(config: MultiSelectConfig): Promise<Result<MultiSelectResult, FxError>> {
    throw new Error("Method not implemented.");
  }
  inputText(config: InputTextConfig): Promise<Result<InputTextResult, FxError>> {
    throw new Error("Method not implemented.");
  }
  selectFile(config: SelectFileConfig): Promise<Result<SelectFileResult, FxError>> {
    throw new Error("Method not implemented.");
  }
  selectFiles(config: SelectFilesConfig): Promise<Result<SelectFilesResult, FxError>> {
    throw new Error("Method not implemented.");
  }
  selectFolder(config: SelectFolderConfig): Promise<Result<SelectFolderResult, FxError>> {
    throw new Error("Method not implemented.");
  }

  openUrl(link: string): Promise<Result<boolean, FxError>> {
    throw new Error("Method not implemented.");
  }
  async showMessage(
    level: "info" | "warn" | "error",
    message: string,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string | undefined, FxError>>;

  async showMessage(
    level: "info" | "warn" | "error",
    message: Array<{ content: string; color: Colors }>,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string | undefined, FxError>>;

  async showMessage(
    level: "info" | "warn" | "error",
    message: string | Array<{ content: string; color: Colors }>,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string | undefined, FxError>> {
    throw new Error("Method not implemented.");
  }
  createProgressBar(title: string, totalSteps: number): IProgressHandler {
    throw new Error("Method not implemented.");
  }
  async runWithProgress<T>(
    task: RunnableTask<T>,
    config: TaskConfig,
    ...args: any
  ): Promise<Result<T, FxError>> {
    return await task.run(args);
  }
}
describe("UserInteraction(UI) - GroupOfTasks", () => {
  it("case 1: seq=true, fastFail=true, sub-task return error", async () => {
    const task1: RunnableTask<undefined> = {
      name: "task1",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        return ok(undefined);
      },
    };
    const task2: RunnableTask<undefined> = {
      name: "task2",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        return err(UserCancelError);
      },
    };
    const task3: RunnableTask<undefined> = {
      name: "task3",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        return ok(undefined);
      },
    };
    const MockUI = new MockUserInteraction();
    const sequential = true;
    const fastFail = true;
    const showProgress = true;
    const cancellable = true;
    const group = new GroupOfTasks<undefined>([task1, task2, task3], {
      sequential: sequential,
      fastFail: fastFail,
    });
    const res = await MockUI.runWithProgress(group, {
      showProgress: showProgress,
      cancellable: cancellable,
    });
    assert.isTrue(res.isErr() && res.error === UserCancelError);
  });
  it("case 2: seq=true, fastFail=true, sub-task throw error", async () => {
    const task1: RunnableTask<undefined> = {
      name: "task1",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        return ok(undefined);
      },
    };
    const task2: RunnableTask<undefined> = {
      name: "task2",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        throw UserCancelError;
      },
    };
    const task3: RunnableTask<undefined> = {
      name: "task3",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        return ok(undefined);
      },
    };
    const MockUI = new MockUserInteraction();
    const sequential = true;
    const fastFail = true;
    const showProgress = true;
    const cancellable = true;
    const group = new GroupOfTasks<undefined>([task1, task2, task3], {
      sequential: sequential,
      fastFail: fastFail,
    });
    const res = await MockUI.runWithProgress(group, {
      showProgress: showProgress,
      cancellable: cancellable,
    });
    assert.isTrue(res.isErr() && res.error === UserCancelError);
  });
  it("case 3: seq=true, fastFail=true, cancel whole task", async () => {
    const task1: RunnableTask<undefined> = {
      name: "task1",
      isCanceled: false,
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        return ok(undefined);
      },
      cancel() {
        this.isCanceled = true;
      },
    };
    const task2: RunnableTask<undefined> = {
      name: "task2",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        await sleep(1000);
        return ok(undefined);
      },
    };
    const task3: RunnableTask<undefined> = {
      name: "task3",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        return ok(undefined);
      },
    };
    const MockUI = new MockUserInteraction();
    const sequential = true;
    const fastFail = true;
    const showProgress = true;
    const cancellable = true;
    const group = new GroupOfTasks<undefined>([task1, task2, task3], {
      sequential: sequential,
      fastFail: fastFail,
    });
    group.cancel();
    const res = await MockUI.runWithProgress(group, {
      showProgress: showProgress,
      cancellable: cancellable,
    });
    assert.isTrue(res.isErr() && res.error === UserCancelError);
  });
  it("case 4: seq=true, fastFail=false, sub-task throw error", async () => {
    const task1: RunnableTask<undefined> = {
      name: "task1",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        return ok(undefined);
      },
    };
    const task2: RunnableTask<undefined> = {
      name: "task2",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        throw UserCancelError;
      },
    };
    const task3: RunnableTask<undefined> = {
      name: "task3",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        return ok(undefined);
      },
    };
    const MockUI = new MockUserInteraction();
    const sequential = true;
    const fastFail = false;
    const showProgress = true;
    const cancellable = true;
    const group = new GroupOfTasks<undefined>([task1, task2, task3], {
      sequential: sequential,
      fastFail: fastFail,
    });
    const res = await MockUI.runWithProgress(group, {
      showProgress: showProgress,
      cancellable: cancellable,
    });
    assert.isTrue(
      res.isOk() &&
        Array.isArray(res.value) &&
        res.value[1].isErr() &&
        res.value[1].error === UserCancelError
    );
  });

  it("case 5: seq=false, fastFail=true, sub-task throw error", async () => {
    const task1: RunnableTask<undefined> = {
      name: "task1",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        await sleep(100);
        return ok(undefined);
      },
    };
    const task2: RunnableTask<undefined> = {
      name: "task2",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        throw UserCancelError;
      },
    };
    const task3: RunnableTask<undefined> = {
      name: "task3",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        await sleep(100);
        return ok(undefined);
      },
    };
    const MockUI = new MockUserInteraction();
    const sequential = false;
    const fastFail = true;
    const showProgress = true;
    const cancellable = true;
    const group = new GroupOfTasks<undefined>([task1, task2, task3], {
      sequential: sequential,
      fastFail: fastFail,
    });
    const res = await MockUI.runWithProgress(group, {
      showProgress: showProgress,
      cancellable: cancellable,
    });
    assert.isTrue(res.isErr() && res.error === UserCancelError);
  });

  it("case 6: seq=false, fastFail=true, sub-task throw error", async () => {
    const task1: RunnableTask<undefined> = {
      name: "task1",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        await sleep(100);
        return ok(undefined);
      },
    };
    const task2: RunnableTask<undefined> = {
      name: "task2",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        throw UserCancelError;
      },
    };
    const task3: RunnableTask<undefined> = {
      name: "task3",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        await sleep(100);
        return ok(undefined);
      },
    };
    const MockUI = new MockUserInteraction();
    const sequential = false;
    const fastFail = true;
    const showProgress = true;
    const cancellable = true;
    const group = new GroupOfTasks<undefined>([task1, task2, task3], {
      sequential: sequential,
      fastFail: fastFail,
    });
    const res = await MockUI.runWithProgress(group, {
      showProgress: showProgress,
      cancellable: cancellable,
    });
    assert.isTrue(res.isErr() && res.error === UserCancelError);
  });

  it("case 7: seq=false, fastFail=true, sub-task return error", async () => {
    const task1: RunnableTask<undefined> = {
      name: "task1",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        await sleep(100);
        return ok(undefined);
      },
    };
    const task2: RunnableTask<undefined> = {
      name: "task2",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        return err(UserCancelError);
      },
    };
    const task3: RunnableTask<undefined> = {
      name: "task3",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        await sleep(100);
        return ok(undefined);
      },
    };
    const MockUI = new MockUserInteraction();
    const sequential = false;
    const fastFail = true;
    const showProgress = true;
    const cancellable = true;
    const group = new GroupOfTasks<undefined>([task1, task2, task3], {
      sequential: sequential,
      fastFail: fastFail,
    });
    const res = await MockUI.runWithProgress(group, {
      showProgress: showProgress,
      cancellable: cancellable,
    });
    assert.isTrue(res.isErr() && res.error === UserCancelError);
  });

  it("case 8: seq=false, fastFail=false, sub-task return error", async () => {
    const task1: RunnableTask<undefined> = {
      name: "task1",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        await sleep(100);
        return ok(undefined);
      },
    };
    const task2: RunnableTask<undefined> = {
      name: "task2",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        return err(UserCancelError);
      },
    };
    const task3: RunnableTask<undefined> = {
      name: "task3",
      run: async (...args: any): Promise<Result<undefined, FxError>> => {
        await sleep(100);
        return ok(undefined);
      },
    };
    const MockUI = new MockUserInteraction();
    const sequential = false;
    const fastFail = false;
    const showProgress = true;
    const cancellable = true;
    const group = new GroupOfTasks<undefined>([task1, task2, task3], {
      sequential: sequential,
      fastFail: fastFail,
    });
    const res = await MockUI.runWithProgress(group, {
      showProgress: showProgress,
      cancellable: cancellable,
    });
    assert.isTrue(
      res.isOk() &&
        Array.isArray(res.value) &&
        res.value[1].isErr() &&
        res.value[1].error === UserCancelError
    );
  });
});
