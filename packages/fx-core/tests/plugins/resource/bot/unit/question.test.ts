// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";

import { FuncValidation, Inputs, Platform } from "@microsoft/teamsfx-api";
import {
  AppServiceOptionItem,
  createHostTypeTriggerQuestion,
  FunctionsHttpTriggerOptionItem,
  FunctionsTimerTriggerOptionItem,
  showNotificationTriggerCondition,
} from "../../../../../src/plugins/resource/bot/question";
import {
  AzureSolutionQuestionNames,
  CommandAndResponseOptionItem,
  NotificationOptionItem,
} from "../../../../../src/plugins/solution/fx-solution/question";

describe("Test question", () => {
  describe("Workaround CLI default value issue, remove me after CLI is fixed", () => {
    it("cliName and ID must be the same", () => {
      // Arrange
      const question = createHostTypeTriggerQuestion(Platform.VSCode);
      for (const option of question.staticOptions) {
        if (typeof option !== "string") {
          // Assert
          chai.assert.equal(
            option.id,
            option.cliName,
            "option.id and option.cliName must be the same to workaround CLI default value issue"
          );
        }
      }
    });
  });

  describe("Workaround CLI label display issue", () => {
    it("merges description into label", () => {
      const question = createHostTypeTriggerQuestion(Platform.CLI);
      for (const option of question.staticOptions) {
        chai.assert.isNotString(option);
        if (typeof option !== "string") {
          chai.assert.isOk(option.description);
          chai.assert.include(option.label, option.description!);
        }
      }
    });
  });

  describe("Test showNotificationCondition", () => {
    it("Should not ask trigger questions for legacy bot", async () => {
      // Arrange
      const inputs: Inputs = { platform: Platform.VSCode };
      // Act
      inputs[AzureSolutionQuestionNames.Capabilities] = undefined;
      // Assert
      chai.assert.isTrue(
        showNotificationTriggerCondition.validFunc(undefined, inputs) !== undefined
      );
    });
    it("Should ask trigger questions for notification bot", async () => {
      // Arrange
      const inputs: Inputs = { platform: Platform.VSCode };
      // Act
      inputs[AzureSolutionQuestionNames.Capabilities] = NotificationOptionItem.id;
      // Assert
      chai.assert.isUndefined(showNotificationTriggerCondition.validFunc(undefined, inputs));
    });
    it("Should not ask trigger questions for command and response bot", async () => {
      // Arrange
      const inputs: Inputs = { platform: Platform.VSCode };
      // Act
      inputs[AzureSolutionQuestionNames.Capabilities] = CommandAndResponseOptionItem.id;
      // Assert
      chai.assert.isTrue(
        showNotificationTriggerCondition.validFunc(undefined, inputs) !== undefined
      );
    });
  });
});
