// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FuncValidation, Inputs, Json, Platform, QTreeNode } from "@microsoft/teamsfx-api";
import { QuestionAppName } from "../core/question";

async function test() {
  const functionMap = new Map<string, any>();

  const question = QuestionAppName;

  const funcValidation = question.validation as FuncValidation<string>;

  const functionName = `validFunc-${new Date().getTime()}`;

  functionMap.set(functionName, funcValidation.validFunc);

  (question as Json).validation = { validFunc: functionName };

  console.log(JSON.stringify(question, null, 4));

  const func = functionMap.get(functionName);

  if (func) {
    const inputs: Inputs = { platform: Platform.VSCode, folder: "." };
    console.log(await func("123abc123", inputs));
  }
}

test();
