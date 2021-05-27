// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { WayToRegisterBot } from "./enums/wayToRegisterBot";
import { QuestionNames, QuestionOptions } from "./constants";
import { Inputs, QTreeNode } from "@microsoft/teamsfx-api";
import isUUID from "validator/lib/isUUID";

const createQuestions = new QTreeNode({
  type: "group",
});

const wayToRegisterBotQuestion = new QTreeNode({
  name: QuestionNames.WAY_TO_REGISTER_BOT,
  type: "singleSelect",
  staticOptions: QuestionOptions.WAY_TO_REGISTER_BOT_OPTIONS,
  title: "Bot registration",
  default: WayToRegisterBot.CreateNew,
  placeholder: "Select an option",
});

const botIdQuestion = new QTreeNode({
  name: QuestionNames.GET_BOT_ID,
  type: "text",
  title: "Enter bot id",
  default: "",
  placeholder: "00000000-0000-0000-0000-00000000000",
  prompt: "Open bot managment tool to get bot id",
  validation: {
    validFunc: async (input: string, previousInputs?: Inputs) => {
      const botId = input as string;
      if (!botId || !isUUID(botId)) {
        return "Invalid bot id: must be a valid GUID.";
      }

      return undefined;
    },
  },
});

const botPasswordQuestion = new QTreeNode({
  name: QuestionNames.GET_BOT_PASSWORD,
  type: "text",
  password: true,
  title: "Enter bot password",
  default: "",
  validation: {
    validFunc: async (input: string, previousInputs?: Inputs) => {
      if (!(input as string)) {
        return "Invalid bot password. Password is empty.";
      }
      return undefined;
    },
  },
});

const reusingExistingBotGroup = new QTreeNode({
  type: "group",
});

reusingExistingBotGroup.addChild(botIdQuestion);
reusingExistingBotGroup.addChild(botPasswordQuestion);

reusingExistingBotGroup.condition = {
  equals: WayToRegisterBot.ReuseExisting,
};

wayToRegisterBotQuestion.addChild(reusingExistingBotGroup);

createQuestions.addChild(wayToRegisterBotQuestion);

export { createQuestions };
