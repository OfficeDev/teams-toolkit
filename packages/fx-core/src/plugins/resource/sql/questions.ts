// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { NodeType, QTreeNode, Inputs } from "@microsoft/teamsfx-api";
import { Constants } from "./constants";
import { sqlConfirmPasswordValidatorGenerator, sqlPasswordValidatorGenerator, sqlUserNameValidator } from "./utils/checkInput";

export const adminNameQuestion = new QTreeNode({
  name: Constants.questionKey.adminName,
  title: Constants.userQuestion.adminName,
  type: NodeType.text,
  validation: {
    validFunc: async (input: string, previousInputs: Inputs) : Promise<string | undefined> => {
      const res = sqlUserNameValidator(input as string);
      return res;
    }
  }
});

export const adminPasswordQuestion = new QTreeNode({
  name: Constants.questionKey.adminPassword,
  title: Constants.userQuestion.adminPassword,
  type: NodeType.text,
  password: true,
  validation: {
    validFunc: async (input: string, previousInputs: Inputs) : Promise<string | undefined> => {
      const password = input as string;
      const name = previousInputs![Constants.questionKey.adminName] as string;
      const res = sqlPasswordValidatorGenerator(name)(password);
      return res;
    }
  }
});

export const confirmPasswordQuestion = new QTreeNode({
  name: Constants.questionKey.confirmPassword,
  title: Constants.userQuestion.confirmPassword,
  type: NodeType.text,
  password: true,
  validation: {
    validFunc: async (input: string, previousInputs?: Inputs) : Promise<string | undefined> => {
      const confirm = input as string;
      const password = previousInputs![Constants.questionKey.adminPassword] as string;
      const res = sqlConfirmPasswordValidatorGenerator(password)(confirm);
      return res;
    }
  }
});

export const skipAddingUserQuestion = new QTreeNode({
  name: Constants.questionKey.skipAddingUser,
  title: Constants.userQuestion.confirmPassword,
  type: NodeType.singleSelect,
  option: ["true", "false"],
  default: "false",
});
