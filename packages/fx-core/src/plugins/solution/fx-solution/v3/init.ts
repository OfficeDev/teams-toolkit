// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, ok, QTreeNode, Result, v2, Void } from "@microsoft/teamsfx-api";

export async function getQuestionsForInit(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  // const node = new QTreeNode({
  //   name: "set-azure-solution",
  //   type: "func",
  //   func: (inputs: Inputs) => {
  //     inputs[AzureSolutionQuestionNames.Solution] = BuiltInSolutionNames.azure;
  //   },
  // });
  // node.condition = { containsAny: [TabOptionItem.id, BotOptionItem.id, MessageExtensionItem.id] };
  // return ok(node);
  return ok(undefined);
}

export async function init(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath
): Promise<Result<Void, FxError>> {
  return ok(Void);
}
