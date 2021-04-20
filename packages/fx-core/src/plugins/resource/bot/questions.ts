// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { WayToRegisterBot } from "./enums/wayToRegisterBot";
import { QuestionNames, RegularExprs, QuestionOptions } from "./constants";
import { NodeType, QTreeNode } from "fx-api";

const createQuestions = new QTreeNode({
    type: NodeType.group
});

const wayToRegisterBotQuestion = new QTreeNode({
    name: QuestionNames.WAY_TO_REGISTER_BOT,
    type: NodeType.singleSelect,
    option: QuestionOptions.WAY_TO_REGISTER_BOT_OPTIONS,
    title: "Bot registration",
    default: WayToRegisterBot.CreateNew
});

const botIdQuestion = new QTreeNode({
    name: QuestionNames.GET_BOT_ID,
    type: NodeType.text,
    title: "Enter bot id",
    default: "",
    validation: {
        validFunc: async (botId: string) => {

            if (!RegularExprs.BOT_ID.test(botId)) {
                return `Invalid bot id: must be a valid GUID.`;
            }

            return undefined;
        }
    }
});

const botPasswordQuestion = new QTreeNode({
    name: QuestionNames.GET_BOT_PASSWORD,
    type: NodeType.password,
    title: "Enter bot password",
    default: "",
    validation: {
        validFunc: async (botPassword: string) => {

            if (!RegularExprs.BOT_PASSWORD.test(botPassword)) {
                return `Invalid bot password. Password must be alphanumeric and may contain the following: '.', '_', '-', and '~'.`;
            }

            return undefined;
        }
    }
});

const reusingExistingBotGroup = new QTreeNode({
    type: NodeType.group
});

reusingExistingBotGroup.addChild(botIdQuestion);
reusingExistingBotGroup.addChild(botPasswordQuestion);

reusingExistingBotGroup.condition = {
    equals: WayToRegisterBot.ReuseExisting
};

wayToRegisterBotQuestion.addChild(reusingExistingBotGroup);

createQuestions.addChild(wayToRegisterBotQuestion);

export { createQuestions };
