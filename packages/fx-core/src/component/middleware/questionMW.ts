// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HookContext, Middleware, NextFunction } from "@feathersjs/hooks/lib";
import {
  err,
  FxError,
  Inputs,
  MaybePromise,
  QTreeNode,
  Result,
  traverse,
} from "@microsoft/teamsfx-api";
import { TOOLS } from "../../core/globalVars";

export function QuestionMW(
  question: (inputs: Inputs) => MaybePromise<Result<QTreeNode | undefined, FxError>>
): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    const inputs = ctx.arguments[0] as Inputs;
    const getQuestionRes = await question(inputs);
    if (getQuestionRes.isErr()) throw getQuestionRes.error;
    const node = getQuestionRes.value;
    if (node) {
      const askQuestionRes = await traverse(node, inputs, TOOLS.ui, TOOLS.telemetryReporter);
      if (askQuestionRes.isErr()) {
        ctx.result = err(askQuestionRes.error);
        return;
      }
    }
    await next();
  };
}
