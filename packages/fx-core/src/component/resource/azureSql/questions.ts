// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, QTreeNode, TextInputQuestion } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../../../common/localizeUtils";
import { Constants } from "./constants";
import {
  sqlConfirmPasswordValidatorGenerator,
  sqlPasswordValidatorGenerator,
  sqlUserNameValidator,
} from "./utils/checkInput";

export const adminNameQuestion: TextInputQuestion = {
  name: Constants.questionKey.adminName,
  title: getLocalizedString("plugins.sql.getQuestionAdminName.title"),
  type: "text",
  validation: {
    validFunc: async (input: string, previousInputs?: Inputs): Promise<string | undefined> => {
      const res = sqlUserNameValidator(input as string);
      return res;
    },
  },
};

export const adminPasswordQuestion: TextInputQuestion = {
  name: Constants.questionKey.adminPassword,
  title: getLocalizedString("plugins.sql.getQuestionAdminPassword.title"),
  type: "text",
  password: true,
  validation: {
    validFunc: async (input: string, previousInputs?: Inputs): Promise<string | undefined> => {
      const password = input as string;
      const name = previousInputs![Constants.questionKey.adminName] as string;
      const res = sqlPasswordValidatorGenerator(name)(password);
      return res;
    },
  },
};

export const confirmPasswordQuestion: TextInputQuestion = {
  name: Constants.questionKey.confirmPassword,
  title: getLocalizedString("plugins.sql.getQuestionConfirmPassword.title"),
  type: "text",
  password: true,
  validation: {
    validFunc: async (input: string, previousInputs?: Inputs): Promise<string | undefined> => {
      const confirm = input as string;
      const password = previousInputs![Constants.questionKey.adminPassword] as string;
      const res = sqlConfirmPasswordValidatorGenerator(password)(confirm);
      return res;
    },
  },
};

export function buildQuestionNode(): QTreeNode {
  const sqlNode = new QTreeNode({
    type: "group",
  });
  sqlNode.addChild(new QTreeNode(adminNameQuestion));
  sqlNode.addChild(new QTreeNode(adminPasswordQuestion));
  sqlNode.addChild(new QTreeNode(confirmPasswordQuestion));
  return sqlNode;
}
