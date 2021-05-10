// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { WayToRegisterBot } from "./enums/wayToRegisterBot";
import { QuestionNames, RegularExprs, QuestionOptions } from "./constants";
import { NodeType, QTreeNode } from "@microsoft/teamsfx-api";
import isUUID from "validator/lib/isUUID";

const createQuestions = new QTreeNode({
    type: NodeType.group
});

const wayToRegisterBotQuestion = new QTreeNode({
    name: QuestionNames.WAY_TO_REGISTER_BOT,
    type: NodeType.singleSelect,
    option: QuestionOptions.WAY_TO_REGISTER_BOT_OPTIONS,
    title: "Bot registration",
    default: WayToRegisterBot.CreateNew,
    placeholder: "Select an option"
});

const botIdQuestion = new QTreeNode({
    name: QuestionNames.GET_BOT_ID,
    type: NodeType.text,
    title: "Enter bot id",
    default: "",
    placeholder: "00000000-0000-0000-0000-00000000000",
    prompt: "Open bot managment tool to get bot id",
    validation: {
        validFunc: async (botId: string|string[]|undefined) => {

            if (!botId || !isUUID(botId as string)) {
                return "Invalid bot id: must be a valid GUID.";
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
        validFunc: async (botPassword: string|string[]|undefined) => {

            if (!botPassword) {
                return "Invalid bot password. Password is empty.";
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
