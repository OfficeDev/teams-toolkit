// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as chai from "chai";
import { ExtensionContext, Uri } from "vscode";

import { ext } from "../../../src/extensionVariables";
import DialogManagerInstance from "../../../src/userInterface";
import { testFolder } from "./utils/globalVaribles";
import { EInputType, IUserInputItem, TestUserInput } from "./mocks/testUserInput";
import { sleep } from "../../../src/utils/commonUtils";
import { VsCodeUI } from "../../../src/qm/vsc_ui";

suite("UI Unit Tests", async () => {
  suiteSetup(() => {
    // Mock user input.
    ext.ui = new TestUserInput();
  });

  suite("Manually", () => {
    test("Show Progress 2", async function (this: Mocha.Context) {
      this.timeout(0);
      const VS_CODE_UI = new VsCodeUI(<ExtensionContext>{});
      const handler = VS_CODE_UI.createProgressBar("Test Progress Bar", 3);

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
  });

  suite("Automation", () => {
    suite("Ask Question", () => {
      // test("Radio", async () => {
      //   const items: IUserInputItem[] = [...Array<number>(9).keys()].map<IUserInputItem>((num) => {
      //     return { type: EInputType.specifiedItem, index: num % 3 };
      //   });
      //   (ext.ui as TestUserInput).addInputItems(items);
      //   (ext.ui as TestUserInput).addInputItems([{ type: EInputType.specifiedItem, index: 3 }]);
      //   const question: IQuestion = {
      //     type: QuestionType.Radio,
      //     description: "test",
      //     defaultAnswer: "a",
      //     options: ["a", "b", "c"],
      //   };
      //   chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "a");
      //   chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "b");
      //   chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "c");
      //   question.defaultAnswer = "b";
      //   chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "b");
      //   chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "a");
      //   chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "c");
      //   question.defaultAnswer = "d";
      //   chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "d");
      //   chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "a");
      //   chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "b");
      //   chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "c");
      // });
      // test("Text", async () => {
      //   (ext.ui as TestUserInput).addInputItems([
      //     { type: EInputType.defaultValue },
      //     { type: EInputType.specifiedItem, index: "placeHolder" },
      //     { type: EInputType.defaultValue },
      //     { type: EInputType.specifiedItem, index: "placeHolder" },
      //     { type: EInputType.specifiedValue, value: undefined },
      //   ]);
      //   const question: IQuestion = {
      //     type: QuestionType.Text,
      //     description: "test",
      //     defaultAnswer: "abcd",
      //   };
      //   chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "abcd");
      //   chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "test");
      //   question.defaultAnswer = undefined;
      //   chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "");
      //   chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === "test");
      //   chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === undefined);
      // });
      // test("Select Folder", async () => {
      //   (ext.ui as TestUserInput).addInputItems([
      //     { type: EInputType.specifiedValue, value: testFolder },
      //     { type: EInputType.specifiedValue, value: undefined },
      //   ]);
      //   const question: IQuestion = {
      //     type: QuestionType.SelectFolder,
      //     description: "lalala",
      //   };
      //   chai.assert.ok(
      //     (await DialogManagerInstance["askQuestion"](question)) === Uri.file(testFolder).fsPath
      //   );
      //   chai.assert.ok((await DialogManagerInstance["askQuestion"](question)) === undefined);
      // });
    });
  });
});
