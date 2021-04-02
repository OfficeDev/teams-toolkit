// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ProgrammingLanguage } from "./enums/programmingLanguage";
import { WayToRegisterBot } from "./enums/wayToRegisterBot";
import { QuestionNames, RegularExprs } from "./constants";
import { NodeType, QTreeNode } from "teamsfx-api";

const createQuestions = new QTreeNode({
    type: NodeType.group
});

const programmingLanguageQuestion = new QTreeNode({
    name: QuestionNames.PROGRAMMING_LANGUAGE,
    type: NodeType.singleSelect,
    option: Object.values(ProgrammingLanguage).map((value) => value.toLowerCase()),
    title: "Which programming language is scaffold based on?",
    default: ProgrammingLanguage.TypeScript
});

const wayToRegisterBotQuestion = new QTreeNode({
    name: QuestionNames.WAY_TO_REGISTER_BOT,
    type: NodeType.singleSelect,
    option: Object.values(WayToRegisterBot).map((value) => value.toLowerCase()),
    title: "Which way to get a bot registration?",
    default: WayToRegisterBot.CreateNew
});

const botIdQuestion = new QTreeNode({
    name: QuestionNames.GET_BOT_ID,
    type: NodeType.text,
    title: "Please enter bot id",
    default: "",
    validation: {
        validFunc: async (botId: string) => {

            if (!RegularExprs.BOT_ID.test(botId)) {
                return `The bot id entered is in wrong format. Please refer to regex ${RegularExprs.BOT_ID} .`
            }

            return undefined;
        }
    }
});

const botPasswordQuestion = new QTreeNode({
    name: QuestionNames.GET_BOT_PASSWORD,
    type: NodeType.password,
    title: "Please enter bot password",
    default: "",
    validation: {
        validFunc: async (botPassword: string) => {

            if (!RegularExprs.BOT_PASSWORD.test(botPassword)) {
                return `The bot password entered is in wrong format. Please refer to regex ${RegularExprs.BOT_PASSWORD} .`
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

createQuestions.addChild(programmingLanguageQuestion);
createQuestions.addChild(wayToRegisterBotQuestion);

export { createQuestions };
