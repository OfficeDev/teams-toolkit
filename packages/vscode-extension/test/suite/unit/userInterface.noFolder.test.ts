// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as chai from "chai";
import { Uri } from "vscode";
import {
  DialogMsg,
  DialogType,
  IQuestion,
  MsgLevel,
  QuestionType,
  IProgressStatus,
  Result,
  FxError,
  ok
} from "fx-api";

import { ext } from "../../../src/extensionVariables";
import DialogManagerInstance from "../../../src/userInterface";
import { testFolder } from "../../globalVaribles";
import { EInputType, IUserInputItem, TestUserInput } from "../../testUserInput";
import { sleep } from "../../../src/utils/commonUtils";

suite("UI Unit Tests", async () => {
  suiteSetup(() => {
    // Mock user input.
    ext.ui = new TestUserInput();
  });

  suite("Manually", () => {
    suite("Show Message Immediately", () => {
      test("Infomation", async function(this: Mocha.Context) {
        await DialogManagerInstance["showMessage"]({
          description: "Info",
          level: MsgLevel.Info
        });
        for (let i = 0; i < 1e9; ++i) {} // simulate the large calculated work.
      });

      test("Warning", async function(this: Mocha.Context) {
        await DialogManagerInstance["showMessage"]({
          description: "Warning",
          level: MsgLevel.Warning
        });
        for (let i = 0; i < 1e9; ++i) {} // simulate the large calculated work.
      });

      test("Error", async function(this: Mocha.Context) {
        await DialogManagerInstance["showMessage"]({
          description: "Error",
          level: MsgLevel.Error
        });
        for (let i = 0; i < 1e9; ++i) {} // simulate the large calculated work.
      });
    });

    test("Show Progress", async function(this: Mocha.Context) {
      this.timeout(0);

      const progressIterGenerator = async function*(): AsyncGenerator<
        IProgressStatus,
        Result<null, FxError>
      > {
        for (let i = 0; i < 1e9; ++i) {}
        yield { increment: 0, message: "Start" };
        for (let i = 0; i < 1e9; ++i) {}
        yield { increment: 50, message: "Run" };
        for (let i = 0; i < 1e9; ++i) {}
        yield { increment: 100, message: "Finish" };
        return ok(null);
      };

      await DialogManagerInstance["showProgress"]({
        progressIter: progressIterGenerator(),
        title: "Test"
      });

      await DialogManagerInstance.communicate(
        new DialogMsg(DialogType.ShowProgress, {
          progressIter: progressIterGenerator(),
          title: "Test"
        })
      );
    });

    test("Show Progress 2", async function(this: Mocha.Context) {
      this.timeout(0);
      const handler = DialogManagerInstance.createProgressBar("Test Progress Bar", 3);

      await handler.start("Prepare");
      await sleep(2 * 1000);

      await handler.next("First step");
      await sleep(2 * 1000);

      await handler.next("Second step");
      await sleep(2 * 1000);

      await handler.next("Third step");
      await sleep(2 * 1000);

      await handler.end();
    });

    test("Execute Command", async () => {
      await DialogManagerInstance["askQuestion"]({
        type: QuestionType.ExecuteCmd,
        terminalName: "test",
        description: "cd ../../../.."
      });
      // TODO: do some special command and check it.
    });

    test("Communicate", async () => {
      chai.assert.deepEqual(
        await DialogManagerInstance.communicate(
          new DialogMsg(DialogType.Show, {
            description: "test",
            level: MsgLevel.Info
          })
        ),
        new DialogMsg(DialogType.Show, {
          description: "Show Successfully",
          level: MsgLevel.Info
        })
      );

      chai.assert.deepEqual(
        await DialogManagerInstance.communicate(
          new DialogMsg(DialogType.Output, {
            description: "test",
            level: MsgLevel.Info
          })
        ),
        new DialogMsg(DialogType.Show, {
          description: "Output Successfully",
          level: MsgLevel.Info
        })
      );
    });
  });

  suite("Automation", () => {
    suite("Ask Question", () => {
      test("Radio", async () => {
        const items: IUserInputItem[] = [...Array<number>(9).keys()].map<IUserInputItem>((num) => {
          return { type: EInputType.specifiedItem, index: num % 3 };
        });
        (ext.ui as TestUserInput).addInputItems(items);
        (ext.ui as TestUserInput).addInputItems([{ type: EInputType.specifiedItem, index: 3 }]);

        const question: IQuestion = {
          type: QuestionType.Radio,
          description: "test",
          defaultAnswer: "a",
          options: ["a", "b", "c"]
        };

        chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "a");
        chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "b");
        chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "c");

        question.defaultAnswer = "b";
        chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "b");
        chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "a");
        chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "c");

        question.defaultAnswer = "d";
        chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "d");
        chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "a");
        chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "b");
        chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "c");
      });

      test("Text", async () => {
        (ext.ui as TestUserInput).addInputItems([
          { type: EInputType.defaultValue },
          { type: EInputType.specifiedItem, index: "placeHolder" },
          { type: EInputType.defaultValue },
          { type: EInputType.specifiedItem, index: "placeHolder" },
          { type: EInputType.specifiedValue, value: undefined }
        ]);

        const question: IQuestion = {
          type: QuestionType.Text,
          description: "test",
          defaultAnswer: "abcd"
        };

        chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "abcd");
        chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "test");

        question.defaultAnswer = undefined;
        chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "");
        chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "test");
        chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === undefined);
      });

      test("Select Folder", async () => {
        (ext.ui as TestUserInput).addInputItems([
          { type: EInputType.specifiedValue, value: testFolder },
          { type: EInputType.specifiedValue, value: undefined }
        ]);

        const question: IQuestion = {
          type: QuestionType.SelectFolder,
          description: "lalala"
        };

        chai.assert.ok(
          (await DialogManagerInstance["askQuestion"](question)) === Uri.file(testFolder).fsPath
        );
        chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === undefined);
      });

      test("Open Folder", async () => {
        chai.assert.ok(
          (await DialogManagerInstance["askQuestion"]({
            type: QuestionType.OpenFolder,
            description: Uri.file(testFolder).fsPath
          })) === Uri.file(testFolder).fsPath
        );
      });
    });

    test("Communicate", async () => {
      (ext.ui as TestUserInput).addInputItems([{ type: EInputType.defaultValue }]);

      chai.assert.deepEqual(
        await DialogManagerInstance.communicate(
          new DialogMsg(DialogType.Ask, {
            type: QuestionType.Radio,
            description: "test",
            defaultAnswer: "a",
            options: ["a", "b", "c"]
          })
        ),
        new DialogMsg(DialogType.Answer, "a")
      );

      chai.assert.deepEqual(
        await DialogManagerInstance.communicate(new DialogMsg(DialogType.Answer, "abc")),
        new DialogMsg(DialogType.Show, {
          description: "Wrong Dialog Type",
          level: MsgLevel.Error
        })
      );
    });
  });
});
