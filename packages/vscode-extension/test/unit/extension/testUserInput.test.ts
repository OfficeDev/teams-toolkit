// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as chai from "chai";
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

import { EInputType, IUserInputItem, TestUserInput } from "./mocks/testUserInput";
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

    test("ui", async () => {
      const VS_CODE_UI = new VsCodeUI(<ExtensionContext>{});
      const task1: RunnableTask<undefined> = {
        name: "task1",
        run: async (...args: any): Promise<Result<undefined, FxError>> => {
          await sleep(3000);
          return ok(undefined);
        },
      };

      const task2: RunnableTask<undefined> = {
        name: "task2",
        run: async (...args: any): Promise<Result<undefined, FxError>> => {
          await sleep(3000);
          return err(UserCancelError);
        },
      };
      const task3: RunnableTask<undefined> = {
        name: "task3",
        run: async (...args: any): Promise<Result<undefined, FxError>> => {
          await sleep(3000);
          return ok(undefined);
        },
      };
      const sequentialRes = await VS_CODE_UI.selectOption({
        name: "sequential",
        title: "sequential",
        options: ["Yes", "No"],
      });
      if (sequentialRes.isErr()) {
        VS_CODE_UI.showMessage("error", sequentialRes.error.name, false);
        return;
      }
      const fastFailRes = await VS_CODE_UI.selectOption({
        name: "fastFail",
        title: "fastFail",
        options: ["Yes", "No"],
      });
      if (fastFailRes.isErr()) {
        VS_CODE_UI.showMessage("error", fastFailRes.error.name, false);
        return;
      }
      const showProgressRes = await VS_CODE_UI.selectOption({
        name: "showProgress",
        title: "showProgress",
        options: ["Yes", "No"],
      });
      if (showProgressRes.isErr()) {
        VS_CODE_UI.showMessage("error", showProgressRes.error.name, false);
        return;
      }
      const cancellableRes = await VS_CODE_UI.selectOption({
        name: "cancellable",
        title: "cancellable",
        options: ["Yes", "No"],
      });
      if (cancellableRes.isErr()) {
        VS_CODE_UI.showMessage("error", cancellableRes.error.name, false);
        return;
      }
      const sequential = sequentialRes.value.result === "Yes";
      const fastFail = fastFailRes.value.result === "Yes";
      const showProgress = showProgressRes.value.result === "Yes";
      const cancellable = cancellableRes.value.result === "Yes";
      const group = new GroupOfTasks<undefined>([task1, task2, task3], {
        sequential: sequential,
        fastFail: fastFail,
      });
      await VS_CODE_UI.runWithProgress(group, {
        showProgress: showProgress,
        cancellable: cancellable,
      });
    });
  });
});
