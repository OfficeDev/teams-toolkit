// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { NodeType, TextInputQuestion } from "@microsoft/teamsfx-api";

import {
  DefaultValues,
} from "./constants";
import { QuestionKey } from "./enums";
import { InfoMessages } from "./resources/message";

export const functionNameQuestion:TextInputQuestion = {
  name: QuestionKey.functionName,
  title: InfoMessages.askFunctionName,
  type: NodeType.text,
  default: DefaultValues.functionName
};
