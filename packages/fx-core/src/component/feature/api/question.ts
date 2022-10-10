// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { TextInputQuestion } from "@microsoft/teamsfx-api";
import { QuestionKey } from "../../code/api/enums";
import { LogMessages } from "../../messages";
import { DefaultValues } from "./constants";

export const functionNameQuestion: TextInputQuestion = {
  name: QuestionKey.functionName,
  title: LogMessages.askFunctionName,
  type: "text",
  default: DefaultValues.functionName,
};
