// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as chai from "chai";

import { EInputType, IUserInputItem, TestUserInput } from "../../testUserInput";

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
  });
});
