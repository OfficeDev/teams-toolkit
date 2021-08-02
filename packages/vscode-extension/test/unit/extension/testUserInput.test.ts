// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as chai from "chai";
import { EInputType, IUserInputItem, TestUserInput } from "./mocks/testUserInput";
import {
  FxError,
  ok,
  Result,
  GroupOfTasks,
  RunnableTask,
  err,
  UserCancelError,
} from "@microsoft/teamsfx-api";
import { sleep } from "../../../src/utils/commonUtils";
import { VsCodeUI } from "../../../src/qm/vsc_ui";
import { ExtensionContext } from "vscode";

suite("Mock Tests", () => {
  suite("User Input", () => {
    test("Creation", () => {
      const ui: TestUserInput = new TestUserInput();
      chai.assert(ui["inputs"].length === 0);

      const items: IUserInputItem[] = [
        { type: EInputType.defaultValue },
        { type: EInputType.specifiedItem, index: 0 },
        { type: EInputType.specifiedValue, value: "test" },
      ];
      ui.addInputItems(items);
      items.forEach((item) => {
        chai.assert.deepEqual(ui["getInputItem"](), item);
      });
    });

    test("Interection", async () => {
      const ui: TestUserInput = new TestUserInput();
      const items: IUserInputItem[] = [
        { type: EInputType.specifiedItem, index: 0 },
        { type: EInputType.specifiedItem, index: 1 },
        { type: EInputType.specifiedValue, value: "c" },
        { type: EInputType.specifiedValue, value: undefined },
      ];
      ui.addInputItems(items);

      chai.assert.equal(await ui.showQuickPick(["a", "b"], { placeHolder: "test" }), "a");
      chai.assert.equal(await ui.showQuickPick(["a", "b"], { placeHolder: "test" }), "b");
      chai.assert.equal(await ui.showQuickPick(["a", "b"], { placeHolder: "test" }), "c");
      chai.assert.equal(await ui.showQuickPick(["a", "b"], { placeHolder: "test" }), undefined);

      // TODO: add other mock tests.
    });

    test("progress", async () => {
      const task1: RunnableTask<undefined> = {
        name: "task1",
        run: async (...args: any): Promise<Result<undefined, FxError>> => {
          await sleep(30);
          return ok(undefined);
        },
      };

      const task2: RunnableTask<undefined> = {
        name: "task2",
        run: async (...args: any): Promise<Result<undefined, FxError>> => {
          await sleep(30);
          return err(UserCancelError);
        },
      };
      const task3: RunnableTask<undefined> = {
        name: "task3",
        run: async (...args: any): Promise<Result<undefined, FxError>> => {
          await sleep(30);
          return ok(undefined);
        },
      };
      const VS_CODE_UI = new VsCodeUI(<ExtensionContext>{});
      const sequential = true;
      const fastFail = true;
      const showProgress = true;
      const cancellable = true;
      const group = new GroupOfTasks<undefined>([task1, task2, task3], {
        sequential: sequential,
        fastFail: fastFail,
      });
      const res = await VS_CODE_UI.runWithProgress(group, {
        showProgress: showProgress,
        cancellable: cancellable,
      });
      chai.assert.isTrue(res.isErr() && res.error === UserCancelError);
    });
  });
});
