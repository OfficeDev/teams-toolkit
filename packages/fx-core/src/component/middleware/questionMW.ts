// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HookContext, Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { Inputs, err } from "@microsoft/teamsfx-api";
import { TOOLS } from "../../common/globalVars";
import { QuestionNodes, questionNodes } from "../../question";
import { traverse } from "../../ui/visitor";

export function QuestionMW(key: keyof QuestionNodes, fromAction = false): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    const inputs = ctx.arguments[0] as Inputs;
    if (fromAction) {
      inputs.outputEnvVarNames = ctx.arguments[2];
    }
    const node = questionNodes[key]();
    const askQuestionRes = await traverse(node, inputs, TOOLS.ui, TOOLS.telemetryReporter);
    if (askQuestionRes.isErr()) {
      if (fromAction) {
        ctx.result = {
          result: err(askQuestionRes.error),
          summaries: [],
        };
      } else {
        ctx.result = err(askQuestionRes.error);
      }
      return;
    }
    await next();
  };
}
