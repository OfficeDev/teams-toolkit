// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";

import { FuncValidation } from "@microsoft/teamsfx-api";
import {
  AppServiceOptionItem,
  createHostTypeTriggerQuestion,
  FunctionsHttpTriggerOptionItem,
  FunctionsTimerTriggerOptionItem,
} from "../../../../../src/plugins/resource/bot/question";

describe("Test question", () => {
  describe("HostTypeTrigger question", () => {
    beforeEach(() => {
      sinon.restore();
    });

    it("validation", async () => {
      // Arrange
      // [inputs, outputs, message]
      const cases: ([string[], boolean] | [string[], boolean, string])[] = [
        [[], false, "should not accept empty value"],
        [[AppServiceOptionItem.id], true, "should accept app service"],
        [
          [AppServiceOptionItem.id, FunctionsHttpTriggerOptionItem.id],
          false,
          "should not accept app service & functions",
        ],
        [
          [FunctionsHttpTriggerOptionItem.id, FunctionsTimerTriggerOptionItem.id],
          true,
          "should accept all functions triggers",
        ],
      ];
      const question = createHostTypeTriggerQuestion();
      const validFunc = (question.validation as FuncValidation<string[]>).validFunc;

      for (const c of cases) {
        const [input, valid, message] = c;
        // Act
        const result = await validFunc(input);

        // Assert
        chai.assert.equal(result === undefined, valid, message);
      }
    });

    it("change selection", async () => {
      // Arrange
      const cases: [string[], string[], string[], string][] = [
        [
          [],
          [FunctionsHttpTriggerOptionItem.id],
          [FunctionsHttpTriggerOptionItem.id],
          "should not change the first selection when empty",
        ],
        [
          [FunctionsHttpTriggerOptionItem.id],
          [FunctionsHttpTriggerOptionItem.id, FunctionsTimerTriggerOptionItem.id],
          [FunctionsHttpTriggerOptionItem.id, FunctionsTimerTriggerOptionItem.id],
          "should not change the first selection when not empty",
        ],
        [
          [FunctionsHttpTriggerOptionItem.id, FunctionsTimerTriggerOptionItem.id],
          [
            FunctionsHttpTriggerOptionItem.id,
            FunctionsTimerTriggerOptionItem.id,
            AppServiceOptionItem.id,
          ],
          [AppServiceOptionItem.id],
          "should remove functions on selecting app service",
        ],
        [
          [AppServiceOptionItem.id],
          [FunctionsTimerTriggerOptionItem.id, AppServiceOptionItem.id],
          [FunctionsTimerTriggerOptionItem.id],
          "should remove app service on selecting functions",
        ],
        [
          [FunctionsHttpTriggerOptionItem.id, FunctionsTimerTriggerOptionItem.id],
          [FunctionsTimerTriggerOptionItem.id],
          [FunctionsTimerTriggerOptionItem.id],
          "should do nothing on un-selecting",
        ],
      ];
      const question = createHostTypeTriggerQuestion();
      chai.assert.notStrictEqual(question.onDidChangeSelection, undefined);
      const onDidChangeSelection = question.onDidChangeSelection!;

      for (const c of cases) {
        const [previousSelection, currentSelection, expectedResult, message] = c;
        // Act
        const resultSet = await onDidChangeSelection(
          new Set(currentSelection),
          new Set(previousSelection)
        );
        // Assert
        // sort and uniq to compare sets
        const result = [...resultSet].sort();
        const expected = [...new Set(expectedResult)].sort();

        chai.assert.deepEqual(result, expected, message);
      }
    });
  });
});
