// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { QTreeNode, TextInputQuestion } from "@microsoft/teamsfx-api";
import { Constants } from "./constants";

export const adminNameQuestion: TextInputQuestion = {
  name: Constants.questionKey.adminName,
  title: Constants.userQuestion.adminName,
  type: "text"
};

export const adminPasswordQuestion: TextInputQuestion = {
  name: Constants.questionKey.adminPassword,
  title: Constants.userQuestion.adminPassword,
  type: "text",
  password: true
};

export const confirmPasswordQuestion: TextInputQuestion = {
  name: Constants.questionKey.confirmPassword,
  title: Constants.userQuestion.confirmPassword,
  type: "text",
  password: true
};

export const skipAddingUserQuestion = new QTreeNode({
  name: Constants.questionKey.skipAddingUser,
  title: Constants.userQuestion.confirmPassword,
  type: "singleSelect",
  staticOptions: ["true", "false"],
  default: "false",
});
